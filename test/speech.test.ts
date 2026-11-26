// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

// speech.ts reads localStorage for the "language you're learning"
const store = new Map<string, string>();
(globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
};
const { langFamily, guessFromScript, speechLang, wordLang, setLearnLang, piperFamily } = await import('../src/lib/speech.ts');

test('language codes from translation services', () => {
    assert.equal(langFamily('fr-FR'), 'fr');
    assert.equal(langFamily('FR'), 'fr');
    assert.equal(langFamily('pt_BR'), 'pt');
    assert.equal(langFamily('auto'), null);
    assert.equal(langFamily(undefined), null);
    assert.equal(langFamily('???'), null);
});

test('guesses from the alphabet', () => {
    assert.equal(guessFromScript('ちょっと'), 'ja');
    assert.equal(guessFromScript('屋台'), 'zh');
    assert.equal(guessFromScript('안녕'), 'ko');
    assert.equal(guessFromScript('étals'), null);
});

test('picks hints first, but not ones the alphabet rules out', () => {
    setLearnLang('');
    assert.equal(speechLang('étals', 'fr-FR'), 'fr');
    assert.equal(speechLang('étals', 'auto', 'fr'), 'fr');
    assert.equal(speechLang('屋台', 'ja'), 'ja');
    assert.equal(speechLang('ちょっと', 'en'), 'ja');
    assert.equal(speechLang('étals'), null);
    setLearnLang('tr');
    assert.equal(speechLang('merhaba', 'auto'), 'tr');
});

test('Piper voice keys', () => {
    assert.equal(piperFamily('fr_FR-siwis-medium'), 'fr');
    assert.equal(piperFamily('tr_TR-dfki-medium'), 'tr');
});

test('kanji-only words are Japanese in a Japanese sentence', () => {
    setLearnLang('');
    assert.equal(wordLang('先生', 'あの先生は優しいです。', 'zh-CN'), 'ja');
    assert.equal(wordLang('先生', '先生您好', 'zh-CN'), 'zh');
    assert.equal(wordLang('先生', '', 'zh-CN', 'ja'), 'ja');
    setLearnLang('ja');
    assert.equal(wordLang('先生', '', 'zh-CN'), 'ja');
    assert.equal(wordLang('maison', '', 'fr'), 'fr');
    setLearnLang('');
});
