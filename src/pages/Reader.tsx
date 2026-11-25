import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FolderOpen, ChevronLeft, ChevronRight, Minus, Plus, Columns2, Maximize2, Minimize2, Highlighter, Languages, Loader2, Library,
    ScanText, GalleryVertical,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { destroyDoc, displayName, openReaderDoc, pageSize, type ReaderDoc } from '../lib/document';
import { getOcrMode, holdPage, ocrPage, setOcrMode, SCANNED_PAGE_CHARS, type OcrMode } from '../lib/ocr';
import { SCRIPTS, type ScriptId } from '../../electron/ocr/types';
import { createHighlighter } from '../lib/highlight';
import { wordKey, cleanSelection, DEFAULT_LIST_COLOR } from '../lib/words';
import { selectionContext } from '../lib/context';
import { translateText, SUPPORTED_LANGUAGES } from '../services/translationService';
import PageView from '../components/PageView';
import WordCard, { type WordCardState } from '../components/WordCard';
import type { WordList } from '../types';

interface FamiliarityMap {
    [key: string]: { level: number; translation: string | null };
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

export default function Reader() {
    const navigate = useNavigate();
    const { currentPdf, setCurrentPdf, currentPage, setCurrentPage, totalPages, setTotalPages, focus, setFocus, bumpData } = useStore();

    const [doc, setDoc] = useState<ReaderDoc | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [scale, setScale] = useState(() => Number(localStorage.getItem('readerScale')) || 1.4);
    const [spread, setSpread] = useState(() => localStorage.getItem('readerSpread') === '1');
    const [targetLang, setTargetLang] = useState(() => localStorage.getItem('targetLang') || 'tr');

    const [lists, setLists] = useState<WordList[]>([]);
    const [familiarity, setFamiliarity] = useState<FamiliarityMap>({});
    const [wordColors, setWordColors] = useState<Record<string, string>>({});
    // [] = highlight all lists, [-1] = none, otherwise the chosen ids
    const [shownListIds, setShownListIds] = useState<number[]>([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [ocrOpen, setOcrOpen] = useState(false);
    const [ocrMode, setOcrModeState] = useState<OcrMode>(getOcrMode);
    // The document's OCR script: null = detect automatically
    const [docScript, setDocScript] = useState<{ script: ScriptId; chosen: boolean } | null>(null);
    const [ocrVersion, setOcrVersion] = useState(0);
    // Image documents: pages joined in one scrolling strip (webtoons)
    const [continuous, setContinuous] = useState(false);

    const [card, setCard] = useState<WordCardState | null>(null);
    const [level, setLevel] = useState(1);
    const [savedWordId, setSavedWordId] = useState<number | null>(null);
    const [pageInput, setPageInput] = useState(String(currentPage));

    const scrollRef = useRef<HTMLDivElement>(null);
    const selectionSeq = useRef(0);
    /** Path whose saved page has been applied; saving waits for this. */
    const restoredFor = useRef<string | null>(null);

    useEffect(() => localStorage.setItem('readerScale', String(scale)), [scale]);
    useEffect(() => localStorage.setItem('readerSpread', spread ? '1' : '0'), [spread]);
    useEffect(() => localStorage.setItem('targetLang', targetLang), [targetLang]);
    useEffect(() => setPageInput(String(currentPage)), [currentPage]);
    useEffect(() => () => setFocus(false), [setFocus]);

    // ---------- data ----------
    const loadLists = useCallback(async () => setLists(await window.electronAPI.getWordLists()), []);

    const loadFamiliarity = useCallback(async () => {
        const all = await window.electronAPI.getAllWordFamiliarity();
        const map: FamiliarityMap = {};
        for (const f of all) map[f.word_lower] = { level: f.familiarity_level, translation: f.translation };
        setFamiliarity(map);
    }, []);

    const loadColors = useCallback(async (ids: number[]) => {
        const rows = await window.electronAPI.getWordColors(ids.length > 0 ? ids : undefined);
        const map: Record<string, string> = {};
        for (const r of rows) map[r.word_lower] = r.color;
        setWordColors(map);
    }, []);

    useEffect(() => {
        loadLists();
        loadFamiliarity();
    }, [loadLists, loadFamiliarity]);

    useEffect(() => {
        loadColors(shownListIds);
    }, [shownListIds, loadColors]);

    // ---------- document ----------
    const loadDoc = useCallback(async (file: { name: string; data: string; path: string }) => {
        setLoading(true);
        setLoadError(null);
        try {
            restoredFor.current = null;
            const [next, progress] = await Promise.all([
                openReaderDoc(file),
                window.electronAPI.getPdfProgress(file.path).catch(() => null),
            ]);
            setDoc(prev => {
                if (prev && prev !== next) destroyDoc(prev);
                return next;
            });
            setTotalPages(next.numPages);
            setDocScript(await window.electronAPI.ocrGetDoc(next.hash).catch(() => null));
            if (next.kind === 'images') {
                // Long strips read best as one continuous scroll
                const stored = localStorage.getItem(`continuous:${next.hash}`);
                const first = await pageSize(next, 1);
                setContinuous(stored !== null ? stored === '1' : first.height > first.width * 2);
            } else setContinuous(false);
            // Resume where the reader left off (bookmark), clamped in case the file changed
            const saved = progress?.last_page ?? 1;
            setCurrentPage(Math.min(Math.max(1, saved), next.numPages));
            restoredFor.current = file.path;
        } catch (e) {
            console.error('Failed to load document:', e);
            setLoadError('This file could not be opened.');
        } finally {
            setLoading(false);
        }
    }, [setCurrentPage, setTotalPages]);

    useEffect(() => {
        if (currentPdf) {
            loadDoc(currentPdf);
            return;
        }
        (async () => {
            const last = await window.electronAPI.getLastPdfPath();
            if (!last) return;
            const file = await window.electronAPI.openPdfByPath(last);
            if (file) setCurrentPdf(file);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPdf]);

    // Save the reading position whenever the page changes (after it was restored)
    useEffect(() => {
        if (!doc || !currentPdf || restoredFor.current !== currentPdf.path) return;
        const t = setTimeout(() => {
            window.electronAPI.setPdfProgress(currentPdf.path, currentPage, totalPages).catch(() => { });
        }, 300);
        return () => clearTimeout(t);
    }, [doc, currentPdf, currentPage, totalPages]);

    const openFile = async () => {
        const file = await window.electronAPI.openPdfDialog();
        if (!file) return;
        await window.electronAPI.addRecentPdf(file.name, file.path);
        setCard(null);
        setCurrentPdf(file);
    };

    // ---------- navigation ----------
    const step = spread && !continuous ? 2 : 1;
    const goTo = useCallback((p: number) => {
        if (!totalPages) return;
        const next = Math.max(1, Math.min(totalPages, p));
        setCurrentPage(next);
        setCard(null);
        if (continuous) {
            const el = scrollRef.current?.querySelector<HTMLElement>(`[data-page="${next}"]`);
            if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 16 });
        } else scrollRef.current?.scrollTo({ top: 0 });
    }, [totalPages, setCurrentPage, continuous]);

    // Continuous mode: the current page is the one at the top of the view
    const onScrollPages = () => {
        if (card) setCard(null);
        if (!continuous || !scrollRef.current) return;
        const box = scrollRef.current;
        const mid = box.scrollTop + box.clientHeight * 0.3;
        let page = 1;
        for (const el of box.querySelectorAll<HTMLElement>('[data-page]')) {
            if (el.offsetTop <= mid) page = Number(el.dataset.page);
            else break;
        }
        if (page !== currentPage) setCurrentPage(page);
    };

    // After a jump into a continuous document (resume), bring the page into view
    const jumpedFor = useRef<string | null>(null);
    useEffect(() => {
        if (!continuous || !doc || jumpedFor.current === doc.hash || restoredFor.current === null) return;
        jumpedFor.current = doc.hash;
        const p = currentPage;
        requestAnimationFrame(() => {
            const el = scrollRef.current?.querySelector<HTMLElement>(`[data-page="${p}"]`);
            if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 16 });
        });
    }, [continuous, doc, currentPage]);

    // Read the next page's text ahead of time, so turning the page finds it ready
    useEffect(() => {
        if (!doc || ocrMode === 'off' || continuous) return;
        const n = currentPage + step;
        if (n > totalPages) return;
        let alive = true;
        let release = () => { };
        const t = setTimeout(async () => {
            let need = doc.kind === 'images' || ocrMode === 'always';
            if (!need && doc.kind === 'pdf') {
                const content = await (await doc.pdf.getPage(n)).getTextContent();
                const chars = content.items.reduce((a, it) => a + ('str' in it ? it.str.replace(/\s+/g, '').length : 0), 0);
                need = chars < SCANNED_PAGE_CHARS;
            }
            if (!alive || !need) return;
            release = holdPage(doc, n);
            ocrPage(doc, n).catch(() => { }).finally(() => release());
        }, 1200);
        return () => {
            alive = false;
            clearTimeout(t);
            release();
        };
    }, [doc, currentPage, step, totalPages, ocrMode, continuous, ocrVersion]);

    const changeOcrMode = (m: OcrMode) => {
        setOcrMode(m);
        setOcrModeState(m);
    };
    const changeScript = async (script: ScriptId | null) => {
        if (!doc) return;
        await window.electronAPI.ocrSetDocScript(doc.hash, script);
        setDocScript(script ? { script, chosen: true } : null);
        setOcrVersion(v => v + 1);
    };
    const toggleContinuous = () => {
        if (!doc) return;
        const next = !continuous;
        localStorage.setItem(`continuous:${doc.hash}`, next ? '1' : '0');
        setContinuous(next);
        setCard(null);
    };

    const zoom = useCallback((delta: number) => {
        setScale(s => Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s + delta)) * 100) / 100);
    }, []);

    const fitWidth = async () => {
        if (!doc || !scrollRef.current) return;
        const base = (await pageSize(doc, currentPage)).width;
        const two = spread && !continuous;
        const avail = scrollRef.current.clientWidth - 64 - (two ? 24 : 0);
        const s = avail / (base * (two ? 2 : 1));
        setScale(Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s)) * 100) / 100);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest?.('input, textarea, select, [contenteditable]')) return;
            if (e.key === 'Escape') {
                if (card) setCard(null);
                else if (focus) setFocus(false);
                return;
            }
            if (!doc) return;
            if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(currentPage + step); }
            else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(currentPage - step); }
            else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoom(ZOOM_STEP); }
            else if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoom(-ZOOM_STEP); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [doc, card, focus, currentPage, step, goTo, zoom, setFocus]);

    // Ctrl + wheel / trackpad pinch zooms the page
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            e.preventDefault();
            zoom(e.deltaY > 0 ? -0.05 : 0.05);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [zoom, doc]);

    // ---------- selection → translation ----------
    const onMouseUp = async () => {
        const sel = window.getSelection();
        // "étals," → "étals": edge punctuation would otherwise be saved with the word
        const text = cleanSelection(sel?.toString() ?? '');
        if (!sel || !text || sel.rangeCount === 0) {
            setCard(null);
            return;
        }
        const range = sel.getRangeAt(0);
        const r = range.getBoundingClientRect();
        const context = selectionContext(range);
        const seq = ++selectionSeq.current;
        const key = wordKey(text);

        setLevel(familiarity[key]?.level ?? 1);
        setCard({ text, translation: '', loading: true, failed: false, context, anchor: { left: r.left, top: r.top, bottom: r.bottom, width: r.width } });

        const [existing, result] = await Promise.allSettled([
            window.electronAPI.getWordByLower(key),
            translateText(text, targetLang),
        ]);
        if (seq !== selectionSeq.current) return; // a newer selection replaced this one

        setSavedWordId(existing.status === 'fulfilled' ? existing.value?.id ?? null : null);
        setCard(c => c && (result.status === 'fulfilled'
            ? { ...c, loading: false, translation: result.value.translatedText, source: result.value.source, detectedLanguage: result.value.detectedLanguage }
            : { ...c, loading: false, failed: true }));
    };

    const saveToList = async (listId: number) => {
        if (!card || card.loading || !card.translation) return;
        try {
            const key = wordKey(card.text);
            const wordId = await window.electronAPI.addWord(card.text, card.translation, card.detectedLanguage || 'auto', targetLang, card.context ?? '', currentPdf?.name || '');
            await window.electronAPI.addWordToList(wordId, listId);
            await window.electronAPI.setWordFamiliarity(key, level, card.translation);
            setFamiliarity(prev => ({ ...prev, [key]: { level, translation: card.translation } }));
            setSavedWordId(Number(wordId));
            await loadColors(shownListIds);
            bumpData();
            setCard(null);
            window.getSelection()?.removeAllRanges();
        } catch (e) {
            console.error('Failed to save word:', e);
        }
    };

    const createListAndSave = async (name: string) => {
        try {
            const id = await window.electronAPI.createWordList(name, '');
            await loadLists();
            await saveToList(id);
        } catch (e) {
            console.error('Failed to create list:', e);
        }
    };

    const removeWord = async () => {
        if (!savedWordId || !card) return;
        try {
            await window.electronAPI.deleteWord(savedWordId);
            const key = wordKey(card.text);
            setFamiliarity(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            setSavedWordId(null);
            await loadColors(shownListIds);
            bumpData();
            setCard(null);
        } catch (e) {
            console.error('Failed to delete word:', e);
        }
    };

    // ---------- highlight filter ----------
    const isShown = (id: number) => shownListIds.length === 0 || (shownListIds[0] !== -1 && shownListIds.includes(id));
    const toggleShown = (id: number) => {
        const current = lists.filter(l => isShown(l.id)).map(l => l.id);
        const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
        setShownListIds(next.length === lists.length ? [] : next.length === 0 ? [-1] : next);
    };
    const filterActive = shownListIds.length > 0;

    const highlighter = useMemo(() => createHighlighter(wordColors), [wordColors]);
    const pages = !doc ? [] : continuous
        ? Array.from({ length: totalPages }, (_, i) => i + 1)
        : spread ? [currentPage, currentPage + 1].filter(p => p <= totalPages) : [currentPage];
    const langName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name ?? targetLang;

    // ---------- render ----------
    return (
        <div className="h-full flex flex-col" onMouseDown={e => {
            const t = e.target as HTMLElement;
            if (!t.closest('[data-popover]')) { setFilterOpen(false); setLangOpen(false); setOcrOpen(false); }
        }}>
            <header
                className="h-12 shrink-0 flex items-center gap-1 px-3 border-b drag-region"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                {focus && (
                    <button className="icon-btn no-drag" onClick={() => navigate('/')} title="Library" aria-label="Library">
                        <Library size={17} />
                    </button>
                )}
                <div className="flex items-center min-w-0 flex-1 gap-2 pl-1">
                    <p className="text-[13px] font-medium truncate no-drag" title={currentPdf?.name}>
                        {currentPdf ? displayName(currentPdf.name) : 'Reader'}
                    </p>
                </div>

                {doc && (
                    <div className="flex items-center gap-0.5 no-drag">
                        <button className="icon-btn" onClick={() => goTo(currentPage - step)} disabled={currentPage <= 1} aria-label="Previous page">
                            <ChevronLeft size={17} />
                        </button>
                        <div className="flex items-center gap-1 text-[12.5px] muted tabular-nums">
                            <input
                                className="field h-7 w-11 text-center px-1 tabular-nums"
                                value={pageInput}
                                onChange={e => setPageInput(e.target.value.replace(/\D/g, ''))}
                                onKeyDown={e => e.key === 'Enter' && goTo(Number(pageInput) || 1)}
                                onBlur={() => setPageInput(String(currentPage))}
                                aria-label="Page number"
                            />
                            <span>/ {totalPages}</span>
                        </div>
                        <button className="icon-btn" onClick={() => goTo(currentPage + step)} disabled={currentPage + step > totalPages} aria-label="Next page">
                            <ChevronRight size={17} />
                        </button>

                        <span className="w-px h-5 mx-2" style={{ background: 'var(--border)' }} />

                        <button className="icon-btn" onClick={() => zoom(-ZOOM_STEP)} disabled={scale <= ZOOM_MIN} aria-label="Zoom out">
                            <Minus size={16} />
                        </button>
                        <button className="h-7 px-1.5 rounded text-[12.5px] muted tabular-nums w-12 hover:bg-[var(--surface-2)]" onClick={fitWidth} title="Fit to width">
                            {Math.round(scale * 100)}%
                        </button>
                        <button className="icon-btn" onClick={() => zoom(ZOOM_STEP)} disabled={scale >= ZOOM_MAX} aria-label="Zoom in">
                            <Plus size={16} />
                        </button>

                        <span className="w-px h-5 mx-2" style={{ background: 'var(--border)' }} />

                        {doc.kind === 'images' && (
                            <button className="icon-btn" data-active={continuous} onClick={toggleContinuous} title="Continuous scroll (webtoon)" aria-label="Continuous scroll">
                                <GalleryVertical size={16} />
                            </button>
                        )}
                        {!continuous && (
                            <button className="icon-btn" data-active={spread} onClick={() => { setSpread(s => !s); setCard(null); }} title="Two pages" aria-label="Two-page view">
                                <Columns2 size={16} />
                            </button>
                        )}

                        <div className="relative" data-popover>
                            <button className="icon-btn relative" data-active={ocrOpen} onClick={() => {
                                if (!ocrOpen && doc) window.electronAPI.ocrGetDoc(doc.hash).then(setDocScript).catch(() => { });
                                setOcrOpen(o => !o);
                            }} title="Text in images (OCR)" aria-label="Text recognition">
                                <ScanText size={16} />
                                {ocrMode === 'off' && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-faint, #999)' }} />}
                            </button>
                            {ocrOpen && (
                                <div className="popover absolute right-0 top-full mt-1.5 w-72 p-1 z-50 anim-in">
                                    <p className="label px-2 pt-1.5 pb-1">Read text in images</p>
                                    {([
                                        ['auto', 'Scanned pages and images'],
                                        ['always', 'Every page'],
                                        ['off', 'Off'],
                                    ] as [OcrMode, string][]).map(([m, label]) => (
                                        <button key={m} className="menu-item justify-between" onClick={() => changeOcrMode(m)}>
                                            {label}
                                            {ocrMode === m && <span className="dot" style={{ background: 'var(--accent)', width: 6, height: 6 }} />}
                                        </button>
                                    ))}
                                    <p className="label px-2 pt-3 pb-1 border-t mt-1" style={{ borderColor: 'var(--border)' }}>Alphabet of this book</p>
                                    <div className="max-h-64 overflow-auto">
                                        <button className="menu-item justify-between" onClick={() => changeScript(null)}>
                                            <span>Detect automatically{docScript && !docScript.chosen && <span className="faint"> · {SCRIPTS.find(x => x.id === docScript.script)?.label}</span>}</span>
                                            {(!docScript || !docScript.chosen) && <span className="dot" style={{ background: 'var(--accent)', width: 6, height: 6 }} />}
                                        </button>
                                        {SCRIPTS.map(sc => (
                                            <button key={sc.id} className="menu-item justify-between" title={sc.languages} onClick={() => changeScript(sc.id)}>
                                                {sc.label}
                                                {docScript?.chosen && docScript.script === sc.id && <span className="dot" style={{ background: 'var(--accent)', width: 6, height: 6 }} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative" data-popover>
                            <button className="icon-btn relative" data-active={filterOpen || filterActive} onClick={() => setFilterOpen(o => !o)} title="Highlighted lists" aria-label="Highlighted lists">
                                <Highlighter size={16} />
                                {filterActive && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />}
                            </button>
                            {filterOpen && (
                                <div className="popover absolute right-0 top-full mt-1.5 w-60 p-1 z-50 anim-in">
                                    <p className="label px-2 pt-1.5 pb-1">Highlight words from</p>
                                    {lists.length === 0 && <p className="text-[12.5px] faint px-2 py-2">No lists yet.</p>}
                                    <div className="max-h-64 overflow-auto">
                                        {lists.map(list => (
                                            <label key={list.id} className="menu-item cursor-pointer">
                                                <input type="checkbox" checked={isShown(list.id)} onChange={() => toggleShown(list.id)} style={{ accentColor: 'var(--accent)' }} />
                                                <span className="dot" style={{ background: list.color || DEFAULT_LIST_COLOR }} />
                                                <span className="truncate">{list.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {filterActive && (
                                        <button className="menu-item mt-1 border-t rounded-none" style={{ borderColor: 'var(--border)', color: 'var(--accent)' }} onClick={() => setShownListIds([])}>
                                            Show all lists
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="relative no-drag" data-popover>
                    <button className="btn btn-ghost h-8 px-2.5" onClick={() => setLangOpen(o => !o)} title="Translate into">
                        <Languages size={15} />
                        <span className="text-[12.5px]">{langName}</span>
                    </button>
                    {langOpen && (
                        <div className="popover absolute right-0 top-full mt-1.5 w-48 p-1 z-50 anim-in">
                            <p className="label px-2 pt-1.5 pb-1">Translate into</p>
                            <div className="max-h-72 overflow-auto">
                                {SUPPORTED_LANGUAGES.map(l => (
                                    <button key={l.code} className="menu-item justify-between" onClick={() => { setTargetLang(l.code); setLangOpen(false); }}>
                                        {l.name}
                                        {l.code === targetLang && <span className="dot" style={{ background: 'var(--accent)', width: 6, height: 6 }} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {doc && (
                    <button className="icon-btn no-drag" onClick={() => setFocus(!focus)} title={focus ? 'Exit focus (Esc)' : 'Focus'} aria-label="Focus mode">
                        {focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                )}
                <button className="icon-btn no-drag" onClick={openFile} title="Open a PDF, comic or image" aria-label="Open file">
                    <FolderOpen size={16} />
                </button>
            </header>

            <div
                ref={scrollRef}
                className="flex-1 overflow-auto"
                style={{ background: 'var(--reader-bg)' }}
                onMouseUp={onMouseUp}
                onScroll={onScrollPages}
            >
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 size={22} className="animate-spin faint" />
                    </div>
                ) : doc ? (
                    continuous ? (
                        <div className="min-w-full w-max min-h-full flex flex-col items-center p-8">
                            {pages.map(p => (
                                <PageView key={`${doc.hash}-${p}`} doc={doc} pageNum={p} scale={scale} highlighter={highlighter} ocrMode={ocrMode} ocrVersion={ocrVersion} lazy seamless />
                            ))}
                        </div>
                    ) : (
                        <div className="min-w-full w-max min-h-full flex items-start justify-center gap-6 p-8">
                            {pages.map(p => (
                                <PageView key={`${doc.hash}-${p}-${spread}`} doc={doc} pageNum={p} scale={scale} highlighter={highlighter} ocrMode={ocrMode} ocrVersion={ocrVersion} />
                            ))}
                        </div>
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <h2 className="serif text-[22px] font-semibold">{loadError ?? 'No document open'}</h2>
                        <p className="muted mt-1.5 max-w-[320px]">Open a PDF, comic (CBZ) or image, then select any word or phrase to translate it.</p>
                        <div className="flex gap-2 mt-6">
                            <button className="btn btn-primary btn-lg" onClick={openFile}>
                                <FolderOpen size={16} /> Open file
                            </button>
                            <button className="btn btn-outline btn-lg" onClick={() => navigate('/')}>Library</button>
                        </div>
                    </div>
                )}
            </div>

            {card && (
                <WordCard
                    card={card}
                    level={level}
                    onLevel={setLevel}
                    lists={lists}
                    saved={savedWordId !== null}
                    onSave={saveToList}
                    onCreateList={createListAndSave}
                    onRemove={removeWord}
                    onClose={() => setCard(null)}
                />
            )}
        </div>
    );
}
