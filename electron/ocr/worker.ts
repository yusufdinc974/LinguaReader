// OCR utility process: runs the PaddleOCR models with onnxruntime-node, off
// the main and renderer threads. Started lazily by main (see ocrService.ts).

import fs from 'fs';
import path from 'path';
import { OcrEngine, type Ort } from './engine.ts';
import type { RgbaImage, ScriptId } from './types.ts';

interface Job {
    id: number;
    image: RgbaImage;
    script: ScriptId | 'auto';
    hint?: ScriptId;
}

const modelDir = process.argv[2];
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ort = require('onnxruntime-node') as Ort;
const engine = new OcrEngine(ort, async name => {
    if (!/^[\w.-]+$/.test(name)) throw new Error(`bad asset name ${name}`);
    return new Uint8Array(await fs.promises.readFile(path.join(modelDir, name)));
}, { executionProviders: ['cpu'], graphOptimizationLevel: 'all' });

const port = process.parentPort;
let queue: Promise<unknown> = Promise.resolve();

port.on('message', (e: { data: Job }) => {
    const job = e.data;
    // One page at a time: the models already use every core.
    queue = queue.then(async () => {
        const t = Date.now();
        try {
            const page = await engine.recognize(job.image, job.script, job.hint);
            port.postMessage({ id: job.id, page, ms: Date.now() - t });
        } catch (err) {
            port.postMessage({ id: job.id, error: String((err as Error)?.stack || err) });
        }
    });
});
