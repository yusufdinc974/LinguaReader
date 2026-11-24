import { useEffect, useRef, useState } from 'react';
import type { PDFDoc } from '../lib/pdf';
import type { Highlighter } from '../lib/highlight';
import { renderTextLayer, type TextLayerStrategy } from '../lib/textLayer';

type PDFPage = Awaited<ReturnType<PDFDoc['getPage']>>;

interface Props {
    doc: PDFDoc;
    pageNum: number;
    scale: number;
    highlighter: Highlighter;
    strategy?: TextLayerStrategy;
}

/** One rendered PDF page: crisp canvas plus a selectable, highlighted text layer. */
export default function PdfPage({ doc, pageNum, scale, highlighter, strategy = 'glyph' }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    // Set once the canvas for (doc, page, scale) is drawn; the text layer
    // needs the fonts that drawing loads.
    const [rendered, setRendered] = useState<{ page: PDFPage; scale: number } | null>(null);

    // Canvas: only when the page or zoom changes (not when highlights change)
    useEffect(() => {
        let cancelled = false;
        let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
        setRendered(null);

        (async () => {
            try {
                const page = await doc.getPage(pageNum);
                if (cancelled) return;
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const wrap = wrapRef.current;
                if (!canvas || !wrap) return;

                const dpr = window.devicePixelRatio || 1;
                wrap.style.width = `${viewport.width}px`;
                wrap.style.height = `${viewport.height}px`;
                canvas.width = Math.floor(viewport.width * dpr);
                canvas.height = Math.floor(viewport.height * dpr);
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                task = page.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
                await task.promise;
                task = null;
                if (!cancelled) setRendered({ page, scale });
            } catch (err: any) {
                if (err?.name !== 'RenderingCancelledException') console.error('Page render failed:', err);
            }
        })();

        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [doc, pageNum, scale]);

    // Text layer: after the canvas, and again whenever highlights change
    useEffect(() => {
        const layer = textRef.current;
        if (!rendered || !layer) return;
        let cancelled = false;
        renderTextLayer({
            page: rendered.page,
            viewport: rendered.page.getViewport({ scale: rendered.scale }),
            container: layer,
            highlighter,
            strategy,
            isCancelled: () => cancelled,
        }).catch(err => console.error('Text layer failed:', err));
        return () => {
            cancelled = true;
        };
    }, [rendered, highlighter, strategy]);

    return (
        <div ref={wrapRef} className="relative shrink-0 bg-white" style={{ boxShadow: 'var(--shadow-page)' }} data-page={pageNum}>
            <canvas ref={canvasRef} className="block" />
            <div ref={textRef} className="pdf-text-layer" />
        </div>
    );
}
