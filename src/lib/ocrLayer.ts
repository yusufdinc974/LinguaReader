// Invisible, selectable text for recognised (OCR) lines, laid over a page
// image the same way the PDF text layer is: one transparent span per word
// (per character for Chinese/Japanese), placed where the recogniser saw it.
// Vertical columns use vertical writing so a drag selects top to bottom.

import type { OcrPage } from '../../electron/ocr/types';
import type { Highlighter } from './highlight';
import { measure } from './textLayer';

const FONT = 'sans-serif';
/** Characters that each get their own span: no spaces between words in these scripts. */
const SINGLE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆]/u;
const SPACE = /\s/u;

interface Token {
    /** Code point range */
    a: number;
    b: number;
    space: boolean;
}

function tokens(cps: string[]): Token[] {
    const out: Token[] = [];
    let i = 0;
    while (i < cps.length) {
        const sp = SPACE.test(cps[i]);
        if (!sp && SINGLE.test(cps[i])) {
            out.push({ a: i, b: i + 1, space: false });
            i++;
            continue;
        }
        let j = i + 1;
        while (j < cps.length && SPACE.test(cps[j]) === sp && (sp || !SINGLE.test(cps[j]))) j++;
        out.push({ a: i, b: j, space: sp });
        i = j;
    }
    return out;
}

export function renderOcrLayer(container: HTMLElement, page: OcrPage, width: number, highlighter: Highlighter) {
    container.classList.add('ocr-layer');
    const k = width / page.width;
    const frag = document.createDocumentFragment();

    page.lines.forEach((line, n) => {
        // Line ends: a selection across lines keeps a break (joined by cleanSelection)
        if (n > 0) frag.appendChild(document.createElement('br'));

        const text = line.text;
        const cps = Array.from(text);
        // UTF-16 offset of each code point, for the highlighter
        const off: number[] = [0];
        for (const cp of cps) off.push(off[off.length - 1] + cp.length);
        const ranges = highlighter.ranges(text);
        const cuts = line.cuts.length === cps.length + 1 ? line.cuts : cps.map((_, i) => i / cps.length).concat(1);

        const len = line.len * k;
        const thick = line.thick * k;
        const cx = line.cx * k, cy = line.cy * k;
        const fontPx = Math.max(4, thick * 0.78);
        const cos = Math.cos(line.angle), sin = Math.sin(line.angle);
        // Unit vectors along the reading direction and across it
        const u = line.vertical ? { x: -sin, y: cos } : { x: cos, y: sin };
        const v = line.vertical ? { x: -cos, y: -sin } : { x: -sin, y: cos };
        // Start of the reading axis (left end, or top of a column), on the centre line
        const sx = cx - u.x * len / 2, sy = cy - u.y * len / 2;

        for (const t of tokens(cps)) {
            let p0 = cuts[t.a], p1 = cuts[t.b];
            if (line.rtl) [p0, p1] = [1 - p1, 1 - p0];
            const runLen = (p1 - p0) * len;
            if (runLen <= 0.5) continue;
            const span = document.createElement('span');
            highlighter.fillSegment(span, text, off[t.a], off[t.b], ranges);
            span.style.fontFamily = FONT;
            span.style.fontSize = `${fontPx}px`;

            if (line.vertical) {
                // Box: `thick` wide, `runLen` tall; its top-right corner sits on the column's right edge
                const ox = sx + u.x * p0 * len - v.x * thick / 2;
                const oy = sy + u.y * p0 * len - v.y * thick / 2;
                span.style.writingMode = 'vertical-rl';
                span.style.textOrientation = 'upright';
                span.style.width = `${thick}px`;
                span.style.lineHeight = `${thick}px`;
                span.style.left = `${ox - thick}px`;
                span.style.top = `${oy}px`;
                span.style.transformOrigin = '100% 0';
                const natural = (t.b - t.a) * fontPx;
                let tr = Math.abs(line.angle) > 0.01 ? `rotate(${line.angle}rad) ` : '';
                if (natural > 0) tr += `scaleY(${runLen / natural})`;
                span.style.transform = tr;
            } else {
                const ox = sx + u.x * p0 * len - v.x * thick / 2;
                const oy = sy + u.y * p0 * len - v.y * thick / 2;
                span.style.height = `${thick}px`;
                span.style.lineHeight = `${thick}px`;
                span.style.left = `${ox}px`;
                span.style.top = `${oy}px`;
                const natural = measure(cps.slice(t.a, t.b).join(''), FONT, fontPx);
                let tr = Math.abs(line.angle) > 0.002 ? `rotate(${line.angle}rad) ` : '';
                if (natural > 0) tr += `scaleX(${runLen / natural})`;
                span.style.transform = tr;
                if (line.rtl) span.dir = 'rtl';
            }
            frag.appendChild(span);
        }
    });
    container.appendChild(frag);
}
