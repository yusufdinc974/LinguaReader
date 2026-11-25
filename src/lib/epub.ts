// EPUB books: a zip of XHTML chapters listed in an OPF "spine". Chapters are
// rebuilt element by element from an allow-list (no innerHTML, no scripts,
// no styles, no event handlers, no outside links), so a book can only ever
// add text, images and structure to the reader.

import { unzipSync } from 'fflate';

export interface EpubTocEntry {
    title: string;
    /** Spine index the entry points into. */
    chapter: number;
    fragment?: string;
    depth: number;
}

export interface EpubBook {
    title: string;
    language: string;
    /** Spine items in reading order: zip paths of the chapter files. */
    chapters: string[];
    toc: EpubTocEntry[];
    /** Zip path of the cover image, if the book names one. */
    cover: string | null;
    files: Record<string, Uint8Array>;
    /** Media type of each manifest item, by zip path. */
    types: Record<string, string>;
    /** Object URLs made for images; revoked when the book closes. */
    urls: Map<string, string>;
}

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif', 'image/bmp']);
const EXT_TYPES: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp',
};

const decoder = new TextDecoder('utf-8');

/** Resolves `href` (relative to the file at `base`) to a zip path, without #fragment. */
export function resolvePath(base: string, href: string): { path: string; fragment?: string } {
    const [raw, fragment] = href.split('#', 2);
    let rel = raw;
    try {
        rel = decodeURIComponent(raw);
    } catch { /* keep as is */ }
    const parts = rel.startsWith('/') ? [] : base.split('/').slice(0, -1);
    for (const seg of rel.split('/')) {
        if (seg === '' || seg === '.') continue;
        if (seg === '..') parts.pop();
        else parts.push(seg);
    }
    return { path: parts.join('/'), fragment: fragment || undefined };
}

function parseXml(text: string, type: DOMParserSupportedType = 'application/xml') {
    const doc = new DOMParser().parseFromString(text, type);
    if (doc.getElementsByTagName('parsererror').length > 0 && type !== 'text/html') return null;
    return doc;
}

/** Elements by local name, whatever their namespace prefix (dc:title, opf:item…). */
function byName(root: ParentNode, name: string): Element[] {
    return Array.from((root as Element | Document).getElementsByTagName('*')).filter(e => e.localName === name);
}

export function isEpub(files: Record<string, Uint8Array>) {
    const mt = files['mimetype'];
    return (mt && decoder.decode(mt).trim() === 'application/epub+zip') || 'META-INF/container.xml' in files;
}

export function openEpub(bytes: Uint8Array): EpubBook {
    const files = unzipSync(bytes);
    const container = files['META-INF/container.xml'];
    if (!container) throw new Error('This EPUB has no container.xml.');
    const cdoc = parseXml(decoder.decode(container));
    const opfPath = cdoc && byName(cdoc, 'rootfile')[0]?.getAttribute('full-path');
    if (!opfPath || !files[opfPath]) throw new Error('This EPUB has no package file.');
    const opf = parseXml(decoder.decode(files[opfPath]));
    if (!opf) throw new Error('This EPUB’s package file could not be read.');

    const manifest = new Map<string, { path: string; type: string; props: string }>();
    const types: Record<string, string> = {};
    for (const item of byName(opf, 'item')) {
        const id = item.getAttribute('id');
        const href = item.getAttribute('href');
        if (!id || !href) continue;
        const path = resolvePath(opfPath, href).path;
        const type = item.getAttribute('media-type') ?? '';
        manifest.set(id, { path, type, props: item.getAttribute('properties') ?? '' });
        types[path] = type;
    }

    const chapters: string[] = [];
    for (const ref of byName(opf, 'itemref')) {
        const it = manifest.get(ref.getAttribute('idref') ?? '');
        if (it && files[it.path] && /x?html/.test(it.type || 'html')) chapters.push(it.path);
    }
    if (chapters.length === 0) throw new Error('This EPUB has no chapters.');

    const title = byName(opf, 'title')[0]?.textContent?.trim() ?? '';
    const language = byName(opf, 'language')[0]?.textContent?.trim() ?? '';

    // Cover: EPUB 3 properties="cover-image", else EPUB 2 <meta name="cover" content="id">
    let cover: string | null = null;
    for (const it of manifest.values()) if (it.props.split(/\s+/).includes('cover-image')) cover = it.path;
    if (!cover) {
        const id = byName(opf, 'meta').find(m => m.getAttribute('name') === 'cover')?.getAttribute('content');
        const it = id ? manifest.get(id) : undefined;
        if (it && IMAGE_TYPES.has(it.type)) cover = it.path;
    }
    if (cover && !files[cover]) cover = null;

    const book: EpubBook = { title, language, chapters, toc: [], cover, files, types, urls: new Map() };
    book.toc = readToc(book, opf, manifest);
    return book;
}

function readToc(book: EpubBook, opf: Document, manifest: Map<string, { path: string; type: string; props: string }>): EpubTocEntry[] {
    const index = new Map(book.chapters.map((p, i) => [p, i]));
    const out: EpubTocEntry[] = [];
    const add = (base: string, href: string | null, title: string, depth: number) => {
        if (!href || !title.trim()) return;
        const { path, fragment } = resolvePath(base, href);
        const chapter = index.get(path);
        if (chapter !== undefined) out.push({ title: title.replace(/\s+/g, ' ').trim(), chapter, fragment, depth });
    };

    // EPUB 3 navigation document
    const nav = [...manifest.values()].find(it => it.props.split(/\s+/).includes('nav'));
    if (nav && book.files[nav.path]) {
        const doc = parseXml(decoder.decode(book.files[nav.path]), 'application/xhtml+xml') ?? parseXml(decoder.decode(book.files[nav.path]), 'text/html');
        const navs = doc ? byName(doc, 'nav') : [];
        const tocNav = navs.find(n => (n.getAttribute('epub:type') ?? n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') ?? '').includes('toc')) ?? navs[0];
        if (tocNav) {
            const walk = (list: Element, depth: number) => {
                for (const li of Array.from(list.children).filter(c => c.localName === 'li')) {
                    const a = Array.from(li.children).find(c => c.localName === 'a' || c.localName === 'span');
                    if (a) add(nav.path, a.getAttribute('href'), a.textContent ?? '', depth);
                    for (const sub of Array.from(li.children).filter(c => c.localName === 'ol' || c.localName === 'ul')) walk(sub, depth + 1);
                }
            };
            for (const list of Array.from(tocNav.children).filter(c => c.localName === 'ol' || c.localName === 'ul')) walk(list, 0);
        }
    }
    if (out.length > 0) return out;

    // EPUB 2 NCX
    const spine = byName(opf, 'spine')[0];
    const ncx = manifest.get(spine?.getAttribute('toc') ?? '') ?? [...manifest.values()].find(it => it.type === 'application/x-dtbncx+xml');
    if (ncx && book.files[ncx.path]) {
        const doc = parseXml(decoder.decode(book.files[ncx.path]));
        const map = doc ? byName(doc, 'navMap')[0] : undefined;
        const walk = (el: Element, depth: number) => {
            for (const pt of Array.from(el.children).filter(c => c.localName === 'navPoint')) {
                const label = byName(pt, 'text')[0]?.textContent ?? '';
                const src = Array.from(pt.children).find(c => c.localName === 'content')?.getAttribute('src') ?? null;
                add(ncx.path, src, label, depth);
                walk(pt, depth + 1);
            }
        };
        if (map) walk(map, 0);
    }
    return out;
}

/** Object URL for an image in the book (made once, kept while the book is open). */
export function bookImageUrl(book: EpubBook, path: string): string | null {
    const cached = book.urls.get(path);
    if (cached) return cached;
    const bytes = book.files[path];
    const type = book.types[path] || EXT_TYPES[path.split('.').pop()?.toLowerCase() ?? ''] || '';
    if (!bytes || !IMAGE_TYPES.has(type)) return null;
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
    book.urls.set(path, url);
    return url;
}

export function closeEpub(book: EpubBook) {
    for (const url of book.urls.values()) URL.revokeObjectURL(url);
    book.urls.clear();
}

// ---------------------------------------------------------------- chapters

/** Elements kept as they are (lower-case local names). Anything else is unwrapped. */
const KEEP = new Set([
    'p', 'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'hr', 'br',
    'em', 'i', 'b', 'strong', 'u', 's', 'small', 'sub', 'sup', 'cite', 'q', 'abbr', 'dfn', 'mark', 'var', 'kbd', 'samp', 'bdi', 'bdo',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
    'figure', 'figcaption', 'ruby', 'rt', 'rp', 'rb', 'img', 'a',
]);
/** Dropped with everything inside them. */
const DROP = new Set(['script', 'style', 'link', 'meta', 'title', 'head', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'audio', 'video', 'source', 'track', 'canvas', 'template', 'noscript', 'math']);
/** Block elements shown on their own line when an unknown element is unwrapped into one. */
const XLINK = 'http://www.w3.org/1999/xlink';

const idCache = new WeakMap<EpubBook, Map<number, HTMLElement>>();

/**
 * Chapter `n` as a fresh, safe element tree (a new copy each call, so the
 * caller may highlight it). Ids are prefixed "epub-" so they can't clash with
 * the app's; internal links carry data-chapter / data-fragment.
 */
export function renderChapter(book: EpubBook, n: number): HTMLElement {
    let cache = idCache.get(book);
    if (!cache) idCache.set(book, (cache = new Map()));
    const hit = cache.get(n);
    if (hit) return hit.cloneNode(true) as HTMLElement;

    const path = book.chapters[n];
    const text = decoder.decode(book.files[path]);
    const src = parseXml(text, 'application/xhtml+xml') ?? parseXml(text, 'text/html')!;
    const body = byName(src, 'body')[0] ?? src.documentElement;
    const index = new Map(book.chapters.map((p, i) => [p, i]));

    const out = document.createElement('div');
    out.className = 'epub-body';
    const lang = src.documentElement.getAttribute('xml:lang') ?? src.documentElement.getAttribute('lang') ?? body.getAttribute('lang') ?? book.language;
    if (lang && /^[a-zA-Z-]{2,20}$/.test(lang)) out.lang = lang;

    const copyChildren = (from: Node, to: Node) => {
        for (const child of Array.from(from.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
                to.appendChild(document.createTextNode(child.textContent ?? ''));
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const el = convert(child as Element);
                if (el) to.appendChild(el);
            }
        }
    };

    const convert = (el: Element): Node | null => {
        const name = el.localName.toLowerCase();
        if (DROP.has(name)) return null;

        // <svg><image xlink:href="cover.jpg"/></svg> (common for covers) → <img>
        if (name === 'svg') {
            const image = byName(el, 'image')[0];
            const href = image?.getAttributeNS(XLINK, 'href') ?? image?.getAttribute('href') ?? image?.getAttribute('xlink:href');
            if (!href) return null;
            return makeImg(href, '');
        }
        if (name === 'img') return makeImg(el.getAttribute('src') ?? '', el.getAttribute('alt') ?? '');
        if (name === 'image') return null;

        if (!KEEP.has(name)) {
            // Unknown element: keep what's inside it
            const frag = document.createDocumentFragment();
            copyChildren(el, frag);
            return frag;
        }

        const tag = name === 'a' ? 'span' : name;
        const node = document.createElement(tag);
        const id = el.getAttribute('id');
        if (id && /^[\w.:-]{1,100}$/.test(id)) node.id = `epub-${id}`;
        const elLang = el.getAttribute('xml:lang') ?? el.getAttribute('lang');
        if (elLang && /^[a-zA-Z-]{2,20}$/.test(elLang)) node.lang = elLang;
        const dir = el.getAttribute('dir');
        if (dir === 'rtl' || dir === 'ltr') node.dir = dir;
        if (name === 'td' || name === 'th') {
            for (const a of ['colspan', 'rowspan']) {
                const v = Number(el.getAttribute(a));
                if (Number.isInteger(v) && v > 1 && v < 100) node.setAttribute(a, String(v));
            }
        }
        if (name === 'a') {
            node.className = 'epub-link';
            const href = el.getAttribute('href');
            if (href && !/^[a-z][a-z0-9+.-]*:/i.test(href)) {
                const target = href.startsWith('#') ? { path, fragment: href.slice(1) } : resolvePath(path, href);
                const chapter = index.get(target.path);
                if (chapter !== undefined) {
                    node.dataset.chapter = String(chapter);
                    if (target.fragment && /^[\w.:-]{1,100}$/.test(target.fragment)) node.dataset.fragment = target.fragment;
                } else node.className = '';
            } else node.className = '';
        }
        const align = /text-align\s*:\s*(center|right)/i.exec(el.getAttribute('style') ?? '')?.[1];
        if (align) node.style.textAlign = align.toLowerCase();
        copyChildren(el, node);
        return node;
    };

    const makeImg = (href: string, alt: string): Node | null => {
        if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href)) return null; // only images inside the book
        const url = bookImageUrl(book, resolvePath(path, href).path);
        if (!url) return null;
        const img = document.createElement('img');
        img.src = url;
        img.alt = alt;
        img.draggable = false;
        img.loading = 'lazy';
        return img;
    };

    copyChildren(body, out);
    cache.set(n, out);
    return out.cloneNode(true) as HTMLElement;
}

/** Title of chapter `n` from the table of contents, if it has one. */
export function chapterTitle(book: EpubBook, n: number) {
    return book.toc.find(t => t.chapter === n)?.title ?? '';
}
