// Real glyph advances per font, read from a page's operator list.
//
// pdf.js 4 put each font's toUnicode map on the main thread (with
// fontExtraProperties), so the text layer could turn a character back into
// its char code and look up the width. pdf.js 6 no longer exports toUnicode,
// but every glyph drawn by showText still carries its unicode and width, so
// we build the same unicode → width table from what the page actually draws.
//
// No pdf.js import here so it can be unit tested in Node.

export interface GlyphFont {
    /** Unicode string (one glyph's worth, may be a ligature like "fi") → width in glyph units. */
    widths: Map<string, number>;
    /** Longest key in `widths`, capped at 4. */
    maxKey: number;
}

export interface OpCodes {
    save: number;
    restore: number;
    setFont: number;
    showText: number;
    showSpacedText: number;
}

interface DrawnGlyph {
    unicode?: unknown;
    width?: unknown;
}

function add(font: GlyphFont, key: string, width: number) {
    if (!key || font.widths.has(key)) return;
    font.widths.set(key, width);
    if (key.length > font.maxKey) font.maxKey = Math.min(key.length, 4);
}

/** Map of pdf.js font name (the text items' `fontName`) → glyph widths. */
export function collectGlyphWidths(fnArray: ArrayLike<number>, argsArray: ArrayLike<unknown>, ops: OpCodes): Map<string, GlyphFont> {
    const fonts = new Map<string, GlyphFont>();
    const stack: (string | null)[] = [];
    let current: string | null = null;

    for (let i = 0; i < fnArray.length; i++) {
        const fn = fnArray[i];
        if (fn === ops.save) stack.push(current);
        else if (fn === ops.restore) current = stack.length ? stack.pop()! : current;
        else if (fn === ops.setFont) {
            const args = argsArray[i] as unknown[] | null;
            current = typeof args?.[0] === 'string' ? args[0] : null;
        } else if ((fn === ops.showText || fn === ops.showSpacedText) && current) {
            const glyphs = (argsArray[i] as unknown[] | null)?.[0];
            if (!Array.isArray(glyphs)) continue;
            let font = fonts.get(current);
            if (!font) fonts.set(current, (font = { widths: new Map(), maxKey: 1 }));
            for (const g of glyphs as DrawnGlyph[]) {
                // Numbers are spacing adjustments between glyphs, not glyphs
                if (!g || typeof g !== 'object') continue;
                const { unicode, width } = g;
                if (typeof unicode !== 'string' || !unicode || typeof width !== 'number' || !Number.isFinite(width)) continue;
                add(font, unicode, width);
                // getTextContent normalizes text (NFKC: "ﬁ" → "fi"), so look it up both ways
                const norm = unicode.normalize('NFKC');
                if (norm !== unicode) add(font, norm, width);
            }
        }
    }
    return fonts;
}

/**
 * Advance of each character of `str`, in glyph units (multiply by the font
 * matrix scale and font size). Characters the table can't explain get NaN.
 */
export function glyphAdvances(str: string, font: GlyphFont): number[] {
    const out = new Array<number>(str.length).fill(NaN);
    let i = 0;
    while (i < str.length) {
        let matched = 0;
        let w = 0;
        for (let len = Math.min(font.maxKey, str.length - i); len >= 1; len--) {
            const v = font.widths.get(str.slice(i, i + len));
            if (v !== undefined) {
                matched = len;
                w = v;
                break;
            }
        }
        if (matched === 0) {
            i++;
            continue;
        }
        // A ligature glyph ("fi") covers several characters: split evenly
        for (let k = 0; k < matched; k++) out[i + k] = w / matched;
        i += matched;
    }
    return out;
}
