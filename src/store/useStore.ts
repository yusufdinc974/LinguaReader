import { create } from 'zustand';
import type { PdfFile, WordList, Stats } from '../types';

interface AppState {
    // PDF State
    currentPdf: PdfFile | null;
    currentPage: number;
    totalPages: number;

    // Word Lists State
    wordLists: WordList[];
    selectedListId: number | null;

    // Settings
    targetLanguage: string;

    // Actions
    setCurrentPdf: (pdf: PdfFile | null) => void;
    setCurrentPage: (page: number) => void;
    setTotalPages: (total: number) => void;
    setWordLists: (lists: WordList[]) => void;
    setSelectedListId: (id: number | null) => void;
    setTargetLanguage: (lang: string) => void;

    // Async Actions (these call electron API)
    loadWordLists: () => Promise<void>;
    loadStats: () => Promise<Stats>;
}

export const useStore = create<AppState>((set) => ({
    // Initial State
    currentPdf: null,
    currentPage: 1,
    totalPages: 0,
    wordLists: [],
    selectedListId: null,
    targetLanguage: 'en',

    // Sync Actions
    setCurrentPdf: (pdf) => set({ currentPdf: pdf, currentPage: 1 }),
    setCurrentPage: (page) => set({ currentPage: page }),
    setTotalPages: (total) => set({ totalPages: total }),
    setWordLists: (lists) => set({ wordLists: lists }),
    setSelectedListId: (id) => set({ selectedListId: id }),
    setTargetLanguage: (lang) => set({ targetLanguage: lang }),

    // Async Actions
    loadWordLists: async () => {
        const lists = await window.electronAPI.getWordLists();
        set({ wordLists: lists });
    },

    loadStats: async () => {
        return await window.electronAPI.getStats();
    },
}));
