// A document the reader can show: a PDF, a single image, or a comic archive
// (CBZ: a zip of page images). Image pages are shown as <img> (no canvas size
// limits for long webtoon strips) and read with OCR.

import { unzipSync } from 'fflate';
import { base64ToBytes, openPdf, type PDFDoc } from './pdf';

export interface ImagePageSrc {
    name: string;
    blob: Blob;
    url?: string;
    size?: { width: number; height: number };
}

interface Base {
    numPages: number;
    /** SHA-256 of the file's bytes: identifies it for the OCR cache even if renamed. */
    hash: string;
}

export interface PdfReaderDoc extends Base {
    kind: 'pdf';
    pdf: PDFDoc;
}

export interface ImageReaderDoc extends Base {
    kind: 'images';
    pages: ImagePageSrc[];
    /** Page units per image pixel (so the first page is about as wide as a book page). */
    unit: number;
}

export type ReaderDoc = PdfReaderDoc | ImageReaderDoc;

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i;
const MIME: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
    gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif',
};
/** Width the first image page is shown at, in the same units as a PDF page (1/72 in). */
const IMAGE_PAGE_WIDTH = 600;

export function isImageName(name: string) {
    return IMAGE_EXT.test(name);
}

/** File name without its extension, for titles. */
export function displayName(name: string) {
    return name.replace(/\.(pdf|cbz|zip|png|jpe?g|webp|gif|bmp|avif)$/i, '');
}

function sniff(bytes: Uint8Array): 'pdf' | 'zip' | 'image' | null {
    const head = String.fromCharCode(...bytes.subarray(0, 8));
    if (head.startsWith('%PDF') || String.fromCharCode(...bytes.subarray(0, 1024)).includes('%PDF')) return 'pdf';
    if (head.startsWith('PK\x03\x04')) return 'zip';
    if (head.startsWith('\x89PNG') || head.startsWith('\xFF\xD8\xFF') || head.startsWith('GIF8') || head.startsWith('BM')) return 'image';
    if (head.startsWith('RIFF') && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return 'image';
    if (String.fromCharCode(...bytes.subarray(4, 12)).startsWith('ftypavi')) return 'image';
    return null;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

async function sha256(bytes: Uint8Array) {
    const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export async function openReaderDoc(file: { name: string; data: string }): Promise<ReaderDoc> {
    const bytes = base64ToBytes(file.data);
    const hash = await sha256(bytes);
    const kind = sniff(bytes) ?? (isImageName(file.name) ? 'image' : 'pdf');

    if (kind === 'pdf') {
        const pdf = await openPdf(bytes);
        return { kind: 'pdf', pdf, numPages: pdf.numPages, hash };
    }

    let pages: ImagePageSrc[];
    if (kind === 'zip') {
        const entries = unzipSync(bytes, {
            filter: f => IMAGE_EXT.test(f.name) && !f.name.startsWith('__MACOSX/') && !/(^|\/)\./.test(f.name),
        });
        pages = Object.keys(entries)
            .sort(collator.compare)
            .map(name => {
                const ext = name.split('.').pop()!.toLowerCase();
                return { name, blob: new Blob([entries[name] as BlobPart], { type: MIME[ext] ?? 'application/octet-stream' }) };
            });
        if (pages.length === 0) throw new Error('This archive has no images.');
    } else {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        pages = [{ name: file.name, blob: new Blob([bytes as BlobPart], { type: MIME[ext] ?? '' }) }];
    }
    const first = await imageSize(pages[0]);
    return { kind: 'images', pages, numPages: pages.length, hash, unit: IMAGE_PAGE_WIDTH / Math.max(1, first.width) };
}

export function destroyDoc(doc: ReaderDoc | null) {
    if (!doc) return;
    if (doc.kind === 'pdf') doc.pdf.loadingTask.destroy();
    else for (const p of doc.pages) if (p.url) URL.revokeObjectURL(p.url);
}

export function imageUrl(page: ImagePageSrc) {
    page.url ??= URL.createObjectURL(page.blob);
    return page.url;
}

export async function imageSize(page: ImagePageSrc) {
    if (!page.size) {
        const bmp = await createImageBitmap(page.blob);
        page.size = { width: bmp.width, height: bmp.height };
        bmp.close();
    }
    return page.size;
}

/** Page size at scale 1, in page units. */
export async function pageSize(doc: ReaderDoc, n: number) {
    if (doc.kind === 'pdf') {
        const vp = (await doc.pdf.getPage(n)).getViewport({ scale: 1 });
        return { width: vp.width, height: vp.height };
    }
    const s = await imageSize(doc.pages[n - 1]);
    return { width: s.width * doc.unit, height: s.height * doc.unit };
}

// ---------------------------------------------------------------- OCR input
/** OCR reads best with text about 30–60 px tall; this keeps book pages near 1800 px wide. */
const OCR_WIDTH = 1800;
const OCR_MAX_PIXELS = 40e6;

/** The page as RGBA pixels for text recognition. */
export async function pageImage(doc: ReaderDoc, n: number): Promise<{ data: Uint8Array; width: number; height: number }> {
    let source: ImageBitmap | HTMLCanvasElement;
    if (doc.kind === 'pdf') {
        const page = await doc.pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        let scale = Math.min(4, OCR_WIDTH / base.width);
        if (base.width * base.height * scale * scale > OCR_MAX_PIXELS) scale = Math.sqrt(OCR_MAX_PIXELS / (base.width * base.height));
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
        source = canvas;
    } else {
        const src = doc.pages[n - 1];
        const { width, height } = await imageSize(src);
        // Very large scans are scaled down; small images are read as they are.
        let k = Math.min(1, 2600 / width);
        if (width * height * k * k > OCR_MAX_PIXELS) k = Math.sqrt(OCR_MAX_PIXELS / (width * height));
        source = await createImageBitmap(src.blob, k < 1 ? { resizeWidth: Math.round(width * k), resizeHeight: Math.round(height * k), resizeQuality: 'high' } : {});
    }
    const w = source.width, h = source.height;
    let data: Uint8ClampedArray;
    if (source instanceof HTMLCanvasElement) {
        data = source.getContext('2d')!.getImageData(0, 0, w, h).data;
    } else {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d')!;
        // Transparent pixels (PNG/WebP) read as white paper, not black
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(source, 0, 0);
        source.close();
        data = ctx.getImageData(0, 0, w, h).data;
    }
    return { data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), width: w, height: h };
}

// ---------------------------------------------------------------- thumbnails
const thumbCache = new Map<string, string | null>();
let queue: Promise<unknown> = Promise.resolve();

/** First-page thumbnail for the Library, cached for the session. */
export function getThumbnail(path: string, width = 220): Promise<string | null> {
    if (thumbCache.has(path)) return Promise.resolve(thumbCache.get(path)!);
    // One at a time: each call reads a whole file from disk.
    const job = queue.then(async () => {
        if (thumbCache.has(path)) return thumbCache.get(path)!;
        let doc: ReaderDoc | null = null;
        try {
            const file = await window.electronAPI.openPdfByPath(path);
            if (!file) throw new Error('missing');
            doc = await openReaderDoc(file);
            const canvas = document.createElement('canvas');
            if (doc.kind === 'pdf') {
                const page = await doc.pdf.getPage(1);
                const base = page.getViewport({ scale: 1 });
                const viewport = page.getViewport({ scale: (width * 2) / base.width });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
            } else {
                const src = doc.pages[0];
                const { width: w, height: h } = await imageSize(src);
                // Long strips: just the top, in the cover's proportions
                const ch = Math.min(h, Math.round(w * 1.5));
                const k = (width * 2) / w;
                const bmp = await createImageBitmap(src.blob, 0, 0, w, ch, { resizeWidth: Math.round(w * k), resizeHeight: Math.round(ch * k), resizeQuality: 'high' });
                canvas.width = bmp.width;
                canvas.height = bmp.height;
                canvas.getContext('2d')!.drawImage(bmp, 0, 0);
                bmp.close();
            }
            const url = canvas.toDataURL('image/jpeg', 0.8);
            thumbCache.set(path, url);
            return url;
        } catch {
            thumbCache.set(path, null);
            return null;
        } finally {
            destroyDoc(doc);
        }
    });
    queue = job.catch(() => { });
    return job;
}
