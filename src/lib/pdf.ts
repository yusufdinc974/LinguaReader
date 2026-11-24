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

export function openPdf(bytes: Uint8Array) {
    // fontExtraProperties keeps each font's glyph widths and unicode map on the
    // main thread; the text layer uses them to place every word exactly.
    return pdfjsLib.getDocument({ data: bytes, cMapUrl: CMAP_URL, cMapPacked: true, fontExtraProperties: true }).promise;
}
