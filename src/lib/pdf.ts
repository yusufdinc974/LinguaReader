import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// CMaps for CJK font support
const CMAP_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/';

export { pdfjsLib };
export type PDFDoc = pdfjsLib.PDFDocumentProxy;

export function base64ToBytes(b64: string) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

export function openDocument(base64Data: string) {
    return pdfjsLib.getDocument({ data: base64ToBytes(base64Data), cMapUrl: CMAP_URL, cMapPacked: true }).promise;
}

// ---- Library thumbnails (first page), cached for the session ----
const thumbCache = new Map<string, string | null>();
let queue: Promise<unknown> = Promise.resolve();

export function getThumbnail(path: string, width = 220): Promise<string | null> {
    if (thumbCache.has(path)) return Promise.resolve(thumbCache.get(path)!);
    // One at a time: each call reads a whole file from disk.
    const job = queue.then(async () => {
        if (thumbCache.has(path)) return thumbCache.get(path)!;
        try {
            const file = await window.electronAPI.openPdfByPath(path);
            if (!file) throw new Error('missing');
            const doc = await openDocument(file.data);
            const page = await doc.getPage(1);
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: (width * 2) / base.width });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
            const url = canvas.toDataURL('image/jpeg', 0.8);
            doc.destroy();
            thumbCache.set(path, url);
            return url;
        } catch {
            thumbCache.set(path, null);
            return null;
        }
    });
    queue = job.catch(() => { });
    return job;
}
