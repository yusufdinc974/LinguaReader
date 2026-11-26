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

