// Renderer side of text recognition: decides the script for a document,
// serves cached pages, and queues new pages for the OCR process one at a time.

import type { OcrPage, ScriptId } from '../../electron/ocr/types';
import { pageImage, type ReaderDoc } from './document';

export type OcrMode = 'auto' | 'always' | 'off';

/** A PDF page with fewer characters than this is treated as a scan. */
export const SCANNED_PAGE_CHARS = 25;

export function getOcrMode(): OcrMode {
    const m = localStorage.getItem('ocrMode');
    return m === 'always' || m === 'off' ? m : 'auto';
}

export function setOcrMode(mode: OcrMode) {
    localStorage.setItem('ocrMode', mode);
}

let available: Promise<boolean> | null = null;
export function ocrAvailable() {
    available ??= window.electronAPI.ocrAvailable().catch(() => false);
    return available;
}

let queue: Promise<unknown> = Promise.resolve();
const inflight = new Map<string, Promise<OcrPage>>();
/** Pages on screen (or about to be): only these are worth reading when their turn comes. */
const wanted = new Map<string, number>();

/** Marks page `n` as wanted; returns the function that releases it. */
export function holdPage(doc: ReaderDoc, n: number) {
    const key = `${doc.hash}:${n}`;
    wanted.set(key, (wanted.get(key) ?? 0) + 1);
    return () => {
        const c = (wanted.get(key) ?? 1) - 1;
        if (c <= 0) wanted.delete(key);
        else wanted.set(key, c);
    };
}

/** Recognised text of page `n`, from the cache or by running OCR on it. */
export function ocrPage(doc: ReaderDoc, n: number): Promise<OcrPage> {
    const key = `${doc.hash}:${n}`;
    const running = inflight.get(key);
    if (running) return running;

    const job = (async () => {
        // A script the reader picked is used as is; otherwise each page is checked.
        const info = await window.electronAPI.ocrGetDoc(doc.hash);
        const script: ScriptId | 'auto' = info?.chosen ? info.script : 'auto';
        const cached = await window.electronAPI.ocrCached(doc.hash, n, script);
        if (cached) return cached;
        // One page at a time; a page that is no longer shown when its turn comes is skipped.
        const run = queue.then(async () => {
            if (!wanted.has(key)) throw new Error('cancelled');
            const image = await pageImage(doc, n);
            return window.electronAPI.ocrRecognize(doc.hash, n, script, image);
        });
        queue = run.catch(() => { });
        return run;
    })();
    inflight.set(key, job);
    job.finally(() => inflight.delete(key)).catch(() => { });
    return job;
}

export function isCancelled(err: unknown) {
    return (err as Error)?.message === 'cancelled';
}
