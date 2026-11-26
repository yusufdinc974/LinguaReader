// Offline dictionaries: definitions, examples and synonyms from Wiktionary
// (via kaikki.org), one SQLite file per language, downloaded when the user
// asks for it into <userData>/dictionaries. The files are built by
// scripts/build-dictionary.mjs and published as assets of the
// "dictionaries-1" release of this repository, with a manifest that pins
// each file's SHA-256.

import { app, ipcMain, type WebContents } from 'electron';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';
import { lookup } from './dictLookup.ts';
export type { DictEntry, Sense } from './dictLookup.ts';

const RELEASE = 'https://github.com/yusufdinc974/LinguaReader/releases/download/dictionaries-1/';
const SCHEMA = 1;
const LANG = /^[a-z]{2,3}$/;

export interface DictionaryInfo {
    lang: string;
    file: string;
    bytes: number;
    sha256: string;
    entries: number;
}

const dir = () => path.join(app.getPath('userData'), 'dictionaries');
const fileFor = (lang: string) => path.join(dir(), `${lang}.db`);

function installed(): string[] {
    try {
        return fs.readdirSync(dir()).filter(f => /^[a-z]{2,3}\.db$/.test(f)).map(f => f.slice(0, -3));
    } catch {
        return [];
    }
}

let manifest: { at: number; list: DictionaryInfo[] } | null = null;

async function loadManifest(): Promise<DictionaryInfo[]> {
    if (manifest && Date.now() - manifest.at < 3600e3) return manifest.list;
    const res = await fetch(`${RELEASE}dictionaries.json`, { redirect: 'follow' });
    if (!res.ok) throw new Error(res.status === 404 ? 'No dictionaries are published yet.' : `Could not load the list of dictionaries (${res.status}).`);
    const raw = await res.json();
    const list: DictionaryInfo[] = (Array.isArray(raw?.dictionaries) ? raw.dictionaries : [])
        .filter((d: any) => LANG.test(d?.lang) && typeof d?.file === 'string' && /^[a-z]{2,3}\.db\.gz$/.test(d.file) && /^[0-9a-f]{64}$/.test(d?.sha256))
        .map((d: any) => ({ lang: d.lang, file: d.file, bytes: Number(d.bytes) || 0, sha256: d.sha256, entries: Number(d.entries) || 0 }));
    manifest = { at: Date.now(), list };
    return list;
}

const open = new Map<string, Database.Database>();

function handle(lang: string) {
    let h = open.get(lang);
    if (h) return h;
    const f = fileFor(lang);
    if (!fs.existsSync(f)) return null;
    h = new Database(f, { readonly: true, fileMustExist: true });
    open.set(lang, h);
    return h;
}

function closeDict(lang: string) {
    open.get(lang)?.close();
    open.delete(lang);
}

const jobs = new Map<string, Promise<void>>();

async function install(lang: string, send: (p: { lang: string; got: number; total: number }) => void) {
    const info = (await loadManifest()).find(d => d.lang === lang);
    if (!info) throw new Error('There is no dictionary for this language yet.');
    fs.mkdirSync(dir(), { recursive: true });
    const res = await fetch(RELEASE + info.file, { redirect: 'follow' });
    if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
    const total = Number(res.headers.get('content-length')) || info.bytes;
    const hash = crypto.createHash('sha256');
    let got = 0;
    let last = 0;
    const part = `${fileFor(lang)}.part`;
    const counter = new Transform({
        transform(chunk, _enc, cb) {
            hash.update(chunk);
            got += chunk.length;
            if (got - last > 256 * 1024 || got === total) {
                last = got;
                send({ lang, got, total });
            }
            cb(null, chunk);
        },
    });
    try {
        await pipeline(Readable.fromWeb(res.body as any), counter, zlib.createGunzip(), fs.createWriteStream(part));
        if (hash.digest('hex') !== info.sha256) throw new Error('The dictionary download was damaged. Please try again.');
        // Check it before it replaces anything
        const test = new Database(part, { readonly: true, fileMustExist: true });
        try {
            const schema = (test.prepare("SELECT v FROM meta WHERE k = 'schema'").get() as { v: string } | undefined)?.v;
            if (Number(schema) !== SCHEMA) throw new Error('This dictionary needs a newer version of LinguaReader.');
        } finally {
            test.close();
        }
        closeDict(lang);
        fs.renameSync(part, fileFor(lang));
    } catch (err) {
        fs.rmSync(part, { force: true });
        throw err;
    }
}

export function setupDictionary() {
    ipcMain.handle('dict-status', () => installed());

    ipcMain.handle('dict-available', async () => loadManifest());

    ipcMain.handle('dict-install', async (event, lang: unknown) => {
        if (typeof lang !== 'string' || !LANG.test(lang)) throw new Error('Invalid language');
        const wc: WebContents = event.sender;
        let job = jobs.get(lang);
        if (!job) {
            job = install(lang, p => !wc.isDestroyed() && wc.send('dict-progress', p)).finally(() => jobs.delete(lang));
            jobs.set(lang, job);
        }
        await job;
        return installed();
    });

    ipcMain.handle('dict-remove', (_, lang: unknown) => {
        if (typeof lang !== 'string' || !LANG.test(lang)) return installed();
        closeDict(lang);
        fs.rmSync(fileFor(lang), { force: true });
        return installed();
    });

    ipcMain.handle('dict-lookup', (_, lang: unknown, text: unknown) => {
        if (typeof lang !== 'string' || !LANG.test(lang) || typeof text !== 'string') return null;
        const h = handle(lang);
        if (!h) return null;
        try {
            return lookup(h, text);
        } catch (err) {
            console.error('[dictionary] lookup failed:', err);
            return [];
        }
    });

    app.on('will-quit', () => {
        for (const lang of [...open.keys()]) closeDict(lang);
    });
}
