import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// pdf.js data files (CMaps for CJK fonts, standard fonts, image decoders,
// ICC profiles) ship with the app, so nothing is loaded from the network.
// In development Vite serves them straight from node_modules; the build
// copies them to dist/pdfjs/ (see vite.config.ts).
const ASSETS = import.meta.env.DEV ? '/node_modules/pdfjs-dist/' : './pdfjs/';
const asset = (dir: string) => new URL(`${ASSETS}${dir}/`, document.baseURI).href;

export { pdfjsLib };
export type PDFDoc = pdfjsLib.PDFDocumentProxy;

export function base64ToBytes(b64: string) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

export function openPdf(bytes: Uint8Array) {
    return pdfjsLib.getDocument({
        data: bytes,
        cMapUrl: asset('cmaps'),
        cMapPacked: true,
        standardFontDataUrl: asset('standard_fonts'),
        wasmUrl: asset('wasm'),
        iccUrl: asset('iccs'),
        // fontExtraProperties keeps each font's glyph widths and unicode map on the
        // main thread; the text layer uses them to place every word exactly.
        fontExtraProperties: true,
        // A PDF is untrusted input: don't render XFA forms (HTML built from the file).
        enableXfa: false,
    }).promise;
}
