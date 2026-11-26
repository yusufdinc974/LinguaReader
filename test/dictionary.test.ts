// Run with: npm test. Builds a dictionary from a small kaikki-style sample
// with scripts/build-dictionary.mjs and looks words up in it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { lookup } from '../electron/dictLookup.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lr-dict-'));
const file = path.join(tmp, 'fr.db');
execFileSync(process.execPath, ['scripts/build-dictionary.mjs', 'test/fixtures/kaikki-sample.jsonl', file, 'fr']);
const db = new Database(file, { readonly: true });
test.after(() => {
    db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
});

test('keeps senses, examples, synonyms and IPA', () => {
    const [e] = lookup(db, 'étal');
    assert.equal(e.word, 'étal');
    assert.equal(e.pos, 'noun');
    assert.equal(e.ipa, '/e.tal/');
    assert.equal(e.senses[0].g, 'stall (stand in a market)');
    assert.deepEqual(e.senses[0].t, ['masculine']);
    assert.deepEqual(e.senses[0].e, [{ x: 'Les étals du marché étaient vides.', tr: 'The market stalls were empty.' }]);
    assert.deepEqual(e.senses[0].y, ['éventaire']);
});

test('finds the headword of an inflected form', () => {
    const r = lookup(db, 'Étals');
    assert.equal(r[0].word, 'étal');
    assert.equal(r[0].viaForm, 'plural');
    assert.equal(lookup(db, 'mangeons')[0].word, 'manger');
});

test('a form-of entry brings its headword along', () => {
    const r = lookup(db, 'mangé');
    assert.deepEqual(r.map(e => e.word), ['mangé', 'manger']);
    assert.deepEqual(r[1].synonyms ?? r[1].senses[0].y, ['bouffer', 'dévorer']);
    assert.deepEqual(r[1].antonyms, ['jeûner']);
});

test('exact case first', () => {
    assert.deepEqual(lookup(db, 'pomme').map(e => e.word), ['pomme', 'Pomme']);
    assert.deepEqual(lookup(db, 'Pomme').map(e => e.word), ['Pomme', 'pomme']);
});

test('other languages, broken lines and gloss-less senses are left out', () => {
    assert.deepEqual(lookup(db, 'apple'), []);
    assert.deepEqual(lookup(db, 'vide'), []);
    assert.deepEqual(lookup(db, 'no-table-tags'), []);
    assert.equal((db.prepare("SELECT v FROM meta WHERE k = 'schema'").get() as { v: string }).v, '1');
});

test('Japanese: kana readings and gloss-less spellings find their entry', () => {
    const f = path.join(tmp, 'ja.db');
    execFileSync(process.execPath, ['scripts/build-dictionary.mjs', 'test/fixtures/kaikki-ja.jsonl', f, 'ja']);
    const ja = new Database(f, { readonly: true });
    try {
        assert.equal(lookup(ja, 'がっこう')[0]?.word, '学校');
        assert.equal(lookup(ja, 'がっこう')[0]?.viaForm, 'reading');
        assert.equal(lookup(ja, '奇麗')[0]?.word, '綺麗');
        assert.equal(lookup(ja, 'キレイ')[0]?.word, '綺麗');
        assert.equal(lookup(ja, 'きれい')[0]?.word, '綺麗');
    } finally {
        ja.close();
    }
});

test('forms of a saved word, for highlighting', async () => {
    const { formsOf } = await import('../electron/dictLookup.ts');
    const forms = formsOf(db, 'manger');
    assert.ok(forms.includes('mangé') && forms.includes('mangeons'), forms.join());
    assert.ok(!forms.includes('manger'));
    // From a form: the headword and its other forms
    const fromForm = formsOf(db, 'mangeons');
    assert.ok(fromForm.includes('manger') && fromForm.includes('mangé'), fromForm.join());
    assert.deepEqual(formsOf(db, 'unknownword'), []);
});

test('a Japanese reading written with a space stays one word', () => {
    const f = path.join(tmp, 'ja2.db');
    execFileSync(process.execPath, ['scripts/build-dictionary.mjs', 'test/fixtures/kaikki-ja.jsonl', f, 'ja']);
    const ja = new Database(f, { readonly: true });
    try {
        assert.equal(lookup(ja, 'がっこう')[0]?.word, '学校');
        assert.deepEqual(lookup(ja, 'こう'), []);
        assert.deepEqual(lookup(ja, 'がっ'), []);
    } finally {
        ja.close();
    }
});
