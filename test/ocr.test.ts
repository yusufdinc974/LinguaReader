// Run with: npm test  (Node 22.18+ runs TypeScript directly)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrangeLines } from '../electron/ocr/layout.ts';
import { hull, minAreaRect } from '../electron/ocr/geometry.ts';
import { plausibility } from '../electron/ocr/engine.ts';
import type { OcrLine } from '../electron/ocr/types.ts';

const line = (text: string, cx: number, cy: number, len: number, thick: number, vertical = false): OcrLine => ({
    text, conf: 1, vertical, cx, cy, len, thick, angle: 0, cuts: [], block: 0,
});

test('manga bubbles are read right to left, columns right to left', () => {
    const out = arrangeLines([
        line('まさか', 230, 300, 120, 40, true),
        line('本当に', 180, 300, 120, 40, true),
        line('ちょっと', 650, 280, 160, 40, true),
        line('待って', 600, 280, 120, 40, true),
    ]);
    assert.deepEqual(out.map(l => l.text), ['ちょっと', '待って', 'まさか', '本当に']);
    assert.equal(out[0].block, out[1].block);
    assert.notEqual(out[1].block, out[2].block);
});

test('furigana beside a column is dropped', () => {
    const out = arrangeLines([
        line('警察', 200, 300, 100, 44, true),
        line('けいさつ', 232, 300, 90, 18, true),
    ]);
    assert.deepEqual(out.map(l => l.text), ['警察']);
});

test('small kana that is not next to kanji stays', () => {
    const out = arrangeLines([line('ぎゃっ', 200, 300, 60, 18, true)]);
    assert.equal(out.length, 1);
});

test('horizontal lines of one paragraph form one block, top to bottom', () => {
    const out = arrangeLines([
        line('second line', 300, 140, 500, 30),
        line('first line', 300, 100, 500, 30),
        line('Far away', 300, 600, 300, 30),
    ]);
    assert.deepEqual(out.map(l => l.text), ['first line', 'second line', 'Far away']);
    assert.equal(out[0].block, out[1].block);
    assert.notEqual(out[1].block, out[2].block);
});

test('minAreaRect finds a tilted rectangle', () => {
    // A 100 × 10 bar rotated by ~5°
    const w = 200, h = 100;
    const px: number[] = [];
    const a = (5 * Math.PI) / 180;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const u = (x - 100) * Math.cos(a) + (y - 50) * Math.sin(a);
        const v = -(x - 100) * Math.sin(a) + (y - 50) * Math.cos(a);
        if (Math.abs(u) <= 50 && Math.abs(v) <= 5) px.push(y * w + x);
    }
    const r = minAreaRect(hull(Int32Array.from(px), w));
    assert.ok(Math.abs(r.angle - a) < 0.03, `angle ${r.angle}`);
    assert.ok(Math.abs(r.w - 101) < 3 && Math.abs(r.h - 11) < 3, `size ${r.w}×${r.h}`);
});

test('script plausibility rejects look-alike readings', () => {
    assert.equal(plausibility('Все счастливые семьи', 'cyrillic'), 1);
    // "Bce" is Latin, "cчастливые" mixes Latin c with Cyrillic: neither counts
    assert.equal(plausibility('Bce cчастливые', 'cyrillic'), 0);
    assert.equal(plausibility('It was a bright cold day', 'v6'), 1);
    assert.equal(plausibility('ニャーニャー泣いていた', 'v6'), 1);
    assert.equal(plausibility('ΦpaHuykeHKoIO', 'greek'), 0);
});
