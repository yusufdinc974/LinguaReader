// Anki decks (.apkg) in and out. No Electron here, so the tests can run it.
//
// Export writes the classic collection.anki2 layout, which every Anki
// version imports (and AnkiDroid / AnkiMobile too). Import reads both that
// and the newer collection.anki21b (zstd-compressed) that Anki 2.1.50+ writes.

import crypto from 'node:crypto';
import zlib from 'node:zlib';
import Database from 'better-sqlite3';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import type { FieldMap } from './ankiTypes';

export type { FieldMap };

const DAY = 86400;
const MAX_INTERVAL = 365;
const SEP = '\x1f';

// ---------------------------------------------------------------- export

export interface ExportWord {
    word: string;
    translation: string;
    sentence?: string | null;
    source?: string | null;
    lang?: string | null;
    /** Review progress: interval in days (0 = not learned yet) */
    interval?: number | null;
    easinessFactor?: number | null;
    repetitions?: number | null;
    nextReview?: string | null;
}

/** One note type for every LinguaReader deck, so re-imports update in place. */
const MODEL_ID = 1764150000001;

const CSS = `.card { font-family: Georgia, "Times New Roman", serif; font-size: 22px; text-align: center; color: #1f1d1a; background: #fbfaf7; }
.word { font-size: 34px; margin: 12px 0; }
.sentence { font-size: 17px; font-style: italic; color: #6b675f; margin-top: 14px; }
.sentence b { color: #1f1d1a; }
.translation { font-size: 24px; }
.source { font-size: 13px; color: #9a958b; margin-top: 18px; font-family: system-ui, sans-serif; }
.nightMode .card, .card.nightMode { color: #ecebe8; background: #1d1c1a; }
.nightMode .sentence b { color: #ecebe8; }`;

const QFMT = '<div class="word">{{Word}}</div>\n{{#Sentence}}<div class="sentence">{{Sentence}}</div>{{/Sentence}}';
const AFMT = '{{FrontSide}}\n<hr id="answer">\n<div class="translation">{{Translation}}</div>\n{{#Source}}<div class="source">{{Source}}</div>{{/Source}}';

export function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The sentence with the word in bold (case-insensitive, every occurrence). */
function markWord(sentence: string, word: string) {
    const html = escapeHtml(sentence);
    const w = escapeHtml(word.trim());
    if (!w) return html;
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
    return html.replace(re, m => `<b>${m}</b>`);
}

const BASE91 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~';

/** Anki-style note id: the same word and translation always get the same one. */
export function guidFor(...values: string[]) {
    let n = crypto.createHash('sha256').update(values.join('__')).digest().readBigUInt64BE(0);
    let out = '';
    while (n > 0n) {
        out = BASE91[Number(n % 91n)] + out;
        n /= 91n;
    }
    return out;
}

/** First 8 hex digits of the SHA-1 of the sort field, as Anki computes it. */
function checksum(text: string) {
    return parseInt(crypto.createHash('sha1').update(text).digest('hex').slice(0, 8), 16);
}

const isoDay = (d: Date) => d.toISOString().split('T')[0];

/** Days from today until an ISO date ("2026-12-01"); negative when overdue. */
function daysUntil(iso: string, now: Date) {
    const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
    if (isNaN(t)) return 0;
    return Math.round((t - Date.parse(`${isoDay(now)}T00:00:00Z`)) / (DAY * 1000));
}

function tagFor(s: string) {
    return s.replace(/[\s"]+/g, '_');
}

/** Builds an .apkg file (a zip) with one deck holding the given words. */
export function buildApkg(deckName: string, words: ExportWord[], now = new Date()): Uint8Array {
    const db = new Database(':memory:');
    const nowS = Math.floor(now.getTime() / 1000);
    const nowMs = now.getTime();
    // The collection "started" a year ago, so overdue cards still get a due day >= 0
    const crt = nowS - 365 * DAY;
    const today = 365;
    const deckId = Number(BigInt.asUintN(40, crypto.createHash('sha256').update(`deck:${deckName}`).digest().readBigUInt64BE(0))) + 1;

    db.exec(`
        CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null,
            dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null,
            decks text not null, dconf text not null, tags text not null);
        CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null,
            tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
        CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null,
            usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null,
            factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null,
            odid integer not null, flags integer not null, data text not null);
        CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null,
            lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
        CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
        CREATE INDEX ix_notes_usn on notes (usn);
        CREATE INDEX ix_cards_usn on cards (usn);
        CREATE INDEX ix_revlog_usn on revlog (usn);
        CREATE INDEX ix_cards_nid on cards (nid);
        CREATE INDEX ix_cards_sched on cards (did, queue, due);
        CREATE INDEX ix_revlog_cid on revlog (cid);
        CREATE INDEX ix_notes_csum on notes (csum);
    `);

    const deck = (id: number, name: string) => ({
        id, name, desc: '', mod: nowS, usn: -1, collapsed: false, browserCollapsed: false, dyn: 0, conf: 1,
        extendNew: 0, extendRev: 50, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0],
    });
    const model = {
        id: MODEL_ID, name: 'LinguaReader', type: 0, mod: nowS, usn: -1, sortf: 0, did: deckId,
        flds: ['Word', 'Translation', 'Sentence', 'Source'].map((name, ord) => ({ name, ord, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] })),
        tmpls: [{ name: 'Word → Translation', ord: 0, qfmt: QFMT, afmt: AFMT, did: null, bqfmt: '', bafmt: '', bfont: '', bsize: 0 }],
        css: CSS, latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
        latexPost: '\\end{document}', latexsvg: false, req: [[0, 'all', [0]]], tags: [], vers: [],
    };
    const dconf = {
        1: {
            id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true, dyn: false,
            new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20, separate: true },
            lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
            rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 200 },
        },
    };
    const conf = { activeDecks: [1], curDeck: 1, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true, dueCounts: true, curModel: String(MODEL_ID), nextPos: words.length + 1, sortType: 'noteFld', sortBackwards: false, addToCur: true };
    db.prepare('INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, ?)').run(
        crt, nowMs, nowMs, JSON.stringify(conf), JSON.stringify({ [MODEL_ID]: model }),
        JSON.stringify({ 1: deck(1, 'Default'), [deckId]: deck(deckId, deckName) }), JSON.stringify(dconf), '{}',
    );

    const addNote = db.prepare('INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, \'\')');
    const addCard = db.prepare('INSERT INTO cards VALUES (?, ?, ?, 0, ?, -1, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, \'\')');
    let id = nowMs;
    let pos = 0;
    const seen = new Set<string>();
    db.transaction(() => {
        for (const w of words) {
            const word = w.word.trim();
            if (!word) continue;
            const guid = guidFor('linguareader', word, w.translation);
            if (seen.has(guid)) continue;
            seen.add(guid);
            const fields = [escapeHtml(word), escapeHtml(w.translation ?? ''), w.sentence ? markWord(w.sentence, word) : '', escapeHtml(w.source ?? '')];
            const tags = ` linguareader${w.lang && w.lang !== 'auto' ? ` ${tagFor(w.lang)}` : ''} `;
            const noteId = id++;
            addNote.run(noteId, guid, MODEL_ID, nowS, tags, fields.join(SEP), fields[0], checksum(word));

            const ivl = Math.max(0, Math.round(w.interval ?? 0));
            if (ivl > 0) {
                // A word in review: Anki shows it again on our next review day
                const due = today + (w.nextReview ? daysUntil(w.nextReview, now) : ivl);
                const factor = Math.round(Math.min(3, Math.max(1.3, w.easinessFactor || 2.5)) * 1000);
                addCard.run(id++, noteId, deckId, nowS, 2, 2, Math.max(0, due), ivl, factor, Math.max(1, w.repetitions ?? 1));
            } else {
                addCard.run(id++, noteId, deckId, nowS, 0, 0, pos++, 0, 0, 0);
            }
        }
    })();

    const file = db.serialize();
    db.close();
    return zipSync({ 'collection.anki2': new Uint8Array(file), media: strToU8('{}') }, { level: 6 });
}

// ---------------------------------------------------------------- import

export interface AnkiCard {
    type: number;
    queue: number;
    due: number;
    ivl: number;
    factor: number;
    reps: number;
}

export interface AnkiNote {
    id: number;
    noteType: number;
    /** Raw field contents (HTML) */
    fields: string[];
    tags: string[];
    decks: number[];
    /** The note's first card, for its review progress */
    card: AnkiCard | null;
}

export interface AnkiPackage {
    /** Collection creation, seconds: review due days count from here */
    crt: number;
    decks: { id: number; name: string; notes: number }[];
    noteTypes: { id: number; name: string; fields: string[]; notes: number }[];
    notes: AnkiNote[];
}

function openCollection(zip: Record<string, Uint8Array>) {
    const b = zip['collection.anki21b'];
    if (b) {
        if (typeof zlib.zstdDecompressSync !== 'function') throw new Error('This Anki deck needs a newer version of LinguaReader to open.');
        return new Database(zlib.zstdDecompressSync(b));
    }
    const legacy = zip['collection.anki21'] ?? zip['collection.anki2'];
    if (!legacy) throw new Error("This file isn't an Anki deck. In Anki, use File → Export and choose “Anki Deck Package (*.apkg)”.");
    return new Database(Buffer.from(legacy));
}

const hasTable = (db: Database.Database, name: string) =>
    !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);

/** Reads an .apkg (or .colpkg) file. */
export function readApkg(data: Uint8Array): AnkiPackage {
    let zip: Record<string, Uint8Array>;
    if (Buffer.from(data.subarray(0, 16)).toString('latin1') === 'SQLite format 3\0') {
        // A bare collection file (collection.anki2 taken out of its package)
        zip = { 'collection.anki2': data };
    } else {
        try {
            // The collection may sit in a folder when the file was re-zipped by hand
            const raw = unzipSync(data, { filter: f => /(^|\/)collection\.anki2/.test(f.name) });
            zip = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.split('/').pop()!, v]));
        } catch {
            throw new Error("This file isn't an Anki deck. In Anki, use File → Export and choose “Anki Deck Package (*.apkg)”.");
        }
    }
    const db = openCollection(zip);
    try {
        const col = db.prepare('SELECT * FROM col LIMIT 1').get() as { crt: number; models?: string; decks?: string };
        const crt = Number(col?.crt) || 0;

        const deckNames = new Map<number, string>();
        const types = new Map<number, { name: string; fields: string[] }>();
        if (hasTable(db, 'notetypes') && hasTable(db, 'fields')) {
            // Anki 2.1.28+ schema
            for (const r of db.prepare('SELECT id, name FROM notetypes').all() as { id: number; name: string }[]) types.set(Number(r.id), { name: r.name, fields: [] });
            for (const r of db.prepare('SELECT ntid, ord, name FROM fields ORDER BY ntid, ord').all() as { ntid: number; ord: number; name: string }[]) {
                types.get(Number(r.ntid))?.fields.push(r.name);
            }
        } else if (col?.models) {
            for (const m of Object.values(JSON.parse(col.models) as Record<string, { id: number | string; name: string; flds: { name: string; ord: number }[] }>)) {
                types.set(Number(m.id), { name: m.name, fields: [...m.flds].sort((a, b) => a.ord - b.ord).map(f => f.name) });
            }
        }
        if (hasTable(db, 'decks')) {
            for (const r of db.prepare('SELECT id, name FROM decks').all() as { id: number; name: string }[]) deckNames.set(Number(r.id), r.name.split(SEP).join('::'));
        } else if (col?.decks) {
            for (const d of Object.values(JSON.parse(col.decks) as Record<string, { id: number | string; name: string }>)) deckNames.set(Number(d.id), d.name);
        }

        // Each note's first card (lowest template), and every deck it has cards in
        const cards = new Map<number, AnkiCard & { ord: number }>();
        const noteDecks = new Map<number, Set<number>>();
        for (const c of db.prepare('SELECT nid, did, odid, ord, type, queue, due, odue, ivl, factor, reps FROM cards').all() as Record<string, number>[]) {
            const nid = Number(c.nid);
            // A card in a filtered deck really belongs to its original deck
            const did = Number(c.odid) || Number(c.did);
            const set = noteDecks.get(nid) ?? new Set<number>();
            set.add(did);
            noteDecks.set(nid, set);
            const prev = cards.get(nid);
            if (!prev || c.ord < prev.ord) {
                cards.set(nid, { ord: c.ord, type: c.type, queue: c.queue, due: Number(c.odid) ? c.odue : c.due, ivl: c.ivl, factor: c.factor, reps: c.reps });
            }
        }

        const notes: AnkiNote[] = [];
        for (const n of db.prepare('SELECT id, mid, tags, flds FROM notes ORDER BY id').all() as { id: number; mid: number; tags: string; flds: string }[]) {
            const id = Number(n.id);
            const card = cards.get(id);
            notes.push({
                id,
                noteType: Number(n.mid),
                fields: String(n.flds).split(SEP),
                tags: String(n.tags).trim().split(/\s+/).filter(Boolean),
                decks: [...(noteDecks.get(id) ?? [])],
                card: card ? { type: card.type, queue: card.queue, due: card.due, ivl: card.ivl, factor: card.factor, reps: card.reps } : null,
            });
        }

        const deckCount = new Map<number, number>();
        const typeCount = new Map<number, number>();
        for (const n of notes) {
            for (const d of n.decks) deckCount.set(d, (deckCount.get(d) ?? 0) + 1);
            typeCount.set(n.noteType, (typeCount.get(n.noteType) ?? 0) + 1);
        }
        return {
            crt,
            decks: [...deckCount].map(([id, count]) => ({ id, name: deckNames.get(id) ?? 'Deck', notes: count })).sort((a, b) => a.name.localeCompare(b.name)),
            noteTypes: [...typeCount].map(([id, count]) => {
                const t = types.get(id);
                return { id, name: t?.name ?? 'Note', fields: t?.fields ?? [], notes: count };
            }),
            notes,
        };
    } finally {
        db.close();
    }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * A field's text without the HTML: sounds, pictures and tags are dropped,
 * cloze deletions show their answer, and Japanese furigana (日本[にほん]) is
 * dropped from after the kanji.
 */
export function ankiText(html: string) {
    let s = html
        .replace(/\[sound:[^\]]*\]/g, ' ')
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<br\s*\/?>|<\/?(div|p|li|tr|td|h\d)\b[^>]*>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
            if (e[0] === '#') {
                const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
                return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
            }
            return ENTITIES[e.toLowerCase()] ?? m;
        })
        .replace(/\{\{c\d+::([\s\S]*?)(::[\s\S]*?)?\}\}/g, '$1');
    // Furigana: " 日本[にほん]語[ご]" → "日本語"
    if (/\p{Script=Han}\[/u.test(s)) s = s.replace(/ ?([^\s[\]]*\p{Script=Han}[^\s[\]]*)\[[^\]]*\]/gu, '$1');
    return s.replace(/\s+/g, ' ').trim();
}

const FIELD_GUESS = {
    word: /^(front|word|words?\s*\(?target|target|expression|vocab|vocabulary|term|kanji|hanzi|lemma|headword|question)/i,
    translation: /^(back|meaning|translation|definition|english|gloss|answer)/i,
    sentence: /(sentence|example|context|usage)/i,
};

/** Which fields most likely hold the word, its translation and an example sentence. */
export function guessFields(fields: string[], samples: string[][] = []): FieldMap {
    // A field is usable if some sample has text in it (not only audio or a picture)
    const usable = (i: number) => samples.length === 0 || samples.some(s => ankiText(s[i] ?? ''));
    const find = (re: RegExp, skip: number[]) => fields.findIndex((f, i) => !skip.includes(i) && re.test(f.trim()) && usable(i));
    let word = find(FIELD_GUESS.word, []);
    if (word < 0) word = fields.findIndex((_, i) => usable(i));
    if (word < 0) word = 0;
    let translation = find(FIELD_GUESS.translation, [word]);
    if (translation < 0) translation = fields.findIndex((_, i) => i !== word && usable(i) && !FIELD_GUESS.sentence.test(fields[i]));
    if (translation < 0) translation = fields.length > 1 ? (word === 0 ? 1 : 0) : word;
    const sentence = find(FIELD_GUESS.sentence, [word, translation]);
    return { word, translation, sentence };
}

export interface ImportedWord {
    word: string;
    translation: string;
    sentence: string;
    deck: string;
    /** Anki's review progress, or null for a card not studied yet */
    srs: { interval: number; easinessFactor: number; repetitions: number; nextReview: string; level: number } | null;
}

/** Level shown in the app, from how far out the word is scheduled (as src/lib/srs.ts). */
export function levelFromInterval(interval: number): number {
    if (interval <= 0) return 1;
    if (interval < 3) return 2;
    if (interval < 21) return 3;
    if (interval < 90) return 4;
    return 5;
}

/** The app's progress for a word, from its Anki card. */
export function progressOf(card: AnkiCard | null, crt: number, now = new Date()) {
    if (!card || card.type === 0) return null;
    const today = isoDay(now);
    const ef = Math.min(3, Math.max(1.3, card.factor > 0 ? card.factor / 1000 : 2.5));
    const reps = Math.max(1, card.reps || 1);
    // Learning or relearning: seen, but due again soon
    if (card.type === 1 || card.ivl <= 0) return { interval: 0, easinessFactor: ef, repetitions: reps, nextReview: today, level: 2 };
    const interval = Math.min(MAX_INTERVAL, card.ivl);
    let next = today;
    // Review cards count their due day from the collection's creation
    if (card.type === 2 && card.queue !== 1 && card.queue !== 3 && crt > 0) {
        const d = new Date((crt + card.due * DAY) * 1000);
        if (!isNaN(d.getTime())) next = isoDay(d);
        // Never further out than the capped interval
        const max = new Date(now);
        max.setUTCDate(max.getUTCDate() + interval);
        if (next > isoDay(max)) next = isoDay(max);
    }
    return { interval, easinessFactor: ef, repetitions: reps, nextReview: next, level: levelFromInterval(interval) };
}

/**
 * The words to import: notes in the chosen decks (all when `decks` is null),
 * with fields picked per note type. Notes with no word are skipped, and the
 * same word and translation only once.
 */
export function wordsFrom(pkg: AnkiPackage, maps: Record<number, FieldMap>, decks: number[] | null, keepProgress: boolean, now = new Date()): ImportedWord[] {
    const names = new Map(pkg.decks.map(d => [d.id, d.name]));
    const want = decks ? new Set(decks) : null;
    const seen = new Set<string>();
    const out: ImportedWord[] = [];
    for (const n of pkg.notes) {
        if (want && !n.decks.some(d => want.has(d))) continue;
        const map = maps[n.noteType];
        if (!map) continue;
        const word = ankiText(n.fields[map.word] ?? '').slice(0, 200);
        if (!word) continue;
        const translation = map.translation >= 0 && map.translation !== map.word ? ankiText(n.fields[map.translation] ?? '').slice(0, 1000) : '';
        const key = `${word}\n${translation}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
            word,
            translation,
            sentence: map.sentence >= 0 ? ankiText(n.fields[map.sentence] ?? '').slice(0, 1000) : '',
            deck: names.get(want ? n.decks.find(d => want.has(d))! : n.decks[0]) ?? '',
            srs: keepProgress ? progressOf(n.card, pkg.crt, now) : null,
        });
    }
    return out;
}

// ---------------------------------------------------------------- CSV

export interface CsvWord {
    word: string;
    translation: string;
    sentence_context?: string | null;
    source_language?: string | null;
    target_language?: string | null;
    pdf_name?: string | null;
    familiarity_level?: number | null;
    next_review_date?: string | null;
    created_at?: string | null;
}

const LEVEL_NAMES: Record<number, string> = { 1: 'New', 2: 'Seen', 3: 'Learning', 4: 'Familiar', 5: 'Known' };

function csvCell(v: unknown) {
    const s = v == null ? '' : String(v);
    // Quote when needed; a leading = + - @ is prefixed so spreadsheets don't run it as a formula
    const safe = /^[=+@\t\r]|^-[\d.(]/.test(s) ? `'${s}` : s;
    return /[",\r\n]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** A CSV file (UTF-8 with a byte order mark, so Excel reads accents right). */
export function wordsCsv(words: CsvWord[]) {
    const head = ['Word', 'Translation', 'Sentence', 'Language', 'Translation language', 'Source', 'Level', 'Next review', 'Added'];
    const rows = words.map(w => [
        w.word, w.translation, w.sentence_context ?? '', w.source_language && w.source_language !== 'auto' ? w.source_language : '',
        w.target_language ?? '', w.pdf_name ?? '', LEVEL_NAMES[w.familiarity_level ?? 1] ?? '', w.next_review_date ?? '', w.created_at ?? '',
    ]);
    return '\uFEFF' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
