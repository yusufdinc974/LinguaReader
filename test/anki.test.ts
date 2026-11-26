// Run with: npm test. Anki decks in and out, and the CSV export (electron/anki.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import Database from 'better-sqlite3';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import { ankiText, buildApkg, guessFields, guidFor, progressOf, readApkg, wordsCsv, wordsFrom } from '../electron/anki.ts';

const NOW = new Date('2026-11-26T12:00:00Z');

test('exports a deck that reads back with fields, tags and progress', () => {
    const file = buildApkg('Japanese', [
        { word: '先生', translation: 'teacher', sentence: '先生は優しい。', source: 'Novel', lang: 'ja' },
        { word: 'Haus', translation: 'house <home>', sentence: 'Das Haus ist alt. Ein Haus!', lang: 'de', interval: 10, easinessFactor: 2.3, repetitions: 4, nextReview: '2026-12-03' },
        { word: '先生', translation: 'teacher' }, // the same note again is left out
        { word: '  ', translation: 'nothing' },
    ], NOW);
    const zip = unzipSync(file);
    assert.deepEqual(Object.keys(zip).sort(), ['collection.anki2', 'media']);

    const db = new Database(Buffer.from(zip['collection.anki2']));
    const col = db.prepare('SELECT ver, models, decks FROM col').get() as { ver: number; models: string; decks: string };
    assert.equal(col.ver, 11);
    const models = Object.values(JSON.parse(col.models)) as { flds: { name: string }[]; tmpls: unknown[] }[];
    assert.deepEqual(models[0].flds.map(f => f.name), ['Word', 'Translation', 'Sentence', 'Source']);
    assert.ok(Object.values(JSON.parse(col.decks)).some((d: any) => d.name === 'Japanese'));
    const notes = db.prepare('SELECT guid, flds, tags, sfld, csum FROM notes ORDER BY id').all() as { guid: string; flds: string; tags: string; sfld: string; csum: number }[];
    assert.equal(notes.length, 2);
    assert.equal(notes[0].guid, guidFor('linguareader', '先生', 'teacher'));
    assert.equal(notes[0].tags, ' linguareader ja ');
    assert.equal(notes[0].sfld, '先生');
    assert.ok(notes[0].csum > 0);
    const haus = notes[1].flds.split('\x1f');
    assert.equal(haus[1], 'house &lt;home&gt;');
    assert.equal(haus[2], 'Das <b>Haus</b> ist alt. Ein <b>Haus</b>!');

    const cards = db.prepare('SELECT type, queue, due, ivl, factor, reps FROM cards ORDER BY id').all() as Record<string, number>[];
    assert.deepEqual(cards[0], { type: 0, queue: 0, due: 0, ivl: 0, factor: 0, reps: 0 });
    assert.deepEqual(cards[1], { type: 2, queue: 2, due: 365 + 7, ivl: 10, factor: 2300, reps: 4 });
    db.close();

    // And back in: the reader sees the same words and the same next review day
    const pkg = readApkg(file);
    assert.deepEqual(pkg.decks.map(d => [d.name, d.notes]), [['Japanese', 2]]);
    assert.equal(pkg.noteTypes[0].name, 'LinguaReader');
    const map = guessFields(pkg.noteTypes[0].fields);
    assert.deepEqual(map, { word: 0, translation: 1, sentence: 2 });
    const words = wordsFrom(pkg, { [pkg.noteTypes[0].id]: map }, null, true, NOW);
    assert.deepEqual(words.map(w => [w.word, w.translation, w.sentence]), [
        ['先生', 'teacher', '先生は優しい。'],
        ['Haus', 'house <home>', 'Das Haus ist alt. Ein Haus!'],
    ]);
    assert.equal(words[0].srs, null);
    assert.deepEqual(words[1].srs, { interval: 10, easinessFactor: 2.3, repetitions: 4, nextReview: '2026-12-03', level: 3 });
});

test('the same word always gets the same Anki id, so a second export updates the cards', () => {
    assert.equal(guidFor('a', 'b'), guidFor('a', 'b'));
    assert.notEqual(guidFor('a', 'b'), guidFor('a', 'c'));
    assert.match(guidFor('x'), /^[\x21-\x7e]{6,11}$/);
});

/** A deck as Anki 2.1.50+ exports it: the real collection zstd-compressed, beside a stub. */
function modernApkg() {
    const db = new Database(':memory:');
    db.exec(`
        CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null,
            dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null,
            decks text not null, dconf text not null, tags text not null);
        CREATE TABLE notetypes (id integer primary key, name text not null, mtime_secs integer not null, usn integer not null, config blob not null);
        CREATE TABLE fields (ntid integer not null, ord integer not null, name text not null, config blob not null, primary key (ntid, ord));
        CREATE TABLE decks (id integer primary key, name text not null, mtime_secs integer not null, usn integer not null, common blob not null, kind blob not null);
        CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null,
            tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
        CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null,
            usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null,
            factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null,
            odid integer not null, flags integer not null, data text not null);
    `);
    const crt = Math.floor(Date.parse('2026-01-01T04:00:00Z') / 1000);
    db.prepare("INSERT INTO col VALUES (1, ?, 0, 0, 18, 0, 0, 0, '', '', '', '', '')").run(crt);
    db.prepare("INSERT INTO notetypes VALUES (10, 'Japanese (recognition)', 0, 0, x'')").run();
    ['Audio', 'Expression', 'Reading', 'Meaning', 'Sentence'].forEach((f, i) => db.prepare("INSERT INTO fields VALUES (10, ?, ?, x'')").run(i, f));
    db.prepare("INSERT INTO decks VALUES (1, 'Default', 0, 0, x'', x'')").run();
    db.prepare("INSERT INTO decks VALUES (20, 'Japanese\x1fCore 2k', 0, 0, x'', x'')").run();
    db.prepare("INSERT INTO decks VALUES (30, 'Other', 0, 0, x'', x'')").run();
    const note = db.prepare("INSERT INTO notes VALUES (?, ?, 10, 0, 0, ' core ', ?, '', 0, 0, '')");
    const card = db.prepare("INSERT INTO cards VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, '')");
    note.run(1, 'a', ['[sound:sensei.mp3]', '先生', 'せんせい', 'teacher; <b>master</b>', '<div>先生[せんせい]は 優[やさ]しい。</div>'].join('\x1f'));
    card.run(100, 1, 20, 0, 2, 2, 330, 30, 2650, 9); // review, due on day 330
    card.run(101, 1, 20, 1, 0, 0, 5, 0, 0, 0); // its reverse card, not studied
    note.run(2, 'b', ['', '学校', 'がっこう', 'school&nbsp;(n.)', ''].join('\x1f'));
    card.run(102, 2, 20, 0, 1, 1, 1764158400, 0, 2500, 2); // learning
    note.run(3, 'c', ['', '猫', 'ねこ', 'cat', ''].join('\x1f'));
    card.run(103, 3, 30, 0, 0, 0, 7, 0, 0, 0); // new, in another deck
    const real = db.serialize();
    db.close();

    const stub = new Database(':memory:');
    stub.exec("CREATE TABLE col (id integer primary key, crt integer, models text, decks text); INSERT INTO col VALUES (1, 0, '{}', '{}');");
    const stubFile = stub.serialize();
    stub.close();
    return zipSync({
        'collection.anki2': new Uint8Array(stubFile),
        'collection.anki21b': new Uint8Array(zlib.zstdCompressSync(real)),
        meta: new Uint8Array([8, 3]),
        media: new Uint8Array(zlib.zstdCompressSync(Buffer.alloc(0))),
    });
}

test('reads decks exported by current Anki versions', () => {
    const pkg = readApkg(modernApkg());
    assert.deepEqual(pkg.decks.map(d => [d.name, d.notes]), [['Japanese::Core 2k', 2], ['Other', 1]]);
    const t = pkg.noteTypes[0];
    assert.deepEqual(t.fields, ['Audio', 'Expression', 'Reading', 'Meaning', 'Sentence']);
    const map = guessFields(t.fields, pkg.notes.map(n => n.fields));
    assert.deepEqual(map, { word: 1, translation: 3, sentence: 4 });

    const words = wordsFrom(pkg, { [t.id]: map }, [20], true, NOW);
    assert.deepEqual(words.map(w => [w.word, w.translation, w.sentence, w.deck]), [
        ['先生', 'teacher; master', '先生は優しい。', 'Japanese::Core 2k'],
        ['学校', 'school (n.)', '', 'Japanese::Core 2k'],
    ]);
    // The review card keeps its interval and its due day (day 330 after 2026-01-01)
    assert.deepEqual(words[0].srs, { interval: 30, easinessFactor: 2.65, repetitions: 9, nextReview: '2026-11-27', level: 4 });
    // A card still in learning is seen, and due today
    assert.deepEqual(words[1].srs, { interval: 0, easinessFactor: 2.5, repetitions: 2, nextReview: '2026-11-26', level: 2 });

    assert.equal(wordsFrom(pkg, { [t.id]: map }, null, false, NOW).length, 3);
    assert.ok(wordsFrom(pkg, { [t.id]: map }, null, false, NOW).every(w => w.srs === null));
});

test('also opens a bare collection file and a re-zipped deck', () => {
    const zip = unzipSync(buildApkg('D', [{ word: 'a', translation: 'b' }], NOW));
    assert.equal(readApkg(zip['collection.anki2']).notes.length, 1);
    assert.equal(readApkg(zipSync({ 'My deck/collection.anki2': zip['collection.anki2'] })).notes.length, 1);
});

test('a file that is not an Anki deck says so', () => {
    assert.throws(() => readApkg(strToU8('hello')), /isn't an Anki deck/);
    assert.throws(() => readApkg(zipSync({ 'a.txt': strToU8('x') })), /isn't an Anki deck/);
});

test('field text loses its HTML, sounds and furigana', () => {
    assert.equal(ankiText('<b>dog</b>&nbsp;&amp; <i>cat</i>'), 'dog & cat');
    assert.equal(ankiText('one<br>two<div>three</div>'), 'one two three');
    assert.equal(ankiText('[sound:x.mp3]<img src="a.jpg">hello'), 'hello');
    assert.equal(ankiText('{{c1::Paris::city}} is in {{c2::France}}'), 'Paris is in France');
    assert.equal(ankiText(' 日本[にほん]語[ご]を 話[はな]す'), '日本語を話す');
    assert.equal(ankiText('array[0]'), 'array[0]');
    assert.equal(ankiText('&#233;t&#xe9;'), 'été');
});

test('guesses which field is which', () => {
    assert.deepEqual(guessFields(['Front', 'Back']), { word: 0, translation: 1, sentence: -1 });
    assert.deepEqual(guessFields(['Back', 'Front']), { word: 1, translation: 0, sentence: -1 });
    assert.deepEqual(guessFields(['Text', 'Extra']), { word: 0, translation: 1, sentence: -1 });
    assert.deepEqual(guessFields(['Picture', 'Word', 'Example sentence', 'Definition']), { word: 1, translation: 3, sentence: 2 });
    // A field with only sound in it is passed over
    assert.deepEqual(guessFields(['Sound', 'Term', 'Gloss'], [['[sound:a.mp3]', 'a', 'b']]), { word: 1, translation: 2, sentence: -1 });
});

test('progress from Anki cards', () => {
    const crt = Math.floor(Date.parse('2026-11-01T04:00:00Z') / 1000);
    assert.equal(progressOf(null, crt, NOW), null);
    assert.equal(progressOf({ type: 0, queue: 0, due: 1, ivl: 0, factor: 0, reps: 0 }, crt, NOW), null);
    // Intervals past a year are capped, and so is the next review
    const long = progressOf({ type: 2, queue: 2, due: 2000, ivl: 1500, factor: 3500, reps: 20 }, crt, NOW)!;
    assert.equal(long.interval, 365);
    assert.equal(long.easinessFactor, 3);
    assert.equal(long.nextReview, '2027-11-26');
    assert.equal(long.level, 5);
    // Overdue in Anki → overdue here
    assert.equal(progressOf({ type: 2, queue: 2, due: 10, ivl: 4, factor: 2500, reps: 3 }, crt, NOW)!.nextReview, '2026-11-11');
    // Suspended cards keep their schedule
    assert.equal(progressOf({ type: 2, queue: -1, due: 28, ivl: 4, factor: 2500, reps: 3 }, crt, NOW)!.nextReview, '2026-11-29');
});

test('CSV export quotes what it must and keeps formulas out', () => {
    const csv = wordsCsv([
        { word: 'Haus', translation: 'house, home', sentence_context: 'Er sagte "Hallo".', source_language: 'de', target_language: 'en', pdf_name: 'Book.pdf', familiarity_level: 3, next_review_date: '2026-12-01', created_at: '2026-11-20 10:00:00' },
        { word: '=SUM(A1)', translation: '-5', source_language: 'auto' },
        { word: '-ness', translation: 'line\nbreak' },
    ]);
    assert.ok(csv.startsWith('﻿Word,Translation,Sentence,'));
    const lines = csv.slice(1).split('\r\n');
    assert.equal(lines[1], 'Haus,"house, home","Er sagte ""Hallo"".",de,en,Book.pdf,Learning,2026-12-01,2026-11-20 10:00:00');
    assert.equal(lines[2], `"'=SUM(A1)","'-5",,,,,New,,`);
    assert.equal(lines[3], '-ness,"line\nbreak",,,,,New,,');
});
