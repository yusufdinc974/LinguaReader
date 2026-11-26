// The voice engine (sherpa-onnx) runs here, in a utility process of its own,
// so that its onnxruntime library can't clash with the one OCR uses, a crash
// can't take the app down, and unpacking or speaking never blocks the window.
// Started by tts.ts; paths in messages are relative to the voices folder,
// which is this process's working directory.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { untar } from './tar.ts';

type Msg =
    | { id: number; op: 'extract'; archive: string; dest: string; kind: 'tgz' | 'tbz2'; strip: number }
    | { id: number; op: 'speak'; engine: string; config: object; text: string; sid: number; speed: number };

interface Addon {
    createOfflineTts(config: object): unknown;
    offlineTtsGenerate(handle: unknown, req: { text: string; sid: number; speed: number; enableExternalBuffer?: boolean }): { samples: Float32Array; sampleRate: number };
}

let addon: Addon | null = null;
const engines = new Map<string, unknown>();

function load(engine: string) {
    // Windows looks for the engine's DLLs on PATH as well as next to it
    if (process.platform === 'win32') process.env.PATH = `${path.resolve(engine)};${process.env.PATH ?? ''}`;
    addon ??= require(path.resolve(engine, 'sherpa-onnx.node')) as Addon;
    return addon;
}

/** Float samples → a 16-bit mono WAV file the renderer can decode. */
function wav(samples: Float32Array, rate: number) {
    const pcm = Buffer.alloc(samples.length * 2);
    for (let i = 0; i < samples.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
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

function handle(msg: Msg) {
    if (msg.op === 'extract') {
        const data = fs.readFileSync(msg.archive);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const tar = msg.kind === 'tgz' ? zlib.gunzipSync(data) : (require('seek-bzip').decode(data) as Buffer);
        fs.mkdirSync(msg.dest, { recursive: true });
        untar(tar, path.resolve(msg.dest), msg.strip);
        return null;
    }
    const a = load(msg.engine);
    const key = JSON.stringify(msg.config);
    let tts = engines.get(key);
    if (!tts) {
        tts = a.createOfflineTts(msg.config);
        // Keep the last few voices loaded
        if (engines.size >= 3) engines.delete(engines.keys().next().value!);
        engines.set(key, tts);
    }
    const out = a.offlineTtsGenerate(tts, { text: msg.text, sid: msg.sid, speed: msg.speed, enableExternalBuffer: false });
    if (!out?.samples?.length) throw new Error('The voice engine made no sound.');
    return wav(out.samples, out.sampleRate);
}

process.parentPort.on('message', e => {
    const msg = e.data as Msg;
    try {
        const result = handle(msg);
        process.parentPort.postMessage({ id: msg.id, ok: true, result });
    } catch (err) {
        process.parentPort.postMessage({ id: msg.id, ok: false, error: String((err as Error)?.message ?? err) });
    }
});
