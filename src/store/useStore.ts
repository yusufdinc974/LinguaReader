import { create } from 'zustand';
import type { PdfFile } from '../types';

interface AppState {
    currentPdf: PdfFile | null;
    currentPage: number;
    totalPages: number;
    /** Reader focus mode: hides the app sidebar. */
    focus: boolean;
    /** Bumped whenever words/lists change so badges can refresh. */
    dataVersion: number;

    setCurrentPdf: (pdf: PdfFile | null) => void;
    setCurrentPage: (page: number) => void;
    setTotalPages: (total: number) => void;
    setFocus: (focus: boolean) => void;
    bumpData: () => void;
}

export const useStore = create<AppState>(set => ({
    currentPdf: null,
    currentPage: 1,
    totalPages: 0,
    focus: false,
    dataVersion: 0,

    setCurrentPdf: pdf => set({ currentPdf: pdf, currentPage: 1 }),
    setCurrentPage: page => set({ currentPage: page }),
    setTotalPages: total => set({ totalPages: total }),
    setFocus: focus => set({ focus }),
    bumpData: () => set(s => ({ dataVersion: s.dataVersion + 1 })),
}));
