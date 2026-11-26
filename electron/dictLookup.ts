// Looking a word up in a dictionary file built by scripts/build-dictionary.mjs.
// No Electron here, so it can be unit tested.

import type Database from 'better-sqlite3';
import { wordKey } from './wordKey.ts';

export interface Sense {
    g: string;
    t?: string[];
    e?: { x: string; tr?: string }[];
    y?: string[];
}

export interface DictEntry {
    word: string;
    pos: string;
    ipa?: string;
    senses: Sense[];
    synonyms?: string[];
    antonyms?: string[];
    /** Headwords this is a form of ("mangé" → ["manger"]). */
    formOf?: string[];
    /** Set when found through an inflected form: that form's tags ("past participle"). */
    viaForm?: string;
}

type Row = { id: number; word: string; data: string };

function toEntry(r: Row, viaForm?: string | null): DictEntry | null {
    try {
        const d = JSON.parse(r.data);
        return {
            word: r.word, pos: d.p ?? '', ipa: d.i, senses: Array.isArray(d.s) ? d.s : [],
            synonyms: d.y, antonyms: d.a, formOf: d.f, viaForm: viaForm ?? undefined,
        };
    } catch {
        return null;
    }
}

/** Entries for `text`: the word itself, the headword of an inflected form, and what a form-of entry points to. */
export function lookup(h: Database.Database, text: string, limit = 6): DictEntry[] {
    const k = wordKey(text);
    if (!k || k.length > 100) return [];
    const byKey = h.prepare('SELECT id, word, data FROM entries WHERE key = ? ORDER BY id LIMIT 8');
    const byForm = h.prepare('SELECT e.id, e.word, e.data, f.tags FROM forms f JOIN entries e ON e.id = f.entry WHERE f.key = ? ORDER BY e.id LIMIT 8');
    const seen = new Set<number>();
    const out: DictEntry[] = [];
    const add = (r: Row & { tags?: string | null }, via?: string | null) => {
        if (seen.has(r.id) || out.length >= limit) return;
        seen.add(r.id);
        const e = toEntry(r, via);
        if (e) out.push(e);
    };
    // Exact case first ("Pomme" the name after "pomme" the fruit only if typed so)
    const exact = byKey.all(k) as Row[];
    exact.sort((a, b) => Number(b.word === text.trim()) - Number(a.word === text.trim()));
    for (const r of exact) add(r);
    for (const r of byForm.all(k) as (Row & { tags: string | null })[]) add(r, r.tags || 'form');
    // "mangé: past participle of manger" → also show "manger"
    for (const e of [...out]) for (const lemma of e.formOf ?? []) for (const r of byKey.all(wordKey(lemma)) as Row[]) add(r);
    return out;
}


const LATIN = /\p{Script=Latin}/u;
/** IPA letters: some tables list a pronunciation as a form. */
const IPA = /[\u0250-\u02af\u02b0-\u02ff]/u;
/** Not another form of the same word: helper verbs, aspect pairs, derived words, old spellings. */
const NOT_A_FORM = /\b(auxiliary|diminutive|augmentative|noun-from-verb|romanization|historical|obsolete|archaic|dated|abbreviation)\b|^(perfective|imperfective)$/;
/**
 * Marks dictionaries add but books don't print: stress in Russian and other
 * Cyrillic languages, stress inside Italian words ("mangiàto"; a final accent
 * as in "città" is real spelling), and Arabic vowel signs.
 */
export function asPrinted(s: string, lang?: string) {
    if (/\p{Script=Cyrillic}/u.test(s)) return s.normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC');
    if (/\p{Script=Arabic}/u.test(s)) return s.replace(/[\u064b-\u065f\u0670\u0640]/g, '');
    if (lang === 'it') return s.replace(/[àèéìíòóùú](?=\p{L})/gu, c => c.normalize('NFD')[0]);
    return s;
}

/**
 * Other spellings of `text` to highlight in the reader: the inflected forms of
 * its headword ("manger" → "mangé", "mangeons"), its headword when it is a
 * form itself, and their kana readings. Multi-word forms ("avoir mangé"),
 * one-letter forms and romanizations of non-Latin words are left out.
 */
export function formsOf(h: Database.Database, text: string, lang?: string, limit = 150): string[] {
    const k = wordKey(text);
    if (!k || k.length > 100) return [];
    const ids = new Set<number>();
    const byKey = h.prepare('SELECT id, data FROM entries WHERE key = ? ORDER BY id LIMIT 6');
    const headOfForm = h.prepare("SELECT e.id, e.data FROM forms f JOIN entries e ON e.id = f.entry WHERE f.key = ? AND (f.tags IS NULL OR f.tags NOT LIKE '%auxiliary%') ORDER BY e.id LIMIT 4");
    const own = byKey.all(k) as { id: number; data: string }[];
    // A headword in its own right ("Haus") isn't also a form of something else
    // ("hausen"); only a form, or a form-of entry, looks up its headword
    const isForm = own.length === 0 || own.every(r => r.data.includes('"f":['));
    const rows = isForm ? [...own, ...(headOfForm.all(k) as { id: number; data: string }[])] : own;
    for (const r of rows) {
        ids.add(r.id);
        // A form-of entry ("mangé") brings its headword's forms along
        if (!isForm) continue;
        try {
            for (const lemma of (JSON.parse(r.data).f ?? []) as string[]) for (const x of byKey.all(wordKey(lemma)) as { id: number }[]) ids.add(x.id);
        } catch { /* bad row */ }
    }
    if (ids.size === 0) return [];
    // An alternative spelling with its own table (μιλώ → μιλάω, 学校 → 學校) brings those forms too
    const first = [...ids].slice(0, 6);
    const alts = h.prepare(`SELECT key FROM forms WHERE entry IN (${first.map(() => '?').join(',')}) AND tags LIKE '%alternative%' LIMIT 6`).all(...first) as { key: string }[];
    for (const a of alts) for (const x of byKey.all(a.key) as { id: number }[]) ids.add(x.id);
    const list = [...ids].slice(0, 10);
    const marks = list.map(() => '?').join(',');
    const keys = [
        ...(h.prepare(`SELECT key FROM entries WHERE id IN (${marks})`).all(...list) as { key: string }[]),
        ...(h.prepare(`SELECT key, tags FROM forms WHERE entry IN (${marks}) LIMIT 600`).all(...list) as { key: string; tags: string | null }[])
            .filter(r => !NOT_A_FORM.test(r.tags ?? '')),
    ].map(r => asPrinted(r.key, lang));
    const multi = k.includes(' ');
    const latin = LATIN.test(k);
    // Short kana next to a kanji word (こう for 学校 in older files) would light up everywhere
    const kanji = /\p{Script=Han}/u.test(k);
    const out = new Set<string>();
    for (const f of keys) {
        if (f === k || (!multi && f.includes(' ')) || [...f].length < 2 || (!latin && LATIN.test(f)) || /\d/.test(f) || IPA.test(f) || (kanji && [...f].length < 3 && /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(f))) continue;
        out.add(f);
        if (out.size >= limit) break;
    }
    return [...out];
}
