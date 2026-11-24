// Invisible, selectable text laid over the rendered PDF canvas.
//
// Three strategies, kept side by side so they can be benchmarked
// (tools/textlayer-bench.html):
//  - 'legacy': one span per text item, Sans-serif, stretched with scaleX.
//  - 'pdfjs' : pdf.js's own TextLayer (better ascent/font, still one
//              stretched span per item).
//  - 'glyph' : one span per word, placed from the PDF font's real glyph
//              widths, with justification space put into the spaces.
// The reader uses 'glyph'.

import { pdfjsLib } from './pdf';
import type { Highlighter } from './highlight';

type PDFPage = pdfjsLib.PDFPageProxy;
type PageViewport = ReturnType<PDFPage['getViewport']>;

export type TextLayerStrategy = 'legacy' | 'pdfjs' | 'glyph';

interface TextItem {
    str: string;
    dir: string;
    transform: number[];
    width: number;
    height: number;
    fontName: string;
    hasEOL: boolean;
}

interface Style {
    fontFamily: string;
    ascent: number;
    descent: number;
    vertical: boolean;
}

export interface RenderTextLayerOptions {
    page: PDFPage;
    viewport: PageViewport;
    container: HTMLDivElement;
    highlighter: Highlighter;
    strategy?: TextLayerStrategy;
    isCancelled?: () => boolean;
}

/** Renders the PDF's own text; resolves to how many non-space characters the page has. */
export async function renderTextLayer(opts: RenderTextLayerOptions): Promise<number> {
    const { page, viewport, container, strategy = 'glyph' } = opts;
    container.replaceChildren();
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;

    const content = await page.getTextContent();
    if (opts.isCancelled?.()) return 0;
    let chars = 0;
    for (const item of content.items as TextItem[]) chars += (item.str ?? '').replace(/\s+/g, '').length;

    if (strategy === 'pdfjs') await renderPdfjs(opts, content);
    else if (strategy === 'legacy') renderLegacy(opts, content.items as TextItem[]);
    else renderGlyph(opts, content.items as TextItem[], content.styles as Record<string, Style>);
    return chars;
}

// ---------------------------------------------------------------- legacy
function renderLegacy({ viewport, container, highlighter }: RenderTextLayerOptions, items: TextItem[]) {
    const scale = viewport.scale;
    for (const item of items) {
        if (!item.str) continue;
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
        const span = document.createElement('span');
        span.style.left = `${tx[4]}px`;
        span.style.top = `${tx[5] - fontSize + fontSize * 0.2}px`;
        span.style.fontSize = `${fontSize}px`;
        span.style.fontFamily = 'sans-serif';
        span.style.transformOrigin = 'left top';
        highlighter.fill(span, item.str);
        container.appendChild(span);
        if (item.width) {
            const target = item.width * scale;
            const actual = span.offsetWidth;
            if (actual > 0 && Math.abs(actual - target) > 1) span.style.transform = `scaleX(${target / actual})`;
        }
    }
}

// ---------------------------------------------------------------- pdf.js
async function renderPdfjs({ viewport, container, highlighter }: RenderTextLayerOptions, content: Awaited<ReturnType<PDFPage['getTextContent']>>) {
    container.classList.add('textLayer');
    container.style.setProperty('--scale-factor', String(viewport.scale));
    const layer = new pdfjsLib.TextLayer({ textContentSource: content, container, viewport });
    await layer.render();
    const strs = layer.textContentItemsStr;
    layer.textDivs.forEach((div, i) => {
        const text = strs[i] ?? div.textContent ?? '';
        if (!text) return;
        const rs = highlighter.ranges(text);
        if (rs.length === 0) return;
        div.replaceChildren();
        highlighter.fillSegment(div, text, 0, text.length, rs);
    });
}

// ---------------------------------------------------------------- glyph
interface FontInfo {
    widths: Record<number, number> | null;
    scale: number; // fontMatrix[0]
    defaultWidth: number;
    inverse: Map<string, number>; // unicode → char code
    maxKey: number;
}

const fontCache = new WeakMap<object, FontInfo | null>();

function fontInfo(page: PDFPage, fontName: string): FontInfo | null {
    let font: any;
    try {
        if (!page.commonObjs.has(fontName)) return null;
        font = page.commonObjs.get(fontName);
    } catch {
        return null;
    }
    if (!font || typeof font !== 'object') return null;
    if (fontCache.has(font)) return fontCache.get(font)!;

    let info: FontInfo | null = null;
    const widths = font.widths as Record<number, number> | undefined;
    const fm = font.fontMatrix as number[] | undefined;
    const tu = font.toUnicode as any;
    if (widths && fm && !font.isType3Font && !font.vertical && tu) {
        const inverse = new Map<string, number>();
        let maxKey = 1;
        if (Array.isArray(tu._map)) {
            tu._map.forEach((u: string | undefined, code: number) => {
                if (typeof u !== 'string' || !u) return;
                if (!inverse.has(u)) inverse.set(u, code);
                maxKey = Math.max(maxKey, u.length);
            });
        } else if (typeof tu.firstChar === 'number') {
            for (let c = tu.firstChar; c <= tu.lastChar; c++) inverse.set(String.fromCharCode(c), c);
        }
        if (inverse.size > 0) {
            info = { widths, scale: fm[0], defaultWidth: font.defaultWidth || 0, inverse, maxKey: Math.min(maxKey, 4) };
        }
    }
    fontCache.set(font, info);
    return info;
}

let measureCtx: CanvasRenderingContext2D | null = null;
export function measure(text: string, fontFamily: string, sizePx: number) {
    measureCtx ??= document.createElement('canvas').getContext('2d');
    if (!measureCtx) return text.length * sizePx * 0.5;
    measureCtx.font = `${sizePx}px ${fontFamily}`;
    return measureCtx.measureText(text).width;
}

const isSpace = (ch: string) => ch === ' ' || ch === ' ' || ch === '\t';

/**
 * Advance of each character of `str` in px, from the font's own widths.
 * Characters the font map can't explain get NaN (filled in by the caller).
 */
function glyphAdvances(str: string, info: FontInfo, pxPerUnit: number): number[] {
    const out = new Array<number>(str.length).fill(NaN);
    let i = 0;
    while (i < str.length) {
        let matched = 0;
        let code = -1;
        for (let len = Math.min(info.maxKey, str.length - i); len >= 1; len--) {
            const c = info.inverse.get(str.slice(i, i + len));
            if (c !== undefined) {
                matched = len;
                code = c;
                break;
            }
        }
        if (matched === 0) {
            i++;
            continue;
        }
        const w = info.widths![code] ?? info.defaultWidth;
        const adv = (w || 0) * info.scale * pxPerUnit;
        // A ligature glyph ("ﬁ" → "fi") covers several characters: split evenly
        for (let k = 0; k < matched; k++) out[i + k] = adv / matched;
        i += matched;
    }
    return out;
}

function renderGlyph({ page, viewport, container, highlighter }: RenderTextLayerOptions, items: TextItem[], styles: Record<string, Style>) {
    container.classList.add('glyph-layer');
    const frag = document.createDocumentFragment();

    for (const item of items) {
        const str = item.str;
        if (!str) {
            if (item.hasEOL) frag.appendChild(document.createElement('br'));
            continue;
        }
        const style = styles[item.fontName] ?? { fontFamily: 'sans-serif', ascent: 0.8, descent: -0.2, vertical: false };
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const angle = Math.atan2(tx[1], tx[0]);
        const fontHeight = Math.hypot(tx[2], tx[3]);
        const ascent = style.ascent > 0 && style.ascent < 1.5 ? style.ascent : 0.8;
        const descent = style.descent < 0 && style.descent > -1 ? style.descent : -0.2;
        const boxHeight = fontHeight * (ascent - descent);
        const fontFamily = style.fontFamily || 'sans-serif';
        const ranges = highlighter.ranges(str);

        // Rotated or vertical text: one stretched span, like pdf.js.
        if (Math.abs(angle) > 1e-3 || style.vertical) {
            const span = makeSpan(fontFamily, fontHeight, boxHeight);
            span.style.left = `${tx[4] + fontHeight * ascent * Math.sin(angle)}px`;
            span.style.top = `${tx[5] - fontHeight * ascent * Math.cos(angle)}px`;
            highlighter.fillSegment(span, str, 0, str.length, ranges);
            const natural = measure(str, fontFamily, fontHeight);
            const target = (style.vertical ? item.height : item.width) * viewport.scale;
            let t = `rotate(${angle}rad)`;
            if (natural > 0 && target > 0) t += ` scaleX(${target / natural})`;
            span.style.transform = t;
            frag.appendChild(span);
            if (item.hasEOL) frag.appendChild(document.createElement('br'));
            continue;
        }

        const target = item.width * viewport.scale;
        const left0 = tx[4];
        const top = tx[5] - fontHeight * ascent;

        // 1. Natural advance per character: real glyph widths, else fallback font
        const info = fontInfo(page, item.fontName);
        const adv = info ? glyphAdvances(str, info, Math.abs(tx[0])) : new Array<number>(str.length).fill(NaN);
        for (let i = 0; i < str.length; i++) {
            if (Number.isNaN(adv[i])) adv[i] = isSpace(str[i]) ? NaN : measure(str[i], fontFamily, fontHeight);
        }
        // 2. Spaces the font can't explain (inserted by pdf.js for gaps) start at 0
        const spaceIdx: number[] = [];
        for (let i = 0; i < str.length; i++) {
            if (isSpace(str[i])) {
                spaceIdx.push(i);
                if (Number.isNaN(adv[i])) adv[i] = 0;
            }
        }
        // 3. Put the difference to the real item width where it belongs:
        //    extra width (justification, word spacing) goes into spaces;
        //    anything else is spread evenly over the glyphs.
        const natural = adv.reduce((a, b) => a + b, 0);
        let extra = target - natural;
        if (target > 0 && natural > 0) {
            if (extra > 0 && spaceIdx.length > 0) {
                const per = extra / spaceIdx.length;
                for (const i of spaceIdx) adv[i] += per;
                extra = 0;
            }
            if (Math.abs(extra) > 0.01) {
                const k = target / adv.reduce((a, b) => a + b, 0);
                for (let i = 0; i < adv.length; i++) adv[i] *= k;
            }
        }

        // 4. One span per run of word / space characters, positioned exactly
        let x = left0;
        let i = 0;
        while (i < str.length) {
            const sp = isSpace(str[i]);
            let j = i;
            let w = 0;
            while (j < str.length && isSpace(str[j]) === sp) w += adv[j++];
            const span = makeSpan(fontFamily, fontHeight, boxHeight);
            span.style.left = `${x}px`;
            span.style.top = `${top}px`;
            highlighter.fillSegment(span, str, i, j, ranges);
            const nat = measure(str.slice(i, j), fontFamily, fontHeight);
            if (nat > 0 && w > 0) span.style.transform = `scaleX(${w / nat})`;
            if (str.slice(i, j).length && w > 0) frag.appendChild(span);
            x += w;
            i = j;
        }
        if (item.hasEOL) frag.appendChild(document.createElement('br'));
    }
    container.appendChild(frag);
}

function makeSpan(fontFamily: string, fontPx: number, boxHeight: number) {
    const span = document.createElement('span');
    span.style.fontFamily = fontFamily;
    span.style.fontSize = `${fontPx}px`;
    span.style.height = `${boxHeight}px`;
    span.style.lineHeight = `${boxHeight}px`;
    return span;
}
