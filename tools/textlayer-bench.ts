// Text-layer accuracy benchmark (dev only).
//
// window.runBench(pdfBase64, truth, strategy, scale) renders page 1 with the
// given strategy and checks, for every ground-truth word, which word a click
// at 15%, 50% and 85% of its width actually lands on, and how far the
// selectable word's edges are from the real ones.
//
// `truth` = [{ text, x, y, w, h }] in PDF points from the page's top-left.
import '../src/index.css';
import { base64ToBytes, openPdf } from '../src/lib/pdf';
import { createHighlighter } from '../src/lib/highlight';
import { renderTextLayer, type TextLayerStrategy } from '../src/lib/textLayer';

interface TruthWord { text: string; x: number; y: number; w: number; h: number }

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const WORD = /[\p{L}\p{N}\p{M}'’\-]/u;

function wordAt(node: Node, offset: number) {
    const text = node.textContent ?? '';
    let s = offset, e = offset;
    while (s > 0 && WORD.test(text[s - 1])) s--;
    while (e < text.length && WORD.test(text[e])) e++;
    // caret may sit just after the word
    if (s === e && offset > 0 && WORD.test(text[offset - 1])) {
        s = offset - 1;
        while (s > 0 && WORD.test(text[s - 1])) s--;
    }
    return { node, s, e, text: text.slice(s, e) };
}

async function runBench(b64: string, truth: TruthWord[], strategy: TextLayerStrategy, scale: number) {
    const host = document.getElementById('host')!;
    host.replaceChildren();
    const doc = await openPdf(base64ToBytes(b64));
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale });

    const wrap = document.createElement('div');
    wrap.style.cssText = `position:relative;width:${viewport.width}px;height:${viewport.height}px;background:#fff`;
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const layer = document.createElement('div');
    layer.className = 'pdf-text-layer';
    wrap.append(canvas, layer);
    host.append(wrap);

    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    const t0 = performance.now();
    await renderTextLayer({ page, viewport, container: layer, highlighter: createHighlighter({}), strategy });
    const layerMs = performance.now() - t0;
    await new Promise(r => requestAnimationFrame(r));

    const base = wrap.getBoundingClientRect();
    const fractions = [0.15, 0.5, 0.85];
    const hits = fractions.map(() => 0);
    const edgeErr: number[] = [];
    const misses: string[] = [];
    let counted = 0;

    for (const t of truth) {
        const want = norm(t.text);
        if (!want) continue;
        counted++;
        const cy = base.top + (t.y + t.h / 2) * scale;
        fractions.forEach((f, k) => {
            const cx = base.left + (t.x + t.w * f) * scale;
            const r = document.caretRangeFromPoint(cx, cy);
            if (!r || !layer.contains(r.startContainer)) {
                if (k === 1 && misses.length < 12) misses.push(`${t.text}→(none)`);
                return;
            }
            const got = wordAt(r.startContainer, r.startOffset);
            if (norm(got.text) === want) {
                hits[k]++;
                if (k === 1) {
                    const range = document.createRange();
                    range.setStart(got.node, got.s);
                    range.setEnd(got.node, got.e);
                    const rects = [...range.getClientRects()];
                    if (rects.length) {
                        const left = Math.min(...rects.map(q => q.left)) - base.left;
                        const right = Math.max(...rects.map(q => q.right)) - base.left;
                        // Compare letter edges only: truth text may include punctuation
                        const lead = t.text.length - t.text.replace(/^[^\p{L}\p{N}]+/u, '').length;
                        const trail = t.text.length - t.text.replace(/[^\p{L}\p{N}]+$/u, '').length;
                        if (lead === 0 && trail === 0) {
                            edgeErr.push(Math.abs(left - t.x * scale), Math.abs(right - (t.x + t.w) * scale));
                        }
                    }
                }
            } else if (k === 1 && misses.length < 12) {
                misses.push(`${t.text}→${got.text || '(gap)'}`);
            }
        });
    }

    // Selecting across a line break: does the text keep a separator?
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    const spans = [...layer.querySelectorAll('span')].filter(s => s.textContent?.trim());
    let crossLine = '';
    for (let i = 0; i < spans.length - 1; i++) {
        const a = spans[i].getBoundingClientRect(), b = spans[i + 1].getBoundingClientRect();
        if (b.top > a.bottom - 1) {
            const r = document.createRange();
            r.setStart(spans[i].firstChild!, 0);
            r.setEnd(spans[i + 1].firstChild!, Math.min(1, spans[i + 1].firstChild!.textContent!.length));
            sel.addRange(r);
            crossLine = JSON.stringify(sel.toString());
            sel.removeAllRanges();
            break;
        }
    }

    edgeErr.sort((a, b) => a - b);
    const pct = (n: number) => +(100 * n / counted).toFixed(1);
    return {
        strategy, scale, words: counted,
        hit15: pct(hits[0]), hit50: pct(hits[1]), hit85: pct(hits[2]),
        edgeMedianPx: +(edgeErr[Math.floor(edgeErr.length / 2)] ?? NaN).toFixed(2),
        edgeP90Px: +(edgeErr[Math.floor(edgeErr.length * 0.9)] ?? NaN).toFixed(2),
        edgeMaxPx: +(edgeErr[edgeErr.length - 1] ?? NaN).toFixed(2),
        spans: layer.querySelectorAll('span').length,
        layerMs: +layerMs.toFixed(1),
        crossLine,
        misses,
    };
}

(window as any).runBench = runBench;
(window as any).benchReady = true;
