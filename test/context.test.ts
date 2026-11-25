// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sentenceAround, splitAround, MAX_CONTEXT, PARAGRAPH } from '../src/lib/context.ts';

const around = (text: string, word: string, nth = 0) => {
    let i = -1;
    for (let k = 0; k <= nth; k++) i = text.indexOf(word, i + 1);
    assert.ok(i >= 0, `${word} not in text`);
    return sentenceAround(text, i, i + word.length);
};

test('picks the sentence the word is in', () => {
    const t = 'Il pleuvait. Les étals du marché étaient vides. Personne ne parlait.';
    assert.equal(around(t, 'étals'), 'Les étals du marché étaient vides.');
});

test('joins PDF lines and hyphenated words', () => {
    const t = 'Le vieux marchand rangeait ses\nmar-\nchandises sous la pluie fine. Puis il partit.';
    assert.equal(around(t, 'rangeait'), 'Le vieux marchand rangeait ses marchandises sous la pluie fine.');
});

test('keeps a selection that spans sentences whole', () => {
    const t = 'One. Two words here. Three more. Four.';
    assert.equal(around(t, 'here. Three'), 'Two words here. Three more.');
});

test('Japanese: no spaces added between lines', () => {
    const t = '雨が降っていた。市場の\n屋台は空だった。誰も話さなかった。';
    assert.equal(around(t, '屋台'), '市場の屋台は空だった。');
});

test('stays inside the paragraph', () => {
    const t = `Chapter One${PARAGRAPH}The rain fell on the empty stalls.`;
    assert.equal(around(t, 'rain'), 'The rain fell on the empty stalls.');
    assert.equal(around(t, 'One'), 'Chapter One');
});

test('a lone word or heading has no context', () => {
    assert.equal(around('Bonjour', 'Bonjour'), '');
    assert.equal(around(`Préface${PARAGRAPH}Texte.`, 'Préface'), '');
});

test('long sentences are cut around the word', () => {
    const words = Array.from({ length: 120 }, (_, i) => `w${i}`);
    words[60] = 'target';
    const t = words.join(' ') + '.';
    const c = around(t, 'target');
    assert.ok(c.length <= MAX_CONTEXT + 2, `too long: ${c.length}`);
    assert.ok(c.startsWith('…') && c.endsWith('…'));
    assert.ok(c.includes(' target '));
});

test('bad offsets give nothing', () => {
    assert.equal(sentenceAround('abc', 2, 1), '');
    assert.equal(sentenceAround('', 0, 0), '');
});

test('splitAround finds whole words, ignoring case', () => {
    assert.deepEqual(splitAround('Start the art class.', 'art'), ['Start the ', 'art', ' class.']);
    assert.deepEqual(splitAround('Les Étals sont vides.', 'étals'), ['Les ', 'Étals', ' sont vides.']);
    assert.equal(splitAround('Nothing here.', 'word'), null);
    assert.deepEqual(splitAround('市場の屋台は空だった。', '屋台'), ['市場の', '屋台', 'は空だった。']);
});
