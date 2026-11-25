import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectGlyphWidths, glyphAdvances } from '../src/lib/glyphWidths.ts';

const OPS = { save: 10, restore: 11, setFont: 37, showText: 44, showSpacedText: 45 };
const g = (unicode: string, width: number) => ({ unicode, width, fontChar: '\u0001', isSpace: unicode === ' ' });

test('collects widths per font from drawn glyphs, ignoring spacing numbers', () => {
    const fn = [OPS.setFont, OPS.showText, OPS.save, OPS.setFont, OPS.showText, OPS.restore, OPS.showText];
    const args = [
        ['g_d0_f1', 12],
        [[g('b', 556), -84, g('r', 333), g(' ', 278)]],
        null,
        ['g_d0_f2', 12],
        [[g('b', 600)]],
        null,
        [[g('u', 556)]],
    ];
    const fonts = collectGlyphWidths(fn, args, OPS);
    assert.deepEqual([...fonts.get('g_d0_f1')!.widths], [['b', 556], ['r', 333], [' ', 278], ['u', 556]]);
    assert.deepEqual([...fonts.get('g_d0_f2')!.widths], [['b', 600]]);
});

test('ligatures match both their raw and NFKC-normalized text', () => {
    const fonts = collectGlyphWidths([OPS.setFont, OPS.showText], [['f', 10], [[g('ﬁ', 550), g('x', 500)]]], OPS);
    const font = fonts.get('f')!;
    assert.deepEqual(glyphAdvances('fix', font), [275, 275, 500]);
    assert.deepEqual(glyphAdvances('ﬁx', font), [550, 500]);
});

test('unknown characters are NaN', () => {
    const fonts = collectGlyphWidths([OPS.setFont, OPS.showText], [['f', 10], [[g('a', 500)]]], OPS);
    const adv = glyphAdvances('a?a', fonts.get('f')!);
    assert.equal(adv[0], 500);
    assert.ok(Number.isNaN(adv[1]));
    assert.equal(adv[2], 500);
});
