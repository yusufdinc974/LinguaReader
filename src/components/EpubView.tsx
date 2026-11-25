import { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import type { EpubReaderDoc } from '../lib/document';
import type { Highlighter } from '../lib/highlight';
import { chapterTitle, renderChapter } from '../lib/epub';

interface Props {
    doc: EpubReaderDoc;
    chapter: number;
    scale: number;
    highlighter: Highlighter;
    /** A link inside the book was clicked. */
    onNavigate: (chapter: number, fragment?: string) => void;
    /** Called after the chapter is in the page (to restore a scroll position). */
    onRendered?: () => void;
}

/** Wraps saved words in <mark>, text node by text node (never across elements). */
function highlight(root: HTMLElement, highlighter: Highlighter) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: n => (n.parentElement?.closest('rt, rp') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
    for (const node of nodes) {
        const text = node.data;
        const ranges = highlighter.ranges(text);
        if (ranges.length === 0) continue;
        const holder = document.createElement('span');
        highlighter.fillSegment(holder, text, 0, text.length, ranges);
        const frag = document.createDocumentFragment();
        while (holder.firstChild) frag.appendChild(holder.firstChild);
        node.replaceWith(frag);
    }
}

/** One EPUB chapter as reflowed, selectable text in a book-width column. */
export default function EpubView({ doc, chapter, scale, highlighter, onNavigate, onRendered }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const renderedRef = useRef(onRendered);
    renderedRef.current = onRendered;

    useEffect(() => {
        const host = ref.current;
        if (!host) return;
        let body: HTMLElement;
        try {
            body = renderChapter(doc.book, chapter - 1);
        } catch (err) {
            console.error('EPUB chapter failed:', err);
            body = document.createElement('p');
            body.textContent = 'This chapter could not be shown.';
        }
        highlight(body, highlighter);
        host.replaceChildren(body);
        renderedRef.current?.();
    }, [doc, chapter, highlighter]);

    const onClick = (e: React.MouseEvent) => {
        const link = (e.target as HTMLElement).closest<HTMLElement>('[data-chapter]');
        if (!link || window.getSelection()?.toString()) return;
        e.preventDefault();
        onNavigate(Number(link.dataset.chapter) + 1, link.dataset.fragment);
    };

    const next = chapter < doc.numPages ? chapterTitle(doc.book, chapter) : '';
    return (
        <article
            className="epub-chapter"
            style={{ fontSize: `${(13 * scale).toFixed(1)}px` }}
            data-page={chapter}
        >
            <div ref={ref} onClick={onClick} />
            {chapter < doc.numPages && (
                <button className="epub-next btn btn-outline" onClick={() => onNavigate(chapter + 1)}>
                    <span className="truncate">{next ? `Next: ${next}` : 'Next chapter'}</span>
                    <ChevronRight size={15} />
                </button>
            )}
        </article>
    );
}
