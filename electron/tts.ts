// Natural-sounding pronunciation, offline. Nothing is bundled: the voice
// engine and each voice are downloaded when the user asks for them, into
// <userData>/piper.
//
// The engine is sherpa-onnx (https://github.com/k2-fsa/sherpa-onnx, Apache
// 2.0), from its npm builds for Windows, macOS and Linux. It runs in a
// utility process (ttsWorker.ts). It reads two kinds of voice:
// - Piper voices (rhasspy/piper-voices on Hugging Face), one file per
//   language and speaker, read with espeak-ng's pronunciation data.
// - Kokoro (hexgrad/Kokoro-82M, Apache 2.0) for English and Chinese: one
//   shared 130 MB model with several speakers.
// Version 1.13 of the engine, because 2.x dropped espeak-ng, which Piper
// voices need.

import { app, ipcMain, utilityProcess, type UtilityProcess, type WebContents } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ENGINE_VERSION = '1.13.8';
/** npm package of the engine's build for each system, with its pinned SHA-512. */
const ENGINES: Record<string, { pkg: string; sha512: string }> = {
    'win32-x64': { pkg: 'win-x64', sha512: 'oZF1c9VPOKtMwn83Bboc5XSWL+76BRoyB3eUuVnCknBKxwSULZU2Foia9VHWzU+n4I12rPsP6z6H9Rp1hD9o8g==' },
    'win32-arm64': { pkg: 'win-arm64', sha512: 'IfdKVT7tT5xAnlBqNkc70amt+bbn2Wkg0v3hwzKZIIyzlsWIUT0U1eQ+90pE8U4CR0SxVAN1kCmv7dmmQ4o0Qg==' },
    'linux-x64': { pkg: 'linux-x64', sha512: '6plnhjagsSeTntCgnlag86hWbs/uZE9Crms1LgOb68/1nKsIQjMd+WG519m+aPwT6TrsBOiEMzrx41t8sL5L5g==' },
    'linux-arm64': { pkg: 'linux-arm64', sha512: 'Tlg7a70b/Wge3OF8IgTHF9jhSVCsLyKQKhwc4BsJ5A+dL/SrFtGBjzuHp4XeLhiiOT7afCxX5PdSn/D4c8Lnuw==' },
    'darwin-x64': { pkg: 'darwin-x64', sha512: '7BLRpjM6w4f9W46/nmkmq8lEKUayhebvcpslCVQ+6QN2uReYlZEMDZlSpXMjme+hUFrPfRz8P3UNq8ep/4d19g==' },
    'darwin-arm64': { pkg: 'darwin-arm64', sha512: 'FPNgJMgnWVl/KhRTIhG3KL3A4Om63Rn4YKXc9/uHY7SzLcvqLJLc/h7UBWJwduXvv7K18t5NpxHR6XgXn4sjWw==' },
};
const ENGINE_URL = (pkg: string) => `https://registry.npmjs.org/sherpa-onnx-${pkg}/-/sherpa-onnx-${pkg}-${ENGINE_VERSION}.tgz`;
const MODELS = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/';
/** espeak-ng's pronunciation data, for Piper voices. */
const ESPEAK = { file: 'espeak-ng-data.tar.bz2', sha256: '4135ccf82e1f40613491c0874d4945ae9e9c7840933d8e25a6f9e003d9ebf533' };
const KOKORO = { file: 'kokoro-int8-multi-lang-v1_0.tar.bz2', sha256: '72c347230107ef8a31098ec4d468a605244beef5f1ed00db97efa13518800653', bytes: 132353410 };
/** Voices catalog, pinned to a release of the voices repository. */
const VOICES_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/';

/** Kokoro speakers we offer (id = position in the model's speaker list). */
const KOKORO_SPEAKERS: { key: string; sid: number; name: string; country: string }[] = [
    { key: 'en_US-kokoro_heart-high', sid: 3, name: 'Kokoro Heart', country: 'United States' },
    { key: 'en_US-kokoro_bella-high', sid: 2, name: 'Kokoro Bella', country: 'United States' },
    { key: 'en_US-kokoro_michael-high', sid: 16, name: 'Kokoro Michael', country: 'United States' },
    { key: 'en_GB-kokoro_emma-high', sid: 21, name: 'Kokoro Emma', country: 'Great Britain' },
    { key: 'en_GB-kokoro_george-high', sid: 26, name: 'Kokoro George', country: 'Great Britain' },
    { key: 'zh_CN-kokoro_xiaoxiao-high', sid: 47, name: 'Kokoro Xiaoxiao', country: 'China' },
    { key: 'zh_CN-kokoro_xiaoyi-high', sid: 48, name: 'Kokoro Xiaoyi', country: 'China' },
    { key: 'zh_CN-kokoro_yunxi-high', sid: 50, name: 'Kokoro Yunxi', country: 'China' },
    { key: 'zh_CN-kokoro_yunjian-high', sid: 49, name: 'Kokoro Yunjian', country: 'China' },
];
const isKokoro = (key: string) => KOKORO_SPEAKERS.some(s => s.key === key);

const KEY = /^[a-z]{2,3}_[A-Z]{2}-[A-Za-z0-9_]+-(x_low|low|medium|high)$/;
const FILE = /^[a-z]{2,3}\/[a-z]{2,3}_[A-Z]{2}\/[A-Za-z0-9_]+\/(x_low|low|medium|high)\/[A-Za-z0-9_-]+\.onnx(\.json)?$/;
const MAX_TEXT = 400;

export interface CatalogVoice {
    key: string;
    /** Language code as the catalog writes it, e.g. fr_FR. */
    code: string;
    /** Language family, e.g. fr. */
    family: string;
    language: string;
    country: string;
    name: string;
    quality: string;
    sizeBytes: number;
}

interface CatalogEntry extends CatalogVoice {
    files: { path: string; md5: string; size: number }[];
}

// Everything lives under one folder, the worker's working directory, so the
// engine only ever sees short relative paths (it can't open non-ASCII paths
// on Windows).
const root = () => path.join(app.getPath('userData'), 'piper');
const ENGINE_DIR = 'sherpa';
const ESPEAK_DIR = 'espeak-ng-data';
const VOICES_DIR = 'voices';
const KOKORO_DIR = 'kokoro';
const KOKORO_CHOSEN = path.join(KOKORO_DIR, 'chosen.json');
const at = (...p: string[]) => path.join(root(), ...p);
const platformKey = () => `${process.platform}-${process.arch}`;

export const ttsSupported = () => platformKey() in ENGINES;

function engineInstalled() {
    return fs.existsSync(at(ENGINE_DIR, 'sherpa-onnx.node')) && fs.existsSync(at(ESPEAK_DIR, 'phontab'));
}

function kokoroInstalled() {
    return fs.existsSync(at(KOKORO_DIR, 'model.int8.onnx')) && fs.existsSync(at(KOKORO_DIR, 'voices.bin'));
}

function kokoroChosen(): string[] {
    try {
        const list = JSON.parse(fs.readFileSync(at(KOKORO_CHOSEN), 'utf8'));
        return Array.isArray(list) ? list.filter(isKokoro) : [];
    } catch {
        return [];
    }
}

function setKokoroChosen(keys: string[]) {
    fs.writeFileSync(at(KOKORO_CHOSEN), JSON.stringify([...new Set(keys)]));
}

function installedVoices(): string[] {
    let piper: string[] = [];
    try {
        piper = fs.readdirSync(at(VOICES_DIR))
            .filter(f => f.endsWith('.onnx'))
            .map(f => f.slice(0, -5))
            .filter(k => KEY.test(k) && fs.existsSync(at(VOICES_DIR, `${k}.onnx.json`)));
    } catch { /* none */ }
    return [...piper, ...(kokoroInstalled() ? kokoroChosen() : [])];
}

// ---------------------------------------------------------------- worker

let worker: UtilityProcess | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

function getWorker() {
    if (worker) return worker;
    fs.mkdirSync(root(), { recursive: true });
    const w = utilityProcess.fork(path.join(__dirname, 'ttsWorker.js'), [], { cwd: root(), serviceName: 'LinguaReader voices', stdio: 'pipe' });
    w.stdout?.on('data', d => console.log('[tts-worker]', String(d).trim()));
    w.stderr?.on('data', d => console.warn('[tts-worker]', String(d).trim()));
    w.on('message', (m: { id: number; ok: boolean; result?: any; error?: string }) => {
        const p = pending.get(m.id);
        if (!p) return;
        pending.delete(m.id);
        if (m.ok) p.resolve(m.result);
        else p.reject(new Error(m.error));
    });
    w.on('exit', code => {
        if (worker === w) worker = null;
        for (const [id, p] of pending) {
            p.reject(new Error(`The voice engine stopped (${code}).`));
            pending.delete(id);
        }
    });
    worker = w;
    return w;
}

function ask<T>(msg: object, timeoutMs = 60000): Promise<T> {
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error('The voice engine took too long.'));
            worker?.kill();
        }, timeoutMs);
        pending.set(id, {
            resolve: v => {
                clearTimeout(timer);
                resolve(v);
            },
            reject: e => {
                clearTimeout(timer);
                reject(e);
            },
        });
        getWorker().postMessage({ id, ...msg });
    });
}

// ---------------------------------------------------------------- downloads

async function download(url: string, onProgress: (got: number, total: number) => void): Promise<Buffer> {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
    const total = Number(res.headers.get('content-length')) || 0;
    const chunks: Buffer[] = [];
    let got = 0;
    const reader = res.body.getReader();
    for (; ;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
        got += value.byteLength;
        onProgress(got, total);
    }
    return Buffer.concat(chunks);
}

/** Downloads an archive, checks it, and unpacks it (in the worker) into `dir`, replacing what was there. */
async function installArchive(url: string, check: (data: Buffer) => boolean, kind: 'tgz' | 'tbz2', dir: string, strip: number, progress: (got: number, total: number) => void) {
    const data = await download(url, progress);
    if (!check(data)) throw new Error('The download was damaged. Please try again.');
    const stamp = Date.now();
    const file = `${dir}-${stamp}.download`;
    const tmp = `${dir}-${stamp}.part`;
    fs.writeFileSync(at(file), data);
    try {
        await ask({ op: 'extract', archive: file, dest: tmp, kind, strip }, 10 * 60000);
        fs.rmSync(at(dir), { recursive: true, force: true });
        fs.renameSync(at(tmp), at(dir));
    } finally {
        fs.rmSync(at(file), { force: true });
        fs.rmSync(at(tmp), { recursive: true, force: true });
    }
}

const sha = (alg: string, data: Buffer, enc: 'hex' | 'base64') => crypto.createHash(alg).update(data).digest(enc);

let engineJob: Promise<void> | null = null;

function installEngine(progress: (got: number, total: number) => void) {
    engineJob ??= (async () => {
        const e = ENGINES[platformKey()];
        if (!e) throw new Error('Natural voices are not available on this system.');
        // The engine can't be replaced while it's loaded
        worker?.kill();
        worker = null;
        fs.mkdirSync(root(), { recursive: true });
        const espeakSize = 7252012;
        if (!fs.existsSync(at(ENGINE_DIR, 'sherpa-onnx.node'))) {
            await installArchive(ENGINE_URL(e.pkg), d => sha('sha512', d, 'base64') === e.sha512, 'tgz', ENGINE_DIR, 1, (got, total) => progress(got, total + espeakSize));
        }
        if (!fs.existsSync(at(ESPEAK_DIR, 'phontab'))) {
            await installArchive(MODELS + ESPEAK.file, d => sha('sha256', d, 'hex') === ESPEAK.sha256, 'tbz2', ESPEAK_DIR, 1, (got, total) => progress(got, total));
        }
        // The old Piper program (before sherpa-onnx) isn't used any more
        fs.rmSync(at('engine'), { recursive: true, force: true });
    })().finally(() => {
        engineJob = null;
    });
    return engineJob;
}

// ---------------------------------------------------------------- catalog

let catalog: { at: number; voices: CatalogEntry[] } | null = null;

const KOKORO_ENTRIES: CatalogEntry[] = KOKORO_SPEAKERS.map(s => ({
    key: s.key,
    code: s.key.split('-')[0],
    family: s.key.slice(0, 2),
    language: s.key.startsWith('zh') ? 'Chinese' : 'English',
    country: s.country,
    name: s.name,
    quality: 'high',
    sizeBytes: KOKORO.bytes,
    files: [],
}));

async function loadCatalog(): Promise<CatalogEntry[]> {
    if (catalog && Date.now() - catalog.at < 6 * 3600e3) return catalog.voices;
    const cacheFile = at('voices.json');
    let raw: unknown;
    try {
        const res = await fetch(`${VOICES_BASE}voices.json`);
        if (!res.ok) throw new Error(String(res.status));
        raw = await res.json();
        fs.mkdirSync(root(), { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(raw));
    } catch (err) {
        // Offline: the last catalog we saw, if any
        if (!fs.existsSync(cacheFile)) throw new Error('Could not load the list of voices. Are you online?');
        raw = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        console.warn('[tts] using cached voice list:', (err as Error).message);
    }
    const voices: CatalogEntry[] = [...KOKORO_ENTRIES];
    for (const [key, v] of Object.entries(raw as Record<string, any>)) {
        if (!KEY.test(key) || typeof v !== 'object' || !v) continue;
        const files = Object.entries((v.files ?? {}) as Record<string, { size_bytes?: number; md5_digest?: string }>)
            .filter(([p]) => FILE.test(p))
            .map(([p, f]) => ({ path: p, md5: String(f.md5_digest ?? ''), size: Number(f.size_bytes) || 0 }));
        if (!files.some(f => f.path.endsWith('.onnx')) || !files.some(f => f.path.endsWith('.onnx.json'))) continue;
        const text = (s: unknown) => (typeof s === 'string' ? s.slice(0, 80) : '');
        voices.push({
            key,
            code: text(v.language?.code) || key.split('-')[0],
            family: text(v.language?.family) || key.slice(0, 2),
            language: text(v.language?.name_english),
            country: text(v.language?.country_english),
            name: text(v.name),
            quality: text(v.quality),
            sizeBytes: files.reduce((a, f) => a + f.size, 0),
            files,
        });
    }
    catalog = { at: Date.now(), voices };
    return voices;
}

const voiceJobs = new Map<string, Promise<void>>();
let kokoroJob: Promise<void> | null = null;

/** Piper voices need a tokens file (phoneme → id), made from the voice's own settings. */
function writeTokens(key: string) {
    const file = at(VOICES_DIR, `${key}.tokens.txt`);
    if (fs.existsSync(file)) return;
    const cfg = JSON.parse(fs.readFileSync(at(VOICES_DIR, `${key}.onnx.json`), 'utf8'));
    const map = cfg?.phoneme_id_map;
    if (!map || typeof map !== 'object') throw new Error('This voice has no phoneme table.');
    const lines = Object.entries(map as Record<string, number[]>)
        .filter(([sym, ids]) => Array.isArray(ids) && Number.isInteger(ids[0]) && !/[\r\n]/.test(sym))
        .map(([sym, ids]) => `${sym} ${ids[0]}`);
    fs.writeFileSync(file, lines.join('\n') + '\n');
}

async function installVoice(key: string, send: (p: { key: string; stage: string; got: number; total: number }) => void) {
    if (!engineInstalled()) await installEngine((got, total) => send({ key, stage: 'engine', got, total }));
    if (isKokoro(key)) {
        if (!kokoroInstalled()) {
            kokoroJob ??= installArchive(MODELS + KOKORO.file, d => sha('sha256', d, 'hex') === KOKORO.sha256, 'tbz2', KOKORO_DIR, 1, (got, total) => send({ key, stage: 'voice', got, total: total || KOKORO.bytes }))
                .finally(() => (kokoroJob = null));
            await kokoroJob;
        }
        setKokoroChosen([...kokoroChosen(), key]);
        return;
    }
    const entry = (await loadCatalog()).find(v => v.key === key);
    if (!entry) throw new Error('Unknown voice.');
    fs.mkdirSync(at(VOICES_DIR), { recursive: true });
    const total = entry.files.filter(f => f.path.endsWith('.onnx') || f.path.endsWith('.onnx.json')).reduce((a, f) => a + f.size, 0);
    let done = 0;
    for (const f of entry.files) {
        const suffix = f.path.endsWith('.onnx.json') ? '.onnx.json' : f.path.endsWith('.onnx') ? '.onnx' : null;
        if (!suffix) continue;
        const data = await download(VOICES_BASE + f.path.split('/').map(encodeURIComponent).join('/'), got => send({ key, stage: 'voice', got: done + got, total }));
        if (f.md5 && sha('md5', data, 'hex') !== f.md5) throw new Error('The voice download was damaged. Please try again.');
        done += data.length;
        // Written under the voice key (never a name from the catalog)
        const tmp = at(VOICES_DIR, `${key}${suffix}.part`);
        fs.writeFileSync(tmp, data);
        fs.renameSync(tmp, at(VOICES_DIR, `${key}${suffix}`));
    }
    fs.rmSync(at(VOICES_DIR, `${key}.tokens.txt`), { force: true });
    writeTokens(key);
}

function removeVoice(key: string) {
    if (isKokoro(key)) {
        const rest = kokoroChosen().filter(k => k !== key);
        if (rest.length === 0) {
            // Last Kokoro voice: the shared model goes too
            worker?.kill();
            worker = null;
            fs.rmSync(at(KOKORO_DIR), { recursive: true, force: true });
        } else setKokoroChosen(rest);
        return;
    }
    for (const s of ['.onnx', '.onnx.json', '.tokens.txt']) fs.rmSync(at(VOICES_DIR, key + s), { force: true });
}

// ---------------------------------------------------------------- speaking

const cache = new Map<string, Buffer>();

function voiceConfig(key: string): { config: object; sid: number } {
    const base = { numThreads: 2, provider: 'cpu', debug: 0 };
    const k = KOKORO_SPEAKERS.find(s => s.key === key);
    if (k) {
        if (!kokoroInstalled()) throw new Error('This voice is not installed.');
        const d = (f: string) => `${KOKORO_DIR}/${f}`;
        const lexicons = key.startsWith('en_GB') ? ['lexicon-gb-en.txt', 'lexicon-zh.txt'] : ['lexicon-us-en.txt', 'lexicon-zh.txt'];
        return {
            sid: k.sid,
            config: {
                model: {
                    kokoro: {
                        model: d('model.int8.onnx'), voices: d('voices.bin'), tokens: d('tokens.txt'),
                        dataDir: d('espeak-ng-data'), dictDir: d('dict'), lexicon: lexicons.map(d).join(','),
                    },
                    ...base,
                },
                ruleFsts: key.startsWith('zh') ? ['date-zh.fst', 'phone-zh.fst', 'number-zh.fst'].map(d).join(',') : '',
                maxNumSentences: 1,
            },
        };
    }
    if (!fs.existsSync(at(VOICES_DIR, `${key}.onnx`))) throw new Error('This voice is not installed.');
    writeTokens(key);
    return {
        sid: 0,
        config: {
            model: { vits: { model: `${VOICES_DIR}/${key}.onnx`, tokens: `${VOICES_DIR}/${key}.tokens.txt`, dataDir: ESPEAK_DIR }, ...base },
            maxNumSentences: 1,
        },
    };
}

async function synthesize(key: string, text: string): Promise<Buffer> {
    const cacheKey = `${key}\n${text}`;
    const hit = cache.get(cacheKey);
    if (hit) return hit;
    // Voices installed before the engine changed: fetch the new engine once
    if (!engineInstalled()) await installEngine(() => { });
    const { config, sid } = voiceConfig(key);
    const out = Buffer.from(await ask<Uint8Array>({ op: 'speak', engine: ENGINE_DIR, config, text: text.replace(/\s+/g, ' ').trim(), sid, speed: 1 }, 30000));
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, out);
    return out;
}

// ---------------------------------------------------------------- IPC

export function setupTts() {
    ipcMain.handle('tts-status', () => ({
        supported: ttsSupported(),
        engine: engineInstalled(),
        voices: installedVoices(),
    }));

    ipcMain.handle('tts-catalog', async (): Promise<CatalogVoice[]> => {
        if (!ttsSupported()) return [];
        return (await loadCatalog()).map(({ files: _files, ...v }) => v);
    });

    ipcMain.handle('tts-install', async (event, key: unknown) => {
        if (typeof key !== 'string' || !KEY.test(key)) throw new Error('Invalid voice');
        if (!ttsSupported()) throw new Error('Natural voices are not available on this system.');
        const wc: WebContents = event.sender;
        const send = (p: object) => !wc.isDestroyed() && wc.send('tts-progress', p);
        let job = voiceJobs.get(key);
        if (!job) {
            job = installVoice(key, send).finally(() => voiceJobs.delete(key));
            voiceJobs.set(key, job);
        }
        await job;
        return installedVoices();
    });

    ipcMain.handle('tts-remove', (_, key: unknown) => {
        if (typeof key !== 'string' || !KEY.test(key)) return installedVoices();
        removeVoice(key);
        for (const k of [...cache.keys()]) if (k.startsWith(`${key}\n`)) cache.delete(k);
        return installedVoices();
    });

    ipcMain.handle('tts-speak', async (_, key: unknown, text: unknown) => {
        if (typeof key !== 'string' || !KEY.test(key) || typeof text !== 'string' || !text.trim()) throw new Error('Invalid request');
        const wav = await synthesize(key, text.slice(0, MAX_TEXT));
        return new Uint8Array(wav.buffer, wav.byteOffset, wav.byteLength);
    });

    app.on('will-quit', () => worker?.kill());
}
