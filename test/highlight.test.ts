// Run with: npm test. Finding saved words in page text (src/lib/highlight.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHighlighter } from '../src/lib/highlight.ts';

const found = (words: Record<string, string>, text: string) =>
    createHighlighter(words).ranges(text).map(r => text.slice(r.start, r.end));

test('whole words only, any case', () => {
    assert.deepEqual(found({ chat: '#111111' }, 'Le Chat et les chats, chat.'), ['Chat', 'chat']);
    assert.deepEqual(found({ homme: '#111111' }, "l'homme"), ['homme']);
});

test('the longest phrase wins over the words inside it', () => {
    const r = createHighlighter({ 'ice cream': '#111111', ice: '#222222' }).ranges('I like ice cream and ice.');
    assert.deepEqual(r.map(x => x.color), ['#111111', '#222222']);
});

test('Chinese and Japanese match inside a run of text', () => {
    assert.deepEqual(found({ 先生: '#111111' }, 'あの先生は優しい'), ['先生']);
});

test('thousands of words and forms stay fast', () => {
    const words: Record<string, string> = {};
    for (let i = 0; i < 30000; i++) words[`mot${i.toString(36)}`] = '#111111';
    words['mangé'] = '#222222';
    const text = 'Il a mangé une pomme. '.repeat(500);
    const t = Date.now();
    const r = createHighlighter(words).ranges(text);
    assert.equal(r.length, 500);
    assert.ok(Date.now() - t < 1500);
});

test('unpaired letters and surrogates are fine', () => {
    assert.deepEqual(found({ '𠀋x': '#111111' }, 'a𠀋xb'), ['𠀋x']);
    assert.deepEqual(found({ x: '#111111' }, ''), []);
});

test('Korean nouns with a particle written on', () => {
    assert.deepEqual(found({ 친구: '#111111', 책: '#111111' }, '친구와 책을 샀어요. 책상'), ['친구', '책']);
});
