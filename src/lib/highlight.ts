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

interface Entry {
    color: string;
    /** Must be a whole word (not inside a longer one). */
    bounded: boolean;
}

const HEX = /^#[0-9a-f]{3,8}$/i;
const NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
const LETTER = /[\p{L}\p{M}]/u;
/** Korean particles and copulas written onto the noun before them ("친구와"), longest first. */
const PARTICLES = ['으로부터', '에게서', '한테서', '으로서', '으로써', '이에요', '입니다', '에서', '에게', '한테', '까지', '부터', '처럼', '보다', '으로', '이랑', '하고', '께서', '이다', '예요', '은', '는', '이', '가', '을', '를', '에', '의', '도', '와', '과', '로', '만', '랑', '께', '요', '야'];
const HANGUL = /\p{Script=Hangul}/u;
/** Longest run of Chinese or Japanese text tried as one saved word. */
const MAX_RUN = 16;

/** The character (code point) ending just before `i`. */
function charBefore(text: string, i: number) {
    if (i <= 0) return '';
    const c = text.charCodeAt(i - 1);
    return c >= 0xdc00 && c <= 0xdfff && i >= 2 ? text.slice(i - 2, i) : text[i - 1];
}

function charAt(text: string, i: number) {
    return i >= text.length ? '' : String.fromCodePoint(text.codePointAt(i)!);
}

/** A Korean particle at `i` that ends the word. */
function particleAt(text: string, i: number) {
    return PARTICLES.some(p => text.startsWith(p, i) && !LETTER.test(charAt(text, i + p.length)));
}

/**
 * Finds saved words and phrases in text. Tens of thousands of them (with
 * their other forms) are looked up in a map at each word start, longest
 * match first, instead of one regular expression per word.
 */
export function createHighlighter(wordColors: Record<string, string>): Highlighter {
    const words = new Map<string, Entry>();
    let maxLen = 0;
    for (const [phrase, c] of Object.entries(wordColors)) {
        const key = phrase.toLowerCase();
        if (!key || key.length !== phrase.length) continue;
        // Chinese and Japanese have no spaces: a saved word matches inside any run of text.
        words.set(key, { color: HEX.test(c) ? c : '#eab308', bounded: !NO_SPACES.test(key) });
        maxLen = Math.max(maxLen, key.length);
    }

    const ranges = (text: string): HighlightRange[] => {
        if (words.size === 0) return [];
        const lower = text.toLowerCase();
        // toLowerCase can change length (e.g. "İ"); offsets would no longer line up.
        if (lower.length !== text.length) return [];
        const found: HighlightRange[] = [];
        let i = 0;
        while (i < lower.length) {
            const first = charAt(lower, i);
            let best: { end: number; color: string } | null = null;
            if (LETTER.test(first)) {
                const atWordStart = !LETTER.test(charBefore(lower, i));
                const cjk = NO_SPACES.test(first);
                const limit = Math.min(lower.length, i + maxLen);
                for (let j = i + first.length; j <= limit;) {
                    const next = charAt(lower, j);
                    const wordEnd = !LETTER.test(next);
                    // Where a bounded word may end: at the end of a word, or before a Korean particle
                    const boundedEnd = atWordStart && (wordEnd || (HANGUL.test(charBefore(lower, j)) && particleAt(lower, j)));
                    if (boundedEnd || (cjk && j - i <= MAX_RUN * 2)) {
                        const e = words.get(lower.slice(i, j));
                        if (e && (e.bounded ? boundedEnd : true)) best = { end: j, color: e.color };
                    }
                    if (!next) break;
                    // Past a word's end only phrases ("ice cream") can still match
                    j += next.length;
                }
            }
            if (best) {
                found.push({ start: i, end: best.end, color: best.color });
                i = best.end;
            } else i += first.length || 1;
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
