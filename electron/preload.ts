import { contextBridge, ipcRenderer } from 'electron';

export interface PdfFile {
    name: string;
    path: string;
    data: string;
}

export interface WordList {
    id: number;
    name: string;
    description: string;
    created_at: string;
}

export interface Word {
    id: number;
    word: string;
    translation: string;
    source_language: string;
    target_language: string;
    sentence_context: string;
    pdf_name: string;
    created_at: string;
    mastery_level: number;
}

export interface QuizResult {
    id: number;
    word_list_id: number;
    score: number;
    total_questions: number;
    quiz_type: string;
    completed_at: string;
    list_name?: string;
}

export interface Stats {
    totalWords: number;
    totalLists: number;
    totalQuizzes: number;
    averageScore: number;
    masteryDistribution: { mastery_level: number; count: number }[];
    recentQuizzes: QuizResult[];
}

export interface RecentPdf {
    id: number;
    name: string;
    path: string;
    last_opened: string;
}

export interface WordFamiliarity {
    id: number;
    word_lower: string;
    familiarity_level: number;
    translation: string | null;
    easiness_factor: number;
    interval: number;
    repetitions: number;
    next_review_date: string | null;
    last_review_date: string | null;
    updated_at: string;
}

const electronAPI = {
    // PDF
    openPdfDialog: (): Promise<PdfFile | null> => ipcRenderer.invoke('open-pdf-dialog'),

    // Word Lists
    getWordLists: (): Promise<WordList[]> => ipcRenderer.invoke('get-word-lists'),
    createWordList: (name: string, description: string): Promise<number> =>
        ipcRenderer.invoke('create-word-list', name, description),
    deleteWordList: (id: number): Promise<boolean> => ipcRenderer.invoke('delete-word-list', id),
    updateWordList: (id: number, name: string, description: string): Promise<boolean> =>
        ipcRenderer.invoke('update-word-list', id, name, description),

    // Words
    getWordsInList: (listId: number): Promise<Word[]> => ipcRenderer.invoke('get-words-in-list', listId),
    getAllWords: (): Promise<Word[]> => ipcRenderer.invoke('get-all-words'),
    addWord: (word: string, translation: string, sourceLang: string, targetLang: string, context: string, pdfName: string): Promise<number> =>
        ipcRenderer.invoke('add-word', word, translation, sourceLang, targetLang, context, pdfName),
    addWordToList: (wordId: number, listId: number): Promise<boolean> =>
        ipcRenderer.invoke('add-word-to-list', wordId, listId),
    removeWordFromList: (wordId: number, listId: number): Promise<boolean> =>
        ipcRenderer.invoke('remove-word-from-list', wordId, listId),
    moveWordToList: (wordId: number, fromListId: number, toListId: number): Promise<{ success: boolean; message?: string }> =>
        ipcRenderer.invoke('move-word-to-list', wordId, fromListId, toListId),
    updateWordMastery: (wordId: number, masteryLevel: number): Promise<boolean> =>
        ipcRenderer.invoke('update-word-mastery', wordId, masteryLevel),
    deleteWord: (id: number): Promise<boolean> => ipcRenderer.invoke('delete-word', id),

    // Quiz
    saveQuizResult: (listId: number, score: number, total: number, quizType: string): Promise<number> =>
        ipcRenderer.invoke('save-quiz-result', listId, score, total, quizType),
    getQuizResults: (listId?: number): Promise<QuizResult[]> => ipcRenderer.invoke('get-quiz-results', listId),

    // Stats
    getStats: (): Promise<Stats> => ipcRenderer.invoke('get-stats'),

    // Settings
    getSetting: (key: string): Promise<string | undefined> => ipcRenderer.invoke('get-setting', key),
    setSetting: (key: string, value: string): Promise<boolean> => ipcRenderer.invoke('set-setting', key, value),

    // Translation
    translateText: (text: string, targetLang?: string): Promise<{ translatedText: string; detectedLanguage: string }> =>
        ipcRenderer.invoke('translate-text', text, targetLang),

    // Recent PDFs
    getRecentPdfs: (): Promise<RecentPdf[]> => ipcRenderer.invoke('get-recent-pdfs'),
    addRecentPdf: (name: string, path: string): Promise<boolean> => ipcRenderer.invoke('add-recent-pdf', name, path),
    openPdfByPath: (path: string): Promise<PdfFile | null> => ipcRenderer.invoke('open-pdf-by-path', path),
    getLastPdfPath: (): Promise<string | undefined> => ipcRenderer.invoke('get-last-pdf-path'),

    // Word Familiarity with SRS
    getWordFamiliarity: (wordLower: string): Promise<WordFamiliarity | null> =>
        ipcRenderer.invoke('get-word-familiarity', wordLower),
    setWordFamiliarity: (wordLower: string, level: number, translation: string, ef?: number): Promise<boolean> =>
        ipcRenderer.invoke('set-word-familiarity', wordLower, level, translation, ef),
    updateWordSRS: (
        wordLower: string,
        ef: number,
        interval: number,
        repetitions: number,
        nextReviewDate: string,
        familiarityLevel: number
    ): Promise<boolean> => ipcRenderer.invoke('update-word-srs', wordLower, ef, interval, repetitions, nextReviewDate, familiarityLevel),
    getAllWordFamiliarity: (): Promise<WordFamiliarity[]> => ipcRenderer.invoke('get-all-word-familiarity'),
    getWordsDueForReview: (): Promise<WordFamiliarity[]> => ipcRenderer.invoke('get-words-due-for-review'),
    getReviewSchedule: (): Promise<{
        overdue: number;
        dueToday: number;
        dueSoon: number;
        good: number;
        mastered: number;
        totalWords: number;
        upcomingDays: { [date: string]: number };
    }> => ipcRenderer.invoke('get-review-schedule'),
    getWordColors: (listIds?: number[]): Promise<{ word_lower: string; color: string }[]> => ipcRenderer.invoke('get-word-colors', listIds),

    // Data Import/Export
    exportData: (): Promise<{ success: boolean; path?: string; error?: string }> =>
        ipcRenderer.invoke('export-data'),
    importData: (): Promise<{ success: boolean; imported?: { lists: number; words: number; familiarity: number }; error?: string }> =>
        ipcRenderer.invoke('import-data'),
    importParsedBackup: (data: unknown): Promise<{ success: boolean; imported?: { lists: number; words: number; familiarity: number }; error?: string }> =>
        ipcRenderer.invoke('import-parsed-backup', data),
    parseImportFile: (): Promise<{
        success: boolean;
        cancelled?: boolean;
        type?: 'full-backup' | 'words-only';
        data?: unknown;
        listName?: string | null;
        listDescription?: string;
        words?: Array<{ word: string; translation: string; source_language?: string; target_language?: string }>;
        error?: string;
    }> => ipcRenderer.invoke('parse-import-file'),
    importWordsToList: (listId: number, words: Array<{ word: string; translation: string; source_language?: string; target_language?: string }>): Promise<{
        success: boolean;
        imported?: { words: number; familiarity: number };
        error?: string;
    }> => ipcRenderer.invoke('import-words-to-list', listId, words),
    exportList: (listId: number, includeProgress: boolean): Promise<{
        success: boolean;
        path?: string;
        wordCount?: number;
        error?: string;
    }> => ipcRenderer.invoke('export-list', listId, includeProgress),

    // Sync Server
    startSyncServer: (): Promise<{ success: boolean; info?: { ip: string; port: number; pin: string; qrDataURL: string }; error?: string }> =>
        ipcRenderer.invoke('start-sync-server'),
    stopSyncServer: (): Promise<{ success: boolean; error?: string }> =>
        ipcRenderer.invoke('stop-sync-server'),

    // Auto-update
    checkForUpdates: (): Promise<{
        hasUpdate: boolean;
        version?: string;
        downloadUrl?: string;
        releaseDate?: string;
        error?: string;
    }> => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: (): Promise<boolean> => ipcRenderer.invoke('download-update'),
    installUpdate: (): Promise<void> => ipcRenderer.invoke('install-update'),
    openReleasePage: (): Promise<void> => ipcRenderer.invoke('open-release-page'),
    getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
    onUpdateStatus: (callback: (status: {
        status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
        version?: string;
        percent?: number;
        message?: string;
    }) => void) => {
        ipcRenderer.on('update-status', (_, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('update-status');
    },

    // Sync Status Listener
    onSyncStatus: (callback: (status: { status: 'uploading' | 'downloading' | 'completed' | 'error'; message: string }) => void) => {
        console.log('[Preload] Setting up sync status listener');
        const handler = (_: any, data: any) => {
            console.log('[Preload] Received sync-status:', data);
            callback(data);
        };
        ipcRenderer.on('sync-status', handler);
        return () => {
            console.log('[Preload] Removing sync status listener');
            ipcRenderer.removeListener('sync-status', handler);
        };
    },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
    interface Window {
        electronAPI: typeof electronAPI;
    }
}
