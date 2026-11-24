// Reading order for recognised lines: drop furigana, group lines into blocks
// (speech bubbles, paragraphs) and order them as a reader would.

import type { OcrLine } from './types.ts';

interface Rect {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

/** Axis-aligned bounds of a line. */
export function bounds(l: OcrLine): Rect {
    const c = Math.cos(l.angle), s = Math.sin(l.angle);
    // Reading axis: along `angle` (rotated a further 90° for columns)
    const ux = l.vertical ? -s : c, uy = l.vertical ? c : s;
    const vx = -uy, vy = ux;
    const hx = Math.abs(ux * l.len / 2) + Math.abs(vx * l.thick / 2);
    const hy = Math.abs(uy * l.len / 2) + Math.abs(vy * l.thick / 2);
    return { x0: l.cx - hx, y0: l.cy - hy, x1: l.cx + hx, y1: l.cy + hy };
}

const KANA = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・]+$/u;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/**
 * Furigana: small kana printed beside kanji as a reading aid. To the right of
 * a column in vertical text, above the line in horizontal text.
 */
function isFurigana(l: OcrLine, b: Rect, all: OcrLine[], rects: Rect[]): boolean {
    if (!KANA.test(l.text)) return false;
    return all.some((m, j) => {
        if (m === l || m.vertical !== l.vertical || m.thick < l.thick * 1.6 || !CJK.test(m.text)) return false;
        const r = rects[j];
        if (l.vertical) {
            const near = b.x0 >= r.x1 - m.thick * 0.35 && b.x0 <= r.x1 + m.thick * 0.6;
            return near && overlap(b.y0, b.y1, r.y0, r.y1) >= (b.y1 - b.y0) * 0.6;
        }
        const near = b.y1 <= r.y0 + m.thick * 0.35 && b.y1 >= r.y0 - m.thick * 0.6;
        return near && overlap(b.x0, b.x1, r.x0, r.x1) >= (b.x1 - b.x0) * 0.6;
    });
}

export function arrangeLines(input: OcrLine[]): OcrLine[] {
    const rectsAll = input.map(bounds);
    const keep = input.map((l, i) => !isFurigana(l, rectsAll[i], input, rectsAll));
    const lines = input.filter((_, i) => keep[i]);
    const rects = rectsAll.filter((_, i) => keep[i]);
    const n = lines.length;
    if (n === 0) return [];

    // Union lines that belong to the same block
    const parent = lines.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const a = lines[i], b = lines[j];
            if (a.vertical !== b.vertical) continue;
            const ra = rects[i], rb = rects[j];
            const t = Math.max(a.thick, b.thick);
            if (Math.min(a.thick, b.thick) < t / 1.8) continue; // a heading next to body text
            let joined: boolean;
            if (a.vertical) {
                const gap = Math.max(ra.x0, rb.x0) - Math.min(ra.x1, rb.x1);
                joined = gap <= t * 0.9 && overlap(ra.y0, ra.y1, rb.y0, rb.y1) > 0;
            } else {
                const gap = Math.max(ra.y0, rb.y0) - Math.min(ra.y1, rb.y1);
                joined = gap <= t * 0.8 && overlap(ra.x0, ra.x1, rb.x0, rb.x1) > Math.min(ra.x1 - ra.x0, rb.x1 - rb.x0) * 0.3;
            }
            if (joined) parent[find(i)] = find(j);
        }
    }

    const groups = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
        const r = find(i);
        if (!groups.has(r)) groups.set(r, []);
        groups.get(r)!.push(i);
    }

    interface Block { ids: number[]; r: Rect; vertical: boolean }
    const blocks: Block[] = [...groups.values()].map(ids => {
        const r = ids.reduce<Rect>((acc, i) => ({
            x0: Math.min(acc.x0, rects[i].x0), y0: Math.min(acc.y0, rects[i].y0),
            x1: Math.max(acc.x1, rects[i].x1), y1: Math.max(acc.y1, rects[i].y1),
        }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
        const vertical = lines[ids[0]].vertical;
        // Inside a block: columns right → left, lines top → bottom
        ids.sort((a, b) => vertical ? rects[b].x1 - rects[a].x1 : rects[a].y0 - rects[b].y0);
        return { ids, r, vertical };
    });

    // Between blocks: rows top → bottom; within a row, right → left when the
    // page is mostly vertical text (manga), else left → right.
    const verticalPage = blocks.filter(b => b.vertical).length * 2 > blocks.length;
    blocks.sort((a, b) => {
        const sameRow = overlap(a.r.y0, a.r.y1, b.r.y0, b.r.y1) > Math.min(a.r.y1 - a.r.y0, b.r.y1 - b.r.y0) * 0.5;
        if (sameRow) return verticalPage ? b.r.x1 - a.r.x1 : a.r.x0 - b.r.x0;
        return a.r.y0 - b.r.y0;
    });

    const out: OcrLine[] = [];
    blocks.forEach((b, bi) => b.ids.forEach(i => out.push({ ...lines[i], block: bi })));
    return out;
}
