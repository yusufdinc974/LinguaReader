import { useEffect, useRef, useState } from 'react';
import { Loader2, ScanText } from 'lucide-react';
import type { OcrPage } from '../../electron/ocr/types';
import { imageSize, imageUrl, pageSize, type ReaderDoc } from '../lib/document';
import type { PDFDoc } from '../lib/pdf';
import type { Highlighter } from '../lib/highlight';
import { renderTextLayer } from '../lib/textLayer';
import { renderOcrLayer } from '../lib/ocrLayer';
import { holdPage, isCancelled, ocrAvailable, ocrPage, SCANNED_PAGE_CHARS, type OcrMode } from '../lib/ocr';

type PDFPage = Awaited<ReturnType<PDFDoc['getPage']>>;

interface Props {
    doc: ReaderDoc;
    pageNum: number;
    scale: number;
    highlighter: Highlighter;
    ocrMode: OcrMode;
    /** Bumped when the document's OCR script changes, to read the page again. */
    ocrVersion: number;
    /** Only render when near the viewport (continuous scrolling). */
    lazy?: boolean;
    /** No shadow or gap: pages join into one strip. */
    seamless?: boolean;
}

type OcrState = { status: 'idle' | 'running' | 'error'; page?: undefined; error?: string } | { status: 'done'; page: OcrPage };

/** One page: the picture (PDF canvas or image) plus a selectable, highlighted text layer. */
export default function PageView({ doc, pageNum, scale, highlighter, ocrMode, ocrVersion, lazy, seamless }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    const [visible, setVisible] = useState(!lazy);
    // Set once the picture for (doc, page, scale) is drawn; the PDF text layer
    // needs the fonts that drawing loads.
    const [rendered, setRendered] = useState<{ page: PDFPage | null; scale: number } | null>(null);
    const [pdfChars, setPdfChars] = useState<number | null>(null);
    const [ocr, setOcr] = useState<OcrState>({ status: 'idle' });

    // Page size first, so lazy pages hold their place
    useEffect(() => {
        let alive = true;
        pageSize(doc, pageNum).then(s => alive && setSize({ width: s.width * scale, height: s.height * scale })).catch(() => { });
        return () => {
            alive = false;
        };
    }, [doc, pageNum, scale]);

    useEffect(() => {
        if (!lazy) return setVisible(true);
        const el = wrapRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '1500px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, [lazy]);

    // Reset per page
    useEffect(() => {
        setPdfChars(null);
        setOcr({ status: 'idle' });
    }, [doc, pageNum]);

    // Picture: only when the page or zoom changes (not when highlights change)
    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
        setRendered(null);

        (async () => {
            try {
                if (doc.kind === 'images') {
                    await imageSize(doc.pages[pageNum - 1]);
                    if (!cancelled) setRendered({ page: null, scale });
                    return;
                }
                const page = await doc.pdf.getPage(pageNum);
                if (cancelled) return;
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                if (!canvas) return;
                const dpr = window.devicePixelRatio || 1;
                canvas.width = Math.floor(viewport.width * dpr);
                canvas.height = Math.floor(viewport.height * dpr);
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                task = page.render({ canvas, canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
                await task.promise;
                task = null;
                if (!cancelled) setRendered({ page, scale });
            } catch (err: any) {
                // Cancelled, or the document was closed while this page was drawing
                if (err?.name !== 'RenderingCancelledException' && !/Transport destroyed/.test(err?.message)) console.error('Page render failed:', err);
            }
        })();

        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [doc, pageNum, scale, visible]);

    // Does this page need OCR?
    const needOcr = ocrMode !== 'off' && (doc.kind === 'images' || ocrMode === 'always' || (pdfChars !== null && pdfChars < SCANNED_PAGE_CHARS));

    useEffect(() => {
        if (!needOcr || !visible) return;
        let alive = true;
        const release = holdPage(doc, pageNum);
        (async () => {
            if (!(await ocrAvailable())) {
                if (alive) setOcr({ status: 'error', error: 'Text recognition models are not installed.' });
                return;
            }
            setOcr(s => (s.status === 'done' ? s : { status: 'running' }));
            try {
                const page = await ocrPage(doc, pageNum);
                if (alive) setOcr({ status: 'done', page });
            } catch (err) {
                if (!alive || isCancelled(err)) return;
                console.error('OCR failed:', err);
                setOcr({ status: 'error', error: String((err as Error)?.message ?? err) });
            }
        })();
        return () => {
            alive = false;
            release();
        };
    }, [doc, pageNum, needOcr, visible, ocrVersion]);

    // Text layer: after the picture, and again whenever highlights or OCR results change
    useEffect(() => {
        const layer = textRef.current;
        if (!rendered || !layer || !size) return;
        let cancelled = false;
        layer.replaceChildren();
        layer.className = 'pdf-text-layer';
        layer.style.width = `${size.width}px`;
        layer.style.height = `${size.height}px`;
        if (needOcr && ocr.status === 'done') {
            renderOcrLayer(layer, ocr.page, size.width, highlighter);
        } else if (rendered.page) {
            const page = rendered.page;
            renderTextLayer({
                page,
                viewport: page.getViewport({ scale: rendered.scale }),
                container: layer,
                highlighter,
                isCancelled: () => cancelled,
            }).then(chars => !cancelled && setPdfChars(chars)).catch(err => console.error('Text layer failed:', err));
        }
        return () => {
            cancelled = true;
        };
    }, [rendered, highlighter, ocr, size, needOcr]);

    const shadow = seamless ? undefined : 'var(--shadow-page)';
    return (
        <div
            ref={wrapRef}
            className="relative shrink-0 bg-white"
            style={{ boxShadow: shadow, width: size?.width, height: size?.height }}
            data-page={pageNum}
        >
            {visible && (doc.kind === 'pdf'
                ? <canvas ref={canvasRef} className="block" />
                : <img src={imageUrl(doc.pages[pageNum - 1])} alt="" draggable={false} className="block w-full h-full select-none" />)}
            <div ref={textRef} className="pdf-text-layer" />
            {needOcr && ocr.status === 'running' && (
                <div className="ocr-badge" title="Recognising the text in this page">
                    <Loader2 size={12} className="animate-spin" /> Reading text…
                </div>
            )}
            {needOcr && ocr.status === 'error' && (
                <div className="ocr-badge" title={ocr.error}>
                    <ScanText size={12} /> Couldn't read the text
                </div>
            )}
        </div>
    );
}
