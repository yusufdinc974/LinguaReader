// Builds highlighted text-layer spans with DOM nodes only (no innerHTML), so
// text coming from a PDF can never be interpreted as markup.

export interface HighlightRange {
    start: number;
    end: number;
    color: string;
}

export interface Highlighter {
    /** Saved words/phrases found in `text`, non-overlapping, sorted. */
    ranges: (text: string) => HighlightRange[];
    /** Fills `span` with text[start, end), wrapping the parts inside `ranges` in <mark>. */
    fillSegment: (span: HTMLElement, text: string, start: number, end: number, ranges: HighlightRange[]) => void;
    /** Fills `span` with all of `text`, highlighted. */
    fill: (span: HTMLElement, text: string) => void;
}

interface Node {
    next: Map<string, Node>;
    /** Set where a saved word ends. */
    color?: string;
    /** Must be a whole word (not inside a longer one). */
    bounded?: boolean;
}

const HEX = /^#[0-9a-f]{3,8}$/i;
const NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
const LETTER = /[\p{L}\p{M}]/u;

/** The character (code point) ending just before `i`. */
function charBefore(text: string, i: number) {
    if (i <= 0) return '';
    const c = text.charCodeAt(i - 1);
    return c >= 0xdc00 && c <= 0xdfff && i >= 2 ? text.slice(i - 2, i) : text[i - 1];
}

function charAt(text: string, i: number) {
    return i >= text.length ? '' : String.fromCodePoint(text.codePointAt(i)!);
}

/**
 * Finds saved words and phrases in text. Thousands of them (with their other
 * forms) are matched in one pass over a trie, longest match first.
 */
export function createHighlighter(wordColors: Record<string, string>): Highlighter {
    const root: Node = { next: new Map() };
    let count = 0;
    for (const [phrase, c] of Object.entries(wordColors)) {
        const key = phrase.toLowerCase();
        if (!key || key.length !== phrase.length) continue;
        let n = root;
        for (const ch of key) {
            let m = n.next.get(ch);
            if (!m) n.next.set(ch, (m = { next: new Map() }));
            n = m;
        }
        n.color = HEX.test(c) ? c : '#eab308';
        // Chinese and Japanese have no spaces: a saved word matches inside any run of text.
        n.bounded = !NO_SPACES.test(key);
        count++;
    }

    const ranges = (text: string): HighlightRange[] => {
        if (count === 0) return [];
        const lower = text.toLowerCase();
        // toLowerCase can change length (e.g. "İ"); offsets would no longer line up.
        if (lower.length !== text.length) return [];
        const found: HighlightRange[] = [];
        let i = 0;
        while (i < lower.length) {
            const atWordStart = !LETTER.test(charBefore(lower, i));
            let n: Node | undefined = root;
            let j = i;
            let best: { end: number; color: string } | null = null;
            while (n && j < lower.length) {
                const ch = charAt(lower, j);
                n = n.next.get(ch);
                if (!n) break;
                j += ch.length;
                if (n.color && (!n.bounded || (atWordStart && !LETTER.test(charAt(lower, j))))) best = { end: j, color: n.color };
            }
            if (best) {
                found.push({ start: i, end: best.end, color: best.color });
                i = best.end;
            } else i += charAt(lower, i).length || 1;
        }
        return found;
    };

    const fillSegment: Highlighter['fillSegment'] = (span, text, start, end, rs) => {
        let cursor = start;
        for (const r of rs) {
            const s = Math.max(r.start, start);
            const e = Math.min(r.end, end);
            if (e <= s) continue;
            if (s > cursor) span.appendChild(document.createTextNode(text.slice(cursor, s)));
            const mark = document.createElement('mark');
            mark.textContent = text.slice(s, e);
            mark.style.background = `${r.color}55`;
            span.appendChild(mark);
            cursor = e;
        }
        if (cursor < end) span.appendChild(document.createTextNode(text.slice(cursor, end)));
    };

    return {
        ranges,
        fillSegment,
        fill(span, text) {
            fillSegment(span, text, 0, text.length, ranges(text));
        },
    };
}
