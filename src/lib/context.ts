// The sentence a word was selected in, saved with the word and shown in
// reviews. The text-only part (sentenceAround, splitAround) has no DOM and is
// unit tested; selectionContext reads it from the reader's text layers.

/** Longest context kept; longer sentences are cut around the word. */
export const MAX_CONTEXT = 300;

const CJK = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー々';
const CJK_CHAR = new RegExp(`[${CJK}]`, 'u');
const LETTER = /\p{L}/u;
/** Marks the end of a paragraph (block element) in collected text: never crossed. */
export const PARAGRAPH = ' ';

/**
 * Joins the lines of `text` the way they read: "exam-\nple" → "example",
 * no space between Chinese/Japanese characters, any other whitespace run →
 * one space. Returns the new text and, for each old offset, the new one.
 */
function joinLines(text: string) {
    let out = '';
    const map = new Array<number>(text.length + 1);
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (/\s/u.test(ch) && ch !== PARAGRAPH) {
            let j = i;
            while (j < text.length && /\s/u.test(text[j]) && text[j] !== PARAGRAPH) j++;
            const run = text.slice(i, j);
            const prev = out[out.length - 1] ?? '';
            const next = text[j] ?? '';
            // A hyphen at a line end between letters splits one word
            const hyphenated = run.includes('\n') && prev === '-' && LETTER.test(out[out.length - 2] ?? '') && LETTER.test(next);
            const glue = hyphenated || (run.includes('\n') && CJK_CHAR.test(prev) && CJK_CHAR.test(next));
            if (hyphenated) out = out.slice(0, -1);
            for (let k = i; k < j; k++) map[k] = out.length;
            if (!glue && out.length > 0 && prev !== PARAGRAPH && next !== PARAGRAPH && j < text.length) out += ' ';
            i = j;
            continue;
        }
        map[i] = out.length;
        out += ch;
        i++;
    }
    map[text.length] = out.length;
    return { text: out, map };
}

type Segmenter = { segment: (s: string) => Iterable<{ segment: string; index: number }> };

function sentences(text: string): { start: number; end: number }[] {
    const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => Segmenter }).Segmenter;
    if (Seg) {
        const out: { start: number; end: number }[] = [];
        for (const s of new Seg(undefined, { granularity: 'sentence' }).segment(text)) out.push({ start: s.index, end: s.index + s.segment.length });
        return out;
    }
    // Fallback: split after . ! ? 。！？ followed by space
    const out: { start: number; end: number }[] = [];
    const re = /[.!?。！？]+["'»”’)]*\s+/gu;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        out.push({ start: last, end: m.index + m[0].length });
        last = m.index + m[0].length;
    }
    out.push({ start: last, end: text.length });
    return out;
}

/**
 * The sentence (or sentences) around text[start, end), as one clean line, or
 * '' if there is nothing more than the selection itself.
 */
export function sentenceAround(raw: string, start: number, end: number): string {
    if (!raw || start < 0 || end > raw.length || start >= end) return '';
    const joined = joinLines(raw);
    let text = joined.text;
    let s = joined.map[start];
    let e = joined.map[end];

    // Stay inside the selection's paragraph
    const pStart = text.lastIndexOf(PARAGRAPH, s - 1) + 1;
    let pEnd = text.indexOf(PARAGRAPH, e);
    if (pEnd < 0) pEnd = text.length;
    if (text.slice(s, e).includes(PARAGRAPH)) return '';
    text = text.slice(pStart, pEnd);
    s -= pStart;
    e -= pStart;

    const parts = sentences(text);
    const first = parts.find(p => p.end > s) ?? parts[0];
    const last = [...parts].reverse().find(p => p.start < e) ?? first;
    let a = first.start;
    let b = Math.max(last.end, first.end);

    // Too long: a window around the word, cut at spaces
    if (b - a > MAX_CONTEXT) {
        const room = Math.max(0, MAX_CONTEXT - (e - s));
        let wa = Math.max(a, s - Math.floor(room / 2));
        let wb = Math.min(b, e + (room - (s - wa)));
        wa = Math.max(a, Math.min(wa, wb - MAX_CONTEXT));
        if (wa > a) {
            const sp = text.indexOf(' ', wa);
            if (sp >= 0 && sp < s) wa = sp + 1;
        }
        if (wb < b) {
            const sp = text.lastIndexOf(' ', wb);
            if (sp >= e) wb = sp;
        }
        const out = text.slice(wa, wb).trim();
        return `${wa > a ? '…' : ''}${out}${wb < b ? '…' : ''}`;
    }

    const sentence = text.slice(a, b).trim();
    const word = text.slice(s, e).trim();
    // A heading or a lone word: no context worth keeping
    if (sentence.length <= word.length + 1) return '';
    return sentence;
}

/**
 * Finds `word` in `sentence` (ignoring case), for showing it marked or
 * blanked. Returns [before, match, after], or null if it isn't there.
 */
export function splitAround(sentence: string, word: string): [string, string, string] | null {
    if (!sentence || !word) return null;
    const hay = sentence.toLowerCase();
    const needle = word.trim().toLowerCase();
    if (!needle || hay.length !== sentence.length) {
        const i = sentence.indexOf(word.trim());
        return i < 0 ? null : [sentence.slice(0, i), sentence.slice(i, i + word.trim().length), sentence.slice(i + word.trim().length)];
    }
    const bounded = !CJK_CHAR.test(needle);
    let from = 0;
    while (from <= hay.length) {
        const i = hay.indexOf(needle, from);
        if (i < 0) break;
        const before = hay[i - 1] ?? '';
        const after = hay[i + needle.length] ?? '';
        // Whole words only, so "art" doesn't match inside "start"
        if (!bounded || (!LETTER.test(before) && !LETTER.test(after))) {
            return [sentence.slice(0, i), sentence.slice(i, i + needle.length), sentence.slice(i + needle.length)];
        }
        from = i + 1;
    }
    return null;
}

// ---------------------------------------------------------------- DOM
const BLOCK = new Set(['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DD', 'DT', 'TD', 'TH', 'FIGCAPTION', 'PRE', 'SECTION', 'ARTICLE', 'TR']);

/** Text of a node tree: <br> is a line end, block elements end paragraphs. */
function collect(node: Node, inEpub: boolean): string {
    let out = '';
    const walk = (n: Node) => {
        if (n.nodeType === Node.TEXT_NODE) {
            out += (n as Text).data;
            return;
        }
        if (n.nodeType !== Node.ELEMENT_NODE && n.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
        const el = n as Element;
        if (el.tagName === 'BR') {
            out += '\n';
            return;
        }
        // Ruby readings (furigana) are not part of the sentence
        if (el.tagName === 'RT' || el.tagName === 'RP') return;
        for (const c of Array.from(n.childNodes)) walk(c);
        if (inEpub && el.tagName && BLOCK.has(el.tagName)) out += PARAGRAPH;
    };
    walk(node);
    return out;
}

/** The sentence the current selection sits in, read from the page it's on. */
export function selectionContext(range: Range): string {
    try {
        const common = range.commonAncestorContainer;
        const el = common.nodeType === Node.ELEMENT_NODE ? (common as Element) : common.parentElement;
        if (!el) return '';
        const epub = el.closest('.epub-chapter');
        const root = epub ? el.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, dd, dt, td, th, figcaption, pre') ?? epub : el.closest('.pdf-text-layer');
        if (!root) return '';
        const before = document.createRange();
        before.selectNodeContents(root);
        before.setEnd(range.startContainer, range.startOffset);
        const after = document.createRange();
        after.selectNodeContents(root);
        after.setStart(range.endContainer, range.endOffset);
        // cloneContents closes each block the boundary sits in, which adds a
        // paragraph end that isn't in the book: take those off again.
        const strip = (s: string, n: number) => {
            while (n-- > 0 && s.endsWith(PARAGRAPH)) s = s.slice(0, -1);
            return s;
        };
        const partial = (node: Node, stop: Node) => {
            if (!epub) return 0;
            let n = 0;
            for (let p: Node | null = node; p && p !== stop; p = p.parentNode) if (p.nodeType === Node.ELEMENT_NODE && BLOCK.has((p as Element).tagName)) n++;
            return n;
        };
        const left = strip(collect(before.cloneContents(), !!epub), partial(range.startContainer, root));
        const mid = strip(collect(range.cloneContents(), !!epub), partial(range.endContainer, common));
        const right = collect(after.cloneContents(), !!epub);
        return sentenceAround(left + mid + right, left.length, left.length + mid.length);
    } catch {
        return '';
    }
}
