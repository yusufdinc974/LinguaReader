import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Languages, X, Plus, Maximize2, Minimize2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useStore } from '../store/useStore';
import { translateText, SUPPORTED_LANGUAGES } from '../services/translationService';
import type { WordList } from '../types';

// Set PDF.js worker
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// CMap URL for CJK (Chinese, Japanese, Korean) font support
const CMAP_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/';
const CMAP_PACKED = true;

// Static level colors for the selector UI (when adding new words)
const LEVEL_COLORS: Record<number, string> = {
    1: '#ef4444',   // Red - unknown
    2: '#f97316',   // Orange - seen before
    3: '#eab308',   // Yellow - learning
    4: '#22c55e',   // Green - familiar
    5: '#3b82f6',   // Blue - mastered
};

interface WordFamiliarityMap {
    [wordLower: string]: {
        level: number;
        translation: string | null;
        nextReviewDate: string | null;
    };
}

interface TranslationPanelState {
    show: boolean;
    text: string;
    translation: string;
    isLoading: boolean;
    detectedLanguage?: string;
}

function PdfReader() {
    const { currentPdf, setCurrentPdf, currentPage, setCurrentPage, totalPages, setTotalPages } = useStore();
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [scale, setScale] = useState(1.5);
    const [loading, setLoading] = useState(false);
    const [wordLists, setWordLists] = useState<WordList[]>([]);
    const [targetLang, setTargetLang] = useState('tr');
    const [wordFamiliarity, setWordFamiliarity] = useState<WordFamiliarityMap>({});
    const [wordColors, setWordColors] = useState<{ [word: string]: string }>({});
    const [selectedListIds, setSelectedListIds] = useState<number[]>([]); // Empty means show all
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [panel, setPanel] = useState<TranslationPanelState>({
        show: false,
        text: '',
        translation: '',
        isLoading: false,
    });
    const [selectedLevel, setSelectedLevel] = useState<number>(1);
    const [showListDropdown, setShowListDropdown] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [focusMode, setFocusMode] = useState(false);
    // Translation panel position (remembers where user dragged it)
    const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
    // Panning/scrolling state
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Focus mode refs for two-page view
    const focusCanvasLeftRef = useRef<HTMLCanvasElement>(null);
    const focusCanvasRightRef = useRef<HTMLCanvasElement>(null);
    const focusTextLayerLeftRef = useRef<HTMLDivElement>(null);
    const focusTextLayerRightRef = useRef<HTMLDivElement>(null);
    const focusContainerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Load word lists, familiarity, and colors on mount
    useEffect(() => {
        loadWordLists();
        loadWordFamiliarity();
        loadWordColors();
        loadLastPdf();
    }, []);

    const loadWordLists = async () => {
        const lists = await window.electronAPI.getWordLists();
        setWordLists(lists);
    };

    const loadWordColors = async (listIds?: number[]) => {
        // Use provided listIds, or fall back to selectedListIds
        const idsToUse = listIds !== undefined ? listIds : selectedListIds;
        // Pass empty array to get all, or specific IDs to filter
        const colors = await window.electronAPI.getWordColors(idsToUse.length > 0 ? idsToUse : undefined);
        const colorMap: { [word: string]: string } = {};
        colors.forEach(item => {
            colorMap[item.word_lower] = item.color;
        });
        setWordColors(colorMap);
    };

    const loadWordFamiliarity = async () => {
        const allFamiliarity = await window.electronAPI.getAllWordFamiliarity();
        const map: WordFamiliarityMap = {};
        allFamiliarity.forEach((item) => {
            map[item.word_lower] = {
                level: item.familiarity_level,
                translation: item.translation,
                nextReviewDate: item.next_review_date || null,
            };
        });
        setWordFamiliarity(map);
    };

    const loadLastPdf = async () => {
        const lastPath = await window.electronAPI.getLastPdfPath();
        if (lastPath) {
            const result = await window.electronAPI.openPdfByPath(lastPath);
            if (result) {
                setCurrentPdf(result);
                loadPdf(result.data);
            }
        }
    };

    const handleUpload = async () => {
        const result = await window.electronAPI.openPdfDialog();
        if (result) {
            setCurrentPdf(result);
            await window.electronAPI.addRecentPdf(result.name, result.path);
            loadPdf(result.data);
        }
    };

    const loadPdf = async (base64Data: string) => {
        setLoading(true);
        try {
            const binaryData = atob(base64Data);
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
                bytes[i] = binaryData.charCodeAt(i);
            }
            const pdf = await pdfjsLib.getDocument({
                data: bytes,
                cMapUrl: CMAP_URL,
                cMapPacked: CMAP_PACKED,
            }).promise;
            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
        } catch (error) {
            console.error('Failed to load PDF:', error);
        } finally {
            setLoading(false);
        }
    };

    // Normalize single word for lookup (removes non-letters)
    const normalizeWord = (word: string) => {
        return word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ]/gi, '');
    };

    // Normalize phrase for lookup (preserves single spaces, normalizes case)
    const normalizePhrase = (text: string) => {
        return text.toLowerCase().replace(/\s+/g, ' ').trim();
    };

    const renderTaskRef = useRef<any>(null);
    const isRenderingRef = useRef<boolean>(false);

    // Render page with word highlighting
    const renderPage = useCallback(async () => {
        if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;

        // Cancel previous render task and wait for it to complete
        if (renderTaskRef.current) {
            const taskToCancel = renderTaskRef.current;
            renderTaskRef.current = null;
            try {
                taskToCancel.cancel();
                await taskToCancel.promise.catch(() => { }); // Wait for cancel to complete
            } catch (e) {
                // Ignore cancel errors
            }
        }

        // Clear text layer immediately for snappy page transitions
        if (textLayerRef.current) {
            textLayerRef.current.innerHTML = '';
        }

        isRenderingRef.current = true;

        try {
            const page = await pdfDoc.getPage(currentPage);
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (!context) {
                isRenderingRef.current = false;
                return;
            }

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Start new render task
            const renderTask = page.render({ canvasContext: context, viewport });
            renderTaskRef.current = renderTask;

            await renderTask.promise;
            renderTaskRef.current = null;

            // Render text layer only if render finished successfully
            const textContent = await page.getTextContent();
            const textLayer = textLayerRef.current;
            if (!textLayer) {
                isRenderingRef.current = false;
                return;
            }

            textLayer.innerHTML = '';
            textLayer.style.width = `${viewport.width}px`;
            textLayer.style.height = `${viewport.height}px`;

            // Build a list of phrases (multi-word) from wordColors for phrase matching
            const phrases = Object.keys(wordColors).filter(key => key.includes(' '));

            textContent.items.forEach((item) => {
                if ('str' in item && item.str) {
                    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                    const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
                    const descent = fontSize * 0.2;
                    const adjustedTop = tx[5] - fontSize + descent;

                    const span = document.createElement('span');
                    span.style.position = 'absolute';
                    span.style.left = `${tx[4]}px`;
                    span.style.top = `${adjustedTop}px`;
                    span.style.fontSize = `${fontSize}px`;
                    span.style.fontFamily = 'sans-serif';
                    span.style.transformOrigin = 'left top';
                    span.style.whiteSpace = 'pre';

                    let text = item.str;
                    let hasHighlight = false;

                    // First, check for phrase matches and mark them
                    let processedText = text;
                    const phraseMarkers: { start: number; end: number; color: string }[] = [];

                    for (const phrase of phrases) {
                        const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                        let match;
                        while ((match = regex.exec(text.toLowerCase())) !== null) {
                            phraseMarkers.push({
                                start: match.index,
                                end: match.index + phrase.length,
                                color: wordColors[phrase]
                            });
                            hasHighlight = true;
                        }
                    }

                    // Sort markers by start position (descending) to process from end to start
                    phraseMarkers.sort((a, b) => b.start - a.start);

                    // Apply phrase highlighting
                    for (const marker of phraseMarkers) {
                        const before = processedText.slice(0, marker.start);
                        const matched = processedText.slice(marker.start, marker.end);
                        const after = processedText.slice(marker.end);
                        const bgColor = marker.color + '4D'; // 30% opacity
                        const escaped = matched.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        processedText = `${before}<mark style="background:${bgColor};border-radius:2px;color:inherit;">${escaped}</mark>${after}`;
                    }

                    // If no phrase matches, check individual words
                    if (!hasHighlight) {
                        const words = text.split(/(\s+)/);

                        const highlightedHtml = words.map(word => {
                            if (!word || !word.trim()) return word; // Keep whitespace as-is

                            const wordLower = normalizeWord(word);
                            if (wordLower && wordColors[wordLower]) {
                                hasHighlight = true;
                                const color = wordColors[wordLower];
                                const bgColor = color + '4D'; // 30% opacity
                                // Escape HTML and wrap in mark
                                const escaped = word.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                return `<mark style="background:${bgColor};border-radius:2px;color:inherit;">${escaped}</mark>`;
                            }
                            // Return word with HTML escaped
                            return word.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        }).join('');

                        processedText = highlightedHtml;
                    }

                    if (hasHighlight) {
                        span.innerHTML = processedText;
                    } else {
                        span.textContent = text;
                    }

                    textLayer.appendChild(span);

                    // Scale text horizontally to match PDF width
                    if ('width' in item && item.width) {
                        const targetWidth = (item.width as number) * scale;
                        const actualWidth = span.offsetWidth;
                        if (actualWidth > 0 && Math.abs(actualWidth - targetWidth) > 1) {
                            const scaleX = targetWidth / actualWidth;
                            span.style.transform = `scaleX(${scaleX})`;
                        }
                    }
                }
            });
        } catch (error: any) {
            // Ignore cancelled errors
            if (error.name === 'RenderingCancelledException') {
                renderTaskRef.current = null;
                isRenderingRef.current = false;
                return;
            }
            console.error('Render page error:', error);
        } finally {
            isRenderingRef.current = false;
        }
    }, [pdfDoc, currentPage, scale, wordFamiliarity, wordColors]);

    useEffect(() => {
        renderPage();
    }, [renderPage]);

    // Focus mode: render two pages side by side
    const renderFocusPage = useCallback(async (
        pageNum: number,
        canvasRef: React.RefObject<HTMLCanvasElement | null>,
        textLayerRef: React.RefObject<HTMLDivElement | null>
    ) => {
        if (!pdfDoc || !canvasRef.current || !textLayerRef.current || pageNum > totalPages) return;

        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (!context) return;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;

            // Render text layer with highlighting
            const textContent = await page.getTextContent();
            const textLayer = textLayerRef.current;
            textLayer.innerHTML = '';
            textLayer.style.width = `${viewport.width}px`;
            textLayer.style.height = `${viewport.height}px`;

            const phrases = Object.keys(wordColors).filter(key => key.includes(' '));

            // Normalize word function (same as main)
            const normalizeWord = (word: string) => {
                return word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ]/gi, '');
            };

            textContent.items.forEach((item) => {
                if ('str' in item && item.str) {
                    // Use proper transform like main renderPage
                    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                    const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
                    const descent = fontSize * 0.2;
                    const adjustedTop = tx[5] - fontSize + descent;

                    const span = document.createElement('span');
                    span.style.position = 'absolute';
                    span.style.left = `${tx[4]}px`;
                    span.style.top = `${adjustedTop}px`;
                    span.style.fontSize = `${fontSize}px`;
                    span.style.fontFamily = 'sans-serif';
                    span.style.transformOrigin = 'left top';
                    span.style.whiteSpace = 'pre';

                    const text = item.str;
                    let hasHighlight = false;
                    let processedText = text;

                    // First, check for phrase matches (multi-word)
                    const phraseMarkers: { start: number; end: number; color: string }[] = [];
                    for (const phrase of phrases) {
                        const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                        let match;
                        while ((match = regex.exec(text.toLowerCase())) !== null) {
                            phraseMarkers.push({
                                start: match.index,
                                end: match.index + phrase.length,
                                color: wordColors[phrase]
                            });
                            hasHighlight = true;
                        }
                    }

                    // Sort markers by start position (descending)
                    phraseMarkers.sort((a, b) => b.start - a.start);

                    // Apply phrase highlighting
                    for (const marker of phraseMarkers) {
                        const before = processedText.slice(0, marker.start);
                        const matched = processedText.slice(marker.start, marker.end);
                        const after = processedText.slice(marker.end);
                        const bgColor = marker.color + '4D';
                        const escaped = matched.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        processedText = `${before}<mark style="background:${bgColor};border-radius:2px;color:inherit;">${escaped}</mark>${after}`;
                    }

                    // If no phrase matches, check individual words
                    if (!hasHighlight) {
                        const words = text.split(/(\s+)/);
                        const highlightedHtml = words.map(word => {
                            if (!word || !word.trim()) return word;
                            const wordLower = normalizeWord(word);
                            if (wordLower && wordColors[wordLower]) {
                                hasHighlight = true;
                                const color = wordColors[wordLower];
                                const bgColor = color + '4D';
                                const escaped = word.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                return `<mark style="background:${bgColor};border-radius:2px;color:inherit;">${escaped}</mark>`;
                            }
                            return word.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        }).join('');
                        processedText = highlightedHtml;
                    }

                    if (hasHighlight) {
                        span.innerHTML = processedText;
                    } else {
                        span.textContent = text;
                    }

                    textLayer.appendChild(span);

                    // Scale text horizontally to match PDF width
                    if ('width' in item && item.width) {
                        const targetWidth = (item.width as number) * scale;
                        const actualWidth = span.offsetWidth;
                        if (actualWidth > 0 && Math.abs(actualWidth - targetWidth) > 1) {
                            const scaleX = targetWidth / actualWidth;
                            span.style.transform = `scaleX(${scaleX})`;
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Focus mode render error:', error);
        }
    }, [pdfDoc, scale, wordColors, totalPages]);

    // Effect for focus mode rendering
    useEffect(() => {
        if (focusMode && pdfDoc) {
            renderFocusPage(currentPage, focusCanvasLeftRef, focusTextLayerLeftRef);
            if (currentPage + 1 <= totalPages) {
                renderFocusPage(currentPage + 1, focusCanvasRightRef, focusTextLayerRightRef);
            }
        }
    }, [focusMode, pdfDoc, currentPage, scale, wordColors, renderFocusPage, totalPages]);

    // Wheel zoom for focus mode (Ctrl+scroll or pinch-to-zoom on trackpad)
    useEffect(() => {
        const container = focusContainerRef.current;
        if (!container || !focusMode) return;

        const handleWheel = (e: WheelEvent) => {
            // Pinch-to-zoom on trackpad sends ctrlKey=true or metaKey=true
            // Also detect by checking if deltaMode is 0 (pixels) and shift is not pressed
            const isPinchZoom = e.ctrlKey || e.metaKey;

            if (isPinchZoom) {
                e.preventDefault();
                e.stopPropagation();
                // Use smaller delta for smoother zooming
                const delta = e.deltaY > 0 ? -0.05 : 0.05;
                setScale(s => Math.min(4, Math.max(0.25, s + delta)));
            }
        };

        // Must use capture phase and non-passive to prevent browser zoom
        container.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        return () => container.removeEventListener('wheel', handleWheel, { capture: true });
    }, [focusMode]);

    // Handle text selection
    const handleMouseUp = async () => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (!text) return;

        // Check if word/phrase already has familiarity
        const phraseKey = normalizePhrase(text);
        if (wordFamiliarity[phraseKey]) {
            setSelectedLevel(wordFamiliarity[phraseKey].level);
        } else {
            setSelectedLevel(1);
        }

        setPanel({
            show: true,
            text,
            translation: '',
            isLoading: true,
        });

        try {
            const result = await translateText(text, targetLang);
            setPanel(prev => ({
                ...prev,
                translation: result.translatedText,
                detectedLanguage: result.detectedLanguage,
                isLoading: false,
            }));
        } catch (error) {
            console.error('Translation failed:', error);
            setPanel(prev => ({
                ...prev,
                translation: 'Translation failed. Please try again.',
                isLoading: false,
            }));
        }
    };

    // Add to word list WITH familiarity level
    const handleAddToList = async (listId: number) => {
        if (!panel.text || !panel.translation || panel.isLoading) return;

        try {
            const phraseKey = normalizePhrase(panel.text);

            // Add word to database
            const wordId = await window.electronAPI.addWord(
                panel.text,
                panel.translation,
                panel.detectedLanguage || 'auto',
                targetLang,
                '',
                currentPdf?.name || ''
            );

            // Add to list
            await window.electronAPI.addWordToList(wordId, listId);

            // Save familiarity level
            await window.electronAPI.setWordFamiliarity(phraseKey, selectedLevel, panel.translation);

            // Update local state with today as next review date (new word)
            const today = new Date().toISOString().split('T')[0];
            setWordFamiliarity(prev => ({
                ...prev,
                [phraseKey]: { level: selectedLevel, translation: panel.translation, nextReviewDate: today }
            }));

            // Refresh colors to show highlighting immediately
            await loadWordColors();

            setShowListDropdown(false);
            setPanel(prev => ({ ...prev, show: false }));

            // Re-render happens automatically via useEffect when wordFamiliarity changes
        } catch (error) {
            console.error('Failed to add word:', error);
        }
    };

    // Create new list and add word
    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        try {
            const listId = await window.electronAPI.createWordList(newListName, '');
            await loadWordLists();
            await handleAddToList(listId);
            setNewListName('');
        } catch (error) {
            console.error('Failed to create list:', error);
        }
    };

    return (
        <>
            <div className="h-full flex">
                {/* Main PDF Area */}
                <div className="flex-1 flex flex-col">
                    {/* Toolbar */}
                    <div className="p-4 flex flex-wrap items-center justify-between gap-4 relative z-10" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="flex flex-wrap items-center gap-4 shrink-0">
                            <button onClick={handleUpload} className="btn-primary flex items-center gap-2">
                                <Upload size={18} />
                                Upload PDF
                            </button>
                            {currentPdf && (
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{currentPdf.name}</span>
                            )}
                            <div className="flex items-center gap-2">
                                <Languages size={18} style={{ color: 'var(--text-muted)' }} />
                                <select
                                    value={targetLang}
                                    onChange={(e) => setTargetLang(e.target.value)}
                                    className="rounded-lg px-3 py-1.5 text-sm"
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                >
                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </div>
                            {/* List Filter Dropdown */}
                            {wordLists.length > 0 && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    >
                                        <span>Filter Lists</span>
                                        {selectedListIds.length > 0 && selectedListIds[0] !== -1 && (
                                            <span style={{ background: 'var(--accent)', color: 'white' }} className="text-xs px-1.5 py-0.5 rounded-full">
                                                {selectedListIds.length}
                                            </span>
                                        )}
                                    </button>
                                    {showFilterDropdown && (
                                        <div className="absolute top-full left-0 mt-2 w-64 rounded-lg p-3 z-[9999] shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                                            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Highlight Lists</p>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {wordLists.map(list => {
                                                    // Determine if this list is "checked"
                                                    // Empty array = all shown, [-1] = none shown, otherwise check if included
                                                    const isChecked = selectedListIds.length === 0
                                                        ? true
                                                        : (selectedListIds[0] === -1 ? false : selectedListIds.includes(list.id));

                                                    return (
                                                        <label key={list.id} className="flex items-center gap-2 cursor-pointer rounded p-1 -m-1" style={{ background: 'transparent' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        // Adding a list
                                                                        if (selectedListIds.length === 0) {
                                                                            // Already showing all, no change needed
                                                                        } else if (selectedListIds[0] === -1) {
                                                                            // Was showing none, now show just this one
                                                                            setSelectedListIds([list.id]);
                                                                            loadWordColors([list.id]);
                                                                        } else {
                                                                            // Add to existing selection
                                                                            const newIds = [...selectedListIds, list.id];
                                                                            // If all lists are now selected, switch to "all" mode
                                                                            if (newIds.length === wordLists.length) {
                                                                                setSelectedListIds([]);
                                                                                loadWordColors([]);
                                                                            } else {
                                                                                setSelectedListIds(newIds);
                                                                                loadWordColors(newIds);
                                                                            }
                                                                        }
                                                                    } else {
                                                                        // Removing a list
                                                                        if (selectedListIds.length === 0) {
                                                                            // Currently showing all, uncheck means show all except this one
                                                                            const newIds = wordLists.filter(l => l.id !== list.id).map(l => l.id);
                                                                            if (newIds.length === 0) {
                                                                                // Only one list existed, now showing none
                                                                                setSelectedListIds([-1]);
                                                                                loadWordColors([-1]);
                                                                            } else {
                                                                                setSelectedListIds(newIds);
                                                                                loadWordColors(newIds);
                                                                            }
                                                                        } else {
                                                                            // Remove from existing selection
                                                                            const newIds = selectedListIds.filter(id => id !== list.id);
                                                                            if (newIds.length === 0) {
                                                                                // No lists selected, show none
                                                                                setSelectedListIds([-1]);
                                                                                loadWordColors([-1]);
                                                                            } else {
                                                                                setSelectedListIds(newIds);
                                                                                loadWordColors(newIds);
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded"
                                                                style={{ accentColor: 'var(--accent)' }}
                                                            />
                                                            <div
                                                                className="w-3 h-3 rounded-full shrink-0"
                                                                style={{ backgroundColor: list.color || '#eab308' }}
                                                            />
                                                            <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{list.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            {(selectedListIds.length > 0 && selectedListIds[0] !== -1) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedListIds([]);
                                                        loadWordColors([]);
                                                    }}
                                                    className="mt-2 text-xs text-primary-400 hover:text-primary-300"
                                                >
                                                    Show all lists
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {pdfDoc && (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="btn-secondary p-2">
                                        <ZoomOut size={18} />
                                    </button>
                                    <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
                                    <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="btn-secondary p-2">
                                        <ZoomIn size={18} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="btn-secondary p-2" disabled={currentPage <= 1}>
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="text-sm w-24 text-center">Page {currentPage} of {totalPages}</span>
                                    <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className="btn-secondary p-2" disabled={currentPage >= totalPages}>
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                                {/* Focus Mode Button */}
                                <button
                                    onClick={() => setFocusMode(true)}
                                    className="btn-secondary p-2"
                                    title="Focus Mode"
                                >
                                    <Maximize2 size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* PDF Viewer */}
                    <div
                        ref={containerRef}
                        className="flex-1 overflow-auto flex items-start justify-center p-8"
                        style={{ background: 'var(--bg-secondary)' }}
                        onMouseUp={handleMouseUp}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 size={48} className="animate-spin text-primary-500" />
                            </div>
                        ) : pdfDoc ? (
                            <div className="relative shadow-2xl rounded-lg overflow-hidden">
                                <canvas ref={canvasRef} className="bg-white" />
                                <div ref={textLayerRef} className="pdf-text-layer" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="p-6 rounded-full bg-primary-500/20 mb-6">
                                    <Upload size={48} className="text-primary-400" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">No PDF Loaded</h2>
                                <p className="text-dark-400 mb-6">Upload a PDF to start reading and learning</p>
                                <button onClick={handleUpload} className="btn-primary">Upload PDF</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Word Panel Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] z-[9999] shadow-2xl flex flex-col transition-transform duration-300 ${panel.show ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-color)' }}
            >
                <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Add to Word List</h3>
                    <button onClick={() => setPanel(prev => ({ ...prev, show: false }))} className="p-1 rounded hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                    {/* Original Word */}
                    <div className="mb-4">
                        <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Original</label>
                        <p className="text-lg font-medium mt-1 break-words" style={{ color: 'var(--text-primary)' }}>{panel.text}</p>
                    </div>

                    {/* Translation */}
                    <div className="mb-6">
                        <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Translation</label>
                        {panel.isLoading ? (
                            <div className="flex items-center gap-2 mt-2">
                                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                                <span style={{ color: 'var(--text-muted)' }}>Translating...</span>
                            </div>
                        ) : (
                            <p className="text-lg font-medium mt-1 break-words" style={{ color: 'var(--accent)' }}>{panel.translation}</p>
                        )}
                    </div>

                    {/* Familiarity Level */}
                    <div className="mb-6">
                        <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
                            Familiarity
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {[1, 2, 3, 4, 5].map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedLevel(level)}
                                    className={`w-8 h-8 rounded-lg font-bold transition-all text-white text-xs ${selectedLevel === level
                                        ? 'ring-2 ring-offset-1 scale-110'
                                        : 'opacity-60 hover:opacity-100'
                                        }`}
                                    style={{ backgroundColor: LEVEL_COLORS[level] }}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                            {selectedLevel === 1 && 'Unknown'}
                            {selectedLevel === 2 && 'Seen'}
                            {selectedLevel === 3 && 'Learning'}
                            {selectedLevel === 4 && 'Familiar'}
                            {selectedLevel === 5 && 'Mastered'}
                        </p>
                    </div>

                    {/* Select or Create List */}
                    <div className="mb-4">
                        <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
                            Add to List
                        </label>

                        <div className="relative">
                            <button
                                onClick={() => setShowListDropdown(!showListDropdown)}
                                className="w-full btn-primary flex items-center justify-center gap-2"
                                disabled={panel.isLoading}
                            >
                                <Plus size={16} />
                                <span>Select</span>
                            </button>

                            {showListDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 rounded-lg p-2 z-10 max-h-40 overflow-auto shadow-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                    {wordLists.length === 0 ? (
                                        <p className="text-sm p-2" style={{ color: 'var(--text-muted)' }}>No lists yet.</p>
                                    ) : (
                                        wordLists.map((list) => (
                                            <button
                                                key={list.id}
                                                onClick={() => handleAddToList(list.id)}
                                                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:opacity-80"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {list.name}
                                            </button>
                                        ))
                                    )}
                                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={newListName}
                                                onChange={(e) => setNewListName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                                                placeholder="New list..."
                                                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-sm"
                                                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                            />
                                            <button
                                                onClick={handleCreateList}
                                                className="btn-secondary px-2"
                                                disabled={!newListName.trim()}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Focus Mode Overlay */}
            {
                focusMode && pdfDoc && (
                    <div className="fixed inset-0 bg-black z-[10000] flex flex-col">
                        {/* Focus Mode Floating Toolbar */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-dark-800/30 hover:bg-dark-800/95 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-4 z-10 shadow-2xl border border-dark-700/50 hover:border-dark-700 transition-all duration-300 opacity-40 hover:opacity-100 text-white">
                            {/* Exit Button */}
                            <button
                                onClick={() => setFocusMode(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                title="Exit Focus Mode"
                            >
                                <Minimize2 size={18} />
                            </button>

                            <div className="w-px h-6 bg-dark-600" />

                            {/* Zoom Controls */}
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-2 hover:bg-white/10 rounded-lg">
                                <ZoomOut size={18} />
                            </button>
                            <span className="text-sm w-14 text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-2 hover:bg-white/10 rounded-lg">
                                <ZoomIn size={18} />
                            </button>

                            <div className="w-px h-6 bg-dark-600" />

                            {/* Page Navigation */}
                            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 2))} className="p-2 hover:bg-white/10 rounded-lg" disabled={currentPage <= 1}>
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-sm w-28 text-center">Pages {currentPage}-{Math.min(currentPage + 1, totalPages)} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 2))} className="p-2 hover:bg-white/10 rounded-lg" disabled={currentPage >= totalPages - 1}>
                                <ChevronRight size={18} />
                            </button>

                            <div className="w-px h-6 bg-dark-600" />

                            {/* Filter Lists (compact) */}
                            {wordLists.length > 0 && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                        className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2"
                                    >
                                        Filter
                                        {selectedListIds.length > 0 && (
                                            <span className="bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                                {selectedListIds.length}
                                            </span>
                                        )}
                                    </button>
                                    {showFilterDropdown && (
                                        <div className="absolute top-full left-0 mt-2 w-64 bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
                                            <p className="text-xs text-dark-400 uppercase tracking-wide mb-2">Highlight Lists</p>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {wordLists.map(list => (
                                                    <label key={list.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded p-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedListIds.length === 0 || selectedListIds.includes(list.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    if (selectedListIds.length > 0) {
                                                                        const newIds = [...selectedListIds, list.id];
                                                                        setSelectedListIds(newIds);
                                                                        loadWordColors(newIds);
                                                                    }
                                                                } else {
                                                                    if (selectedListIds.length === 0) {
                                                                        const newIds = wordLists.filter(l => l.id !== list.id).map(l => l.id);
                                                                        setSelectedListIds(newIds);
                                                                        loadWordColors(newIds);
                                                                    } else {
                                                                        const newIds = selectedListIds.filter(id => id !== list.id);
                                                                        setSelectedListIds(newIds);
                                                                        loadWordColors(newIds.length > 0 ? newIds : [-1]);
                                                                    }
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded"
                                                        />
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: list.color || '#eab308' }} />
                                                        <span className="text-sm truncate">{list.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Two-Page PDF View */}
                        <div
                            ref={focusContainerRef}
                            className="flex-1 overflow-auto p-8 pt-20"
                            onMouseUp={() => {
                                setIsPanning(false);
                                handleMouseUp();
                            }}
                            onMouseDown={(e) => {
                                // Only start panning if clicking on container, not on text
                                if (e.button === 0) {
                                    setIsPanning(true);
                                    panStart.current = {
                                        x: e.clientX,
                                        y: e.clientY,
                                        scrollLeft: focusContainerRef.current?.scrollLeft || 0,
                                        scrollTop: focusContainerRef.current?.scrollTop || 0
                                    };
                                }
                            }}
                            onMouseMove={(e) => {
                                if (isPanning && focusContainerRef.current) {
                                    const dx = e.clientX - panStart.current.x;
                                    const dy = e.clientY - panStart.current.y;
                                    focusContainerRef.current.scrollLeft = panStart.current.scrollLeft - dx;
                                    focusContainerRef.current.scrollTop = panStart.current.scrollTop - dy;
                                }
                            }}
                            onMouseLeave={() => setIsPanning(false)}
                            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                        >
                            <div className="inline-flex items-start justify-center gap-8 min-w-full min-h-full">
                                {/* Left Page */}
                                <div className="relative shadow-2xl rounded-lg overflow-visible bg-white shrink-0">
                                    <canvas ref={focusCanvasLeftRef} />
                                    <div ref={focusTextLayerLeftRef} className="pdf-text-layer absolute top-0 left-0" />
                                </div>

                                {/* Right Page (if exists) */}
                                {currentPage + 1 <= totalPages && (
                                    <div className="relative shadow-2xl rounded-lg overflow-visible bg-white shrink-0">
                                        <canvas ref={focusCanvasRightRef} />
                                        <div ref={focusTextLayerRightRef} className="pdf-text-layer absolute top-0 left-0" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Translation Panel - Draggable */}
                        {panel.show && (
                            <div
                                ref={panelRef}
                                className="fixed w-96 bg-dark-800/95 backdrop-blur rounded-xl p-4 shadow-2xl border border-dark-700 z-[10001] text-white"
                                style={{
                                    left: panelPosition ? panelPosition.x : '50%',
                                    top: panelPosition ? panelPosition.y : 'auto',
                                    bottom: panelPosition ? 'auto' : '1rem',
                                    transform: panelPosition ? 'none' : 'translateX(-50%)',
                                    cursor: 'default'
                                }}
                            >
                                {/* Drag Handle */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-8 cursor-move rounded-t-xl"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        const panel = panelRef.current;
                                        if (!panel) return;
                                        const rect = panel.getBoundingClientRect();
                                        const offsetX = e.clientX - rect.left;
                                        const offsetY = e.clientY - rect.top;

                                        const handleMove = (moveEvent: MouseEvent) => {
                                            setPanelPosition({
                                                x: moveEvent.clientX - offsetX,
                                                y: moveEvent.clientY - offsetY
                                            });
                                        };

                                        const handleUp = () => {
                                            document.removeEventListener('mousemove', handleMove);
                                            document.removeEventListener('mouseup', handleUp);
                                        };

                                        document.addEventListener('mousemove', handleMove);
                                        document.addEventListener('mouseup', handleUp);
                                    }}
                                />
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <p className="font-semibold text-lg">{panel.text}</p>
                                        {panel.isLoading ? (
                                            <div className="flex items-center gap-2 mt-2">
                                                <Loader2 size={16} className="animate-spin text-primary-500" />
                                                <span className="text-dark-400 text-sm">Translating...</span>
                                            </div>
                                        ) : (
                                            <p className="text-primary-400 mt-1">{panel.translation}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setPanel(prev => ({ ...prev, show: false }))}
                                        className="p-2 hover:bg-white/10 rounded-lg z-10 relative"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {!panel.isLoading && panel.translation && (
                                    <div className="border-t border-white/10 pt-3">
                                        <label className="text-xs text-dark-400 uppercase tracking-wide mb-2 block">Add to List</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {wordLists.slice(0, 3).map(list => (
                                                <button
                                                    key={list.id}
                                                    onClick={() => handleAddToList(list.id)}
                                                    className="px-3 py-1.5 text-sm bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center gap-2"
                                                >
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color || '#eab308' }} />
                                                    {list.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }
        </>
    );
}

export default PdfReader;
