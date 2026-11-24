// Builds highlighted text-layer spans with DOM nodes only (no innerHTML), so
// text coming from a PDF can never be interpreted as markup.

export interface Highlighter {
    /** Fills `span` with `text`, wrapping saved words/phrases in <mark>. */
    fill: (span: HTMLElement, text: string) => void;
}

interface Matcher {
    regex: RegExp;
    color: string;
}

const HEX = /^#[0-9a-f]{3,8}$/i;

export function createHighlighter(wordColors: Record<string, string>): Highlighter {
    // Longest first so phrases win over the single words inside them.
    const matchers: Matcher[] = Object.keys(wordColors)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .map(phrase => {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const color = HEX.test(wordColors[phrase]) ? wordColors[phrase] : '#eab308';
            return { regex: new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu'), color };
        });

    return {
        fill(span, text) {
            if (matchers.length === 0) {
                span.textContent = text;
                return;
            }

            const lower = text.toLowerCase();
            const ranges: { start: number; end: number; color: string }[] = [];

            for (const { regex, color } of matchers) {
                regex.lastIndex = 0;
                let m: RegExpExecArray | null;
                while ((m = regex.exec(lower)) !== null) {
                    const start = m.index;
                    const end = start + m[0].length;
                    if (m[0].length === 0) {
                        regex.lastIndex++;
                        continue;
                    }
                    // Skip anything overlapping a longer match already taken.
                    if (!ranges.some(r => start < r.end && end > r.start)) {
                        ranges.push({ start, end, color });
                    }
                }
            }

            if (ranges.length === 0) {
                span.textContent = text;
                return;
            }

            ranges.sort((a, b) => a.start - b.start);
            let cursor = 0;
            for (const r of ranges) {
                if (r.start > cursor) span.appendChild(document.createTextNode(text.slice(cursor, r.start)));
                const mark = document.createElement('mark');
                mark.textContent = text.slice(r.start, r.end);
                mark.style.background = `${r.color}55`;
                span.appendChild(mark);
                cursor = r.end;
            }
            if (cursor < text.length) span.appendChild(document.createTextNode(text.slice(cursor)));
        },
    };
}
