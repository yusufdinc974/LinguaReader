// Builds one language's offline dictionary for LinguaReader from Wiktionary
// data extracted by wiktextract (https://kaikki.org, English Wiktionary, so
// the definitions are in English). Output: a small SQLite file the app opens
// read-only (see electron/dictionary.ts).
//
//   node scripts/build-dictionary.mjs <kaikki .jsonl or .jsonl.gz> <out.db> <lang code> [Wiktionary code]
//
// The Wiktionary code is the lang_code in the data when it differs from the
// app's code (Norwegian Bokmål: app "no", Wiktionary "nb").
//
// Kept per entry: part of speech, IPA, up to 8 senses (gloss, tags, up to 2
// examples, synonyms), entry synonyms/antonyms and "form of" links, and up
// to 60 inflected forms (possessive and clitic forms are left out). Inflected
// forms ("mangé", "mangeons") map to their headword so they can be looked up.
//
// Wiktionary content is CC BY-SA 4.0 (and GFDL); the app shows the credit.

import fs from 'node:fs';
import readline from 'node:readline';
import zlib from 'node:zlib';
import Database from 'better-sqlite3';

const [input, output, lang, sourceCode = lang] = process.argv.slice(2);
if (!input || !output || !/^[a-z]{2,3}$/.test(lang ?? '')) {
    console.error('usage: build-dictionary.mjs <kaikki.jsonl[.gz]> <out.db> <lang>');
    process.exit(2);
}

export const SCHEMA_VERSION = 1;
const MAX_SENSES = 8;
const MAX_EXAMPLES = 2;
const MAX_WORDS = 12;
const MAX_TEXT = 400;
/** Finnish and the like list hundreds of forms per word (possessives, clitics); keep the common ones. */
const MAX_FORMS = 60;

/** Same as wordKey() in src/lib/words.ts. */
const key = s => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const clip = s => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : '');
const words = list => [...new Set((Array.isArray(list) ? list : []).map(x => clip(x?.word)).filter(Boolean))].slice(0, MAX_WORDS);
/** Tags that only describe the form table; not worth showing. */
const SKIP_FORM_TAGS = new Set(['table-tags', 'inflection-template', 'class', 'romanization']);

fs.rmSync(output, { force: true });
const db = new Database(output);
db.pragma('journal_mode = OFF');
db.pragma('synchronous = OFF');
db.exec(`
    CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE entries (id INTEGER PRIMARY KEY, key TEXT NOT NULL, word TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE forms (key TEXT NOT NULL, entry INTEGER NOT NULL, tags TEXT);
    CREATE TEMP TABLE redirects (key TEXT NOT NULL, target TEXT NOT NULL);
`);
const insEntry = db.prepare('INSERT INTO entries (key, word, data) VALUES (?, ?, ?)');
const insForm = db.prepare('INSERT INTO forms (key, entry, tags) VALUES (?, ?, ?)');
const insRedirect = db.prepare('INSERT INTO redirects (key, target) VALUES (?, ?)');

let stream = fs.createReadStream(input);
if (input.endsWith('.gz')) stream = stream.pipe(zlib.createGunzip());
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

let lines = 0, entries = 0, forms = 0, skipped = 0, redirects = 0;
const begin = db.prepare('BEGIN'), commit = db.prepare('COMMIT');
begin.run();
for await (const line of rl) {
    lines++;
    if (!line.trim()) continue;
    let e;
    try {
        e = JSON.parse(line);
    } catch {
        skipped++;
        continue;
    }
    if (!e?.word || (e.lang_code && e.lang_code !== sourceCode)) {
        skipped++;
        continue;
    }
    const senses = [];
    const formOf = new Set();
    for (const s of Array.isArray(e.senses) ? e.senses : []) {
        for (const f of [...(s.form_of ?? []), ...(s.alt_of ?? [])]) if (f?.word) formOf.add(clip(f.word));
        const gloss = clip((s.glosses ?? s.raw_glosses ?? []).at(-1));
        if (!gloss) continue;
        const sense = { g: gloss };
        const tags = (s.tags ?? []).filter(t => typeof t === 'string' && !/^(form-of|alt-of|no-gloss)$/.test(t)).slice(0, 6);
        if (tags.length) sense.t = tags;
        const ex = (s.examples ?? [])
            .map(x => ({ x: clip(x?.text), tr: clip(x?.english ?? x?.translation) }))
            .filter(x => x.x && x.x.length < 250)
            .slice(0, MAX_EXAMPLES)
            .map(x => (x.tr ? x : { x: x.x }));
        if (ex.length) sense.e = ex;
        const syn = words(s.synonyms);
        if (syn.length) sense.y = syn;
        senses.push(sense);
        if (senses.length >= MAX_SENSES) break;
    }
    if (senses.length === 0) {
        // A spelling page with no definitions of its own ("书": simplified 書,
        // "がっこう": kana for 学校) still finds the entry it points to
        const k = key(clip(e.word));
        for (const f of [...formOf].slice(0, 4)) if (key(f) !== k) {
            insRedirect.run(k, key(f));
            redirects++;
        }
        if (formOf.size === 0) skipped++;
        continue;
    }
    const data = { p: clip(e.pos) };
    const ipa = (e.sounds ?? []).map(s => clip(s?.ipa)).find(Boolean);
    if (ipa) data.i = ipa;
    data.s = senses;
    const syn = words(e.synonyms);
    if (syn.length) data.y = syn;
    const ant = words(e.antonyms);
    if (ant.length) data.a = ant;
    if (formOf.size) data.f = [...formOf].slice(0, 4);

    const word = clip(e.word);
    const id = insEntry.run(key(word), word, JSON.stringify(data)).lastInsertRowid;
    entries++;
    const seen = new Set([key(word)]);
    let kept = 0;
    for (const f of Array.isArray(e.forms) ? e.forms : []) {
        const form = clip(f?.form);
        const tags = (f?.tags ?? []).filter(t => typeof t === 'string');
        if (!form || form === '-' || tags.some(t => SKIP_FORM_TAGS.has(t)) || form.length > 60) continue;
        const k = key(form);
        if (seen.has(k) || tags.some(t => /possessive|clitic/.test(t))) continue;
        seen.add(k);
        insForm.run(k, id, tags.slice(0, 5).join(' ') || null);
        forms++;
        if (++kept >= MAX_FORMS) break;
    }
    // Japanese: the kana reading is in the headword line, "学校 (がっこう) • (gakkō)"
    for (const t of Array.isArray(e.head_templates) ? e.head_templates : []) {
        const found = [...String(t?.expansion ?? '').matchAll(/[(（\s]([\p{Script=Hiragana}\p{Script=Katakana}ー・]+)(?=[)）,\s]|$)/gu)].map(m => m[1]);
        for (const v of Object.values(t?.args ?? {})) if (typeof v === 'string' && /^[\p{Script=Hiragana}\p{Script=Katakana}ー・ ]+$/u.test(v)) found.push(v);
        for (const m of found) {
            for (const r of m.split(/[・ ]+/)) {
                const k = key(r);
                if (!k || seen.has(k)) continue;
                seen.add(k);
                insForm.run(k, id, 'reading');
                forms++;
            }
        }
    }
    if (entries % 50000 === 0) {
        commit.run();
        begin.run();
        console.log(`${entries} entries…`);
    }
}
commit.run();
db.exec(`
    CREATE INDEX entries_key ON entries (key);
    INSERT INTO forms (key, entry, tags)
        SELECT DISTINCT r.key, e.id, NULL FROM redirects r JOIN entries e ON e.key = r.target
        WHERE NOT EXISTS (SELECT 1 FROM entries x WHERE x.key = r.key);
    DROP TABLE redirects;
    CREATE INDEX forms_key ON forms (key);
`);
const meta = db.prepare('INSERT INTO meta (k, v) VALUES (?, ?)');
meta.run('schema', String(SCHEMA_VERSION));
meta.run('lang', lang);
meta.run('entries', String(entries));
meta.run('built', new Date().toISOString().slice(0, 10));
meta.run('source', 'English Wiktionary via kaikki.org (wiktextract). CC BY-SA 4.0 and GFDL.');
db.exec('VACUUM');
db.close();
// For the release manifest
fs.writeFileSync(`${output}.meta.json`, JSON.stringify({ lang, entries, forms }));
console.log(`${output}: ${entries} entries, ${forms} forms, ${redirects} redirects from ${lines} lines (${skipped} skipped), ${(fs.statSync(output).size / 1e6).toFixed(1)} MB`);
