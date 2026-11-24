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

interface Matcher {
    regex: RegExp;
    color: string;
}

const HEX = /^#[0-9a-f]{3,8}$/i;
const NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

export function createHighlighter(wordColors: Record<string, string>): Highlighter {
    // Longest first so phrases win over the single words inside them.
    const matchers: Matcher[] = Object.keys(wordColors)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .map(phrase => {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const color = HEX.test(wordColors[phrase]) ? wordColors[phrase] : '#eab308';
            // Chinese and Japanese have no spaces: a saved word matches inside any run of text.
            const bounded = !NO_SPACES.test(phrase);
            return { regex: new RegExp(bounded ? `(?<![\\p{L}])${escaped}(?![\\p{L}])` : escaped, 'giu'), color };
        });

    const ranges = (text: string): HighlightRange[] => {
        if (matchers.length === 0) return [];
        const lower = text.toLowerCase();
        // toLowerCase can change length (e.g. "İ"); offsets would no longer line up.
        if (lower.length !== text.length) return [];
        const found: HighlightRange[] = [];
        for (const { regex, color } of matchers) {
            regex.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = regex.exec(lower)) !== null) {
                if (m[0].length === 0) {
                    regex.lastIndex++;
                    continue;
                }
                const start = m.index;
                const end = start + m[0].length;
                // Skip anything overlapping a longer match already taken.
                if (!found.some(r => start < r.end && end > r.start)) found.push({ start, end, color });
            }
        }
        return found.sort((a, b) => a.start - b.start);
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
