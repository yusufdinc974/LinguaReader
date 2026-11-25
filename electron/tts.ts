// Natural-sounding pronunciation with Piper (https://github.com/rhasspy/piper),
// an offline text-to-speech engine. Nothing is bundled: the engine (~20 MB)
// and each language's voice (~20-60 MB) are downloaded when the user asks for
// them, into <userData>/piper. The engine is a separate program that we run
// with the text on stdin; voices come from the rhasspy/piper-voices catalog.
//
// Windows and Linux only: the published macOS builds of the engine are
// missing their libraries, and macOS's own voices are good anyway.

import { app, ipcMain, type WebContents } from 'electron';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { unzipSync } from 'fflate';

const ENGINE_VERSION = '2023.11.14-2';
const ENGINES: Record<string, { file: string; sha256: string; exe: string }> = {
    'win32-x64': { file: 'piper_windows_amd64.zip', sha256: 'f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea', exe: 'piper.exe' },
    'linux-x64': { file: 'piper_linux_x86_64.tar.gz', sha256: 'a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992', exe: 'piper' },
};
const ENGINE_URL = (file: string) => `https://github.com/rhasspy/piper/releases/download/${ENGINE_VERSION}/${file}`;
/** Voices catalog, pinned to a release of the voices repository. */
const VOICES_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/';

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

const root = () => path.join(app.getPath('userData'), 'piper');
const engineDir = () => path.join(root(), 'engine');
const voicesDir = () => path.join(root(), 'voices');
const platformKey = () => `${process.platform}-${process.arch}`;

export const ttsSupported = () => platformKey() in ENGINES;

function engineExe() {
    const e = ENGINES[platformKey()];
    return e ? path.join(engineDir(), 'piper', e.exe) : null;
}

function engineInstalled() {
    const exe = engineExe();
    return !!exe && fs.existsSync(exe) && fs.existsSync(path.join(engineDir(), 'piper', 'espeak-ng-data'));
}

function installedVoices(): string[] {
    try {
        return fs.readdirSync(voicesDir())
            .filter(f => f.endsWith('.onnx'))
            .map(f => f.slice(0, -5))
            .filter(k => KEY.test(k) && fs.existsSync(path.join(voicesDir(), `${k}.onnx.json`)));
    } catch {
        return [];
    }
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

/** Path inside `dir` for an archive entry, or null if it would land outside. */
function safeJoin(dir: string, name: string) {
    const clean = name.replace(/\\/g, '/');
    if (!clean || clean.startsWith('/') || /^[a-zA-Z]:/.test(clean) || clean.split('/').includes('..')) return null;
    const full = path.join(dir, clean);
    return full.startsWith(dir + path.sep) ? full : null;
}

/** Minimal tar reader: regular files, folders and symlinks (the engine's .so links). */
function untar(data: Buffer, dir: string) {
    let off = 0;
    const links: [string, string][] = [];
    while (off + 512 <= data.length) {
        const header = data.subarray(off, off + 512);
        if (header.every(b => b === 0)) break;
        const str = (a: number, n: number) => header.subarray(a, a + n).toString('utf8').replace(/\0.*$/s, '');
        let name = str(0, 100);
        const prefix = str(345, 155);
        if (prefix) name = `${prefix}/${name}`;
        const size = parseInt(str(124, 12).trim() || '0', 8);
        const type = String.fromCharCode(header[156] || 48);
        const mode = parseInt(str(100, 8).trim() || '644', 8);
        off += 512;
        const target = safeJoin(dir, name);
        if (target) {
            if (type === '5') fs.mkdirSync(target, { recursive: true });
            else if (type === '0' || type === '\0' || type === '7') {
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.writeFileSync(target, data.subarray(off, off + size), { mode: mode & 0o755 });
            } else if (type === '2') {
                const linkTo = str(157, 100);
                // Only links to a file next to it (libfoo.so -> libfoo.so.1)
                if (/^[\w.+-]+$/.test(linkTo)) links.push([target, linkTo]);
            }
        }
        off += Math.ceil(size / 512) * 512;
    }
    for (const [at, to] of links) {
        try {
            fs.rmSync(at, { force: true });
            fs.symlinkSync(to, at);
        } catch {
            const src = path.join(path.dirname(at), to);
            if (fs.existsSync(src)) fs.copyFileSync(src, at);
        }
    }
}

let engineJob: Promise<void> | null = null;

function installEngine(progress: (got: number, total: number) => void) {
    engineJob ??= (async () => {
        const e = ENGINES[platformKey()];
        if (!e) throw new Error('Natural voices are not available on this system.');
        const data = await download(ENGINE_URL(e.file), progress);
        const sum = crypto.createHash('sha256').update(data).digest('hex');
        if (sum !== e.sha256) throw new Error('The voice engine download was damaged. Please try again.');
        const tmp = path.join(root(), `engine-${Date.now()}`);
        fs.mkdirSync(tmp, { recursive: true });
        try {
            if (e.file.endsWith('.zip')) {
                const files = unzipSync(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
                for (const [name, bytes] of Object.entries(files)) {
                    if (name.endsWith('/')) continue;
                    const target = safeJoin(tmp, name);
                    if (!target) continue;
                    fs.mkdirSync(path.dirname(target), { recursive: true });
                    fs.writeFileSync(target, bytes);
                }
            } else {
                untar(zlib.gunzipSync(data), tmp);
                for (const f of ['piper', 'espeak-ng', 'piper_phonemize']) {
                    const p = path.join(tmp, 'piper', f);
                    if (fs.existsSync(p)) fs.chmodSync(p, 0o755);
                }
            }
            fs.rmSync(engineDir(), { recursive: true, force: true });
            fs.renameSync(tmp, engineDir());
        } catch (err) {
            fs.rmSync(tmp, { recursive: true, force: true });
            throw err;
        }
    })().finally(() => {
        engineJob = null;
    });
    return engineJob;
}

// ---------------------------------------------------------------- catalog

let catalog: { at: number; voices: CatalogEntry[] } | null = null;

async function loadCatalog(): Promise<CatalogEntry[]> {
    if (catalog && Date.now() - catalog.at < 6 * 3600e3) return catalog.voices;
    const cacheFile = path.join(root(), 'voices.json');
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
    const voices: CatalogEntry[] = [];
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

async function installVoice(key: string, send: (p: { key: string; stage: string; got: number; total: number }) => void) {
    const entry = (await loadCatalog()).find(v => v.key === key);
    if (!entry) throw new Error('Unknown voice.');
    if (!engineInstalled()) await installEngine((got, total) => send({ key, stage: 'engine', got, total }));
    fs.mkdirSync(voicesDir(), { recursive: true });
    const total = entry.files.filter(f => f.path.endsWith('.onnx') || f.path.endsWith('.onnx.json')).reduce((a, f) => a + f.size, 0);
    let done = 0;
    for (const f of entry.files) {
        const suffix = f.path.endsWith('.onnx.json') ? '.onnx.json' : f.path.endsWith('.onnx') ? '.onnx' : null;
        if (!suffix) continue;
        const data = await download(VOICES_BASE + f.path.split('/').map(encodeURIComponent).join('/'), got => send({ key, stage: 'voice', got: done + got, total }));
        if (f.md5 && crypto.createHash('md5').update(data).digest('hex') !== f.md5) throw new Error('The voice download was damaged. Please try again.');
        done += data.length;
        // Written under the voice key (never a name from the catalog)
        const tmp = path.join(voicesDir(), `${key}${suffix}.part`);
        fs.writeFileSync(tmp, data);
        fs.renameSync(tmp, path.join(voicesDir(), `${key}${suffix}`));
    }
}

// ---------------------------------------------------------------- speaking

const cache = new Map<string, Buffer>();

/** 16-bit mono PCM → a WAV file the renderer can decode. */
function wav(pcm: Buffer, rate: number) {
    const h = Buffer.alloc(44);
    h.write('RIFF', 0);
    h.writeUInt32LE(36 + pcm.length, 4);
    h.write('WAVEfmt ', 8);
    h.writeUInt32LE(16, 16);
    h.writeUInt16LE(1, 20);
    h.writeUInt16LE(1, 22);
    h.writeUInt32LE(rate, 24);
    h.writeUInt32LE(rate * 2, 28);
    h.writeUInt16LE(2, 32);
    h.writeUInt16LE(16, 34);
    h.write('data', 36);
    h.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([h, pcm]);
}

function synthesize(key: string, text: string): Promise<Buffer> {
    const cacheKey = `${key}\n${text}`;
    const hit = cache.get(cacheKey);
    if (hit) return Promise.resolve(hit);
    const exe = engineExe();
    if (!exe || !engineInstalled()) return Promise.reject(new Error('The voice engine is not installed.'));
    if (!fs.existsSync(path.join(voicesDir(), `${key}.onnx`))) return Promise.reject(new Error('This voice is not installed.'));
    let rate = 22050;
    try {
        rate = Number(JSON.parse(fs.readFileSync(path.join(voicesDir(), `${key}.onnx.json`), 'utf8'))?.audio?.sample_rate) || rate;
    } catch { /* default rate */ }
    const dir = path.dirname(exe);

    return new Promise((resolve, reject) => {
        // Paths relative to the piper folder: the engine reads its arguments as
        // narrow strings, which can't hold a non-ASCII user name on Windows.
        const proc = spawn(exe, ['--model', `../../voices/${key}.onnx`, '--output_raw', '--espeak_data', 'espeak-ng-data', '--quiet'], {
            cwd: dir,
            env: { ...process.env, LD_LIBRARY_PATH: [dir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') },
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        const chunks: Buffer[] = [];
        let err = '';
        proc.stdout.on('data', d => chunks.push(d));
        proc.stderr.on('data', d => (err = (err + d).slice(-2000)));
        const timer = setTimeout(() => proc.kill(), 30000);
        proc.on('error', e => {
            clearTimeout(timer);
            reject(e);
        });
        proc.on('close', code => {
            clearTimeout(timer);
            const pcm = Buffer.concat(chunks);
            if (code !== 0 || pcm.length === 0) {
                reject(new Error(`The voice engine failed (${code}). ${err.trim().split('\n').pop() ?? ''}`));
                return;
            }
            const out = wav(pcm, rate);
            if (cache.size > 200) cache.delete(cache.keys().next().value!);
            cache.set(cacheKey, out);
            resolve(out);
        });
        // One line: piper reads a sentence per line
        proc.stdin.end(text.replace(/\s+/g, ' ').trim() + '\n');
    });
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
        for (const s of ['.onnx', '.onnx.json']) fs.rmSync(path.join(voicesDir(), key + s), { force: true });
        for (const k of [...cache.keys()]) if (k.startsWith(`${key}\n`)) cache.delete(k);
        return installedVoices();
    });

    ipcMain.handle('tts-speak', async (_, key: unknown, text: unknown) => {
        if (typeof key !== 'string' || !KEY.test(key) || typeof text !== 'string' || !text.trim()) throw new Error('Invalid request');
        const wav = await synthesize(key, text.slice(0, MAX_TEXT));
        return new Uint8Array(wav.buffer, wav.byteOffset, wav.byteLength);
    });
}
