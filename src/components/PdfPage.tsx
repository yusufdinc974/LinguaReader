import { useEffect, useRef } from 'react';
import { pdfjsLib, type PDFDoc } from '../lib/pdf';
import type { Highlighter } from '../lib/highlight';

interface Props {
    doc: PDFDoc;
    pageNum: number;
    scale: number;
    highlighter: Highlighter;
}

/** One rendered PDF page: crisp canvas plus a selectable, highlighted text layer. */
export default function PdfPage({ doc, pageNum, scale, highlighter }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        let task: { cancel: () => void; promise: Promise<unknown> } | null = null;

        (async () => {
            try {
                const page = await doc.getPage(pageNum);
                if (cancelled) return;
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const wrap = wrapRef.current;
                const layer = textRef.current;
                if (!canvas || !wrap || !layer) return;

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
                if (cancelled) return;

                const content = await page.getTextContent();
                if (cancelled) return;

                layer.replaceChildren();
                layer.style.width = `${viewport.width}px`;
                layer.style.height = `${viewport.height}px`;

                for (const item of content.items) {
                    if (!('str' in item) || !item.str) continue;
                    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                    const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
                    const top = tx[5] - fontSize + fontSize * 0.2;

                    const span = document.createElement('span');
                    span.style.left = `${tx[4]}px`;
                    span.style.top = `${top}px`;
                    span.style.fontSize = `${fontSize}px`;
                    span.style.fontFamily = 'sans-serif';
                    span.style.transformOrigin = 'left top';
                    highlighter.fill(span, item.str);
                    layer.appendChild(span);

                    if ('width' in item && item.width) {
                        const target = (item.width as number) * scale;
                        const actual = span.offsetWidth;
                        if (actual > 0 && Math.abs(actual - target) > 1) {
                            span.style.transform = `scaleX(${target / actual})`;
                        }
                    }
                }
            } catch (err: any) {
                if (err?.name !== 'RenderingCancelledException') console.error('Page render failed:', err);
            }
        })();

        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [doc, pageNum, scale, highlighter]);

    return (
        <div ref={wrapRef} className="relative shrink-0 bg-white" style={{ boxShadow: 'var(--shadow-page)' }} data-page={pageNum}>
            <canvas ref={canvasRef} className="block" />
            <div ref={textRef} className="pdf-text-layer" />
        </div>
    );
}
