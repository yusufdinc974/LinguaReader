/// <reference types="vite/client" />

interface RecentPdf {
    id: number;
    name: string;
    path: string;
    last_opened: string;
}

interface WordFamiliarity {
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

interface Window {
    electronAPI: {
        // PDF
        openPdfDialog: () => Promise<{
            name: string;
            path: string;
            data: string;
        } | null>;

        // Word Lists
        getWordLists: () => Promise<Array<{
            id: number;
            name: string;
            description: string;
            created_at: string;
        }>>;
        createWordList: (name: string, description: string) => Promise<number>;
        deleteWordList: (id: number) => Promise<boolean>;
        updateWordList: (id: number, name: string, description: string) => Promise<boolean>;

        // Words
        getWordsInList: (listId: number) => Promise<Array<{
            id: number;
            word: string;
            translation: string;
            source_language: string;
            target_language: string;
            sentence_context: string;
            pdf_name: string;
            created_at: string;
            mastery_level: number;
            familiarity_level?: number;
            easiness_factor?: number;
            next_review_date?: string;
        }>>;
        getAllWords: () => Promise<Array<{
            id: number;
            word: string;
            translation: string;
            source_language: string;
            target_language: string;
            sentence_context: string;
            pdf_name: string;
            created_at: string;
            mastery_level: number;
            familiarity_level?: number;
            easiness_factor?: number;
            next_review_date?: string;
        }>>;
        addWord: (
            word: string,
            translation: string,
            sourceLang: string,
            targetLang: string,
            context: string,
            pdfName: string
        ) => Promise<number>;
        addWordToList: (wordId: number, listId: number) => Promise<boolean>;
        removeWordFromList: (wordId: number, listId: number) => Promise<boolean>;
        moveWordToList: (wordId: number, fromListId: number, toListId: number) => Promise<{ success: boolean; message?: string }>;
        updateWordMastery: (wordId: number, masteryLevel: number) => Promise<boolean>;
        deleteWord: (id: number) => Promise<boolean>;

        // Quiz
        saveQuizResult: (
            listId: number,
            score: number,
            total: number,
            quizType: string
        ) => Promise<number>;
        getQuizResults: (listId?: number) => Promise<Array<{
            id: number;
            word_list_id: number;
            score: number;
            total_questions: number;
            quiz_type: string;
            completed_at: string;
            list_name?: string;
        }>>;

        // Stats
        getStats: () => Promise<{
            totalWords: number;
            totalLists: number;
            totalQuizzes: number;
            averageScore: number;
            masteryDistribution: Array<{ mastery_level: number; count: number }>;
            recentQuizzes: Array<{
                id: number;
                word_list_id: number;
                score: number;
                total_questions: number;
                quiz_type: string;
                completed_at: string;
                list_name?: string;
            }>;
        }>;

        // Settings
        getSetting: (key: string) => Promise<string | undefined>;
        setSetting: (key: string, value: string) => Promise<boolean>;
        translateText: (text: string, targetLang?: string) => Promise<{ translatedText: string; detectedLanguage: string; source: string }>;

        // Recent PDFs
        getRecentPdfs: () => Promise<RecentPdf[]>;
        addRecentPdf: (name: string, path: string) => Promise<boolean>;
        openPdfByPath: (path: string) => Promise<{
            name: string;
            path: string;
            data: string;
        } | null>;
        getLastPdfPath: () => Promise<string | undefined>;

        // Word Familiarity with SRS
        getWordFamiliarity: (wordLower: string) => Promise<WordFamiliarity | null>;
        setWordFamiliarity: (wordLower: string, level: number, translation: string, ef?: number) => Promise<boolean>;
        updateWordSRS: (
            wordLower: string,
            ef: number,
            interval: number,
            repetitions: number,
            nextReviewDate: string,
            familiarityLevel: number
        ) => Promise<boolean>;
        getAllWordFamiliarity: () => Promise<WordFamiliarity[]>;
        getWordsDueForReview: () => Promise<WordFamiliarity[]>;
        getReviewSchedule: () => Promise<{
            overdue: number;
            dueToday: number;
            dueSoon: number;
            good: number;
            mastered: number;
            totalWords: number;
            upcomingDays: { [date: string]: number };
        }>;
        getWordColors: (listIds?: number[]) => Promise<{ word_lower: string; color: string }[]>;

        // Data Import/Export
        exportData: () => Promise<{ success: boolean; path?: string; error?: string }>;
        importData: () => Promise<{ success: boolean; imported?: { lists: number; words: number; familiarity: number }; error?: string }>;
        importParsedBackup: (data: unknown) => Promise<{ success: boolean; imported?: { lists: number; words: number; familiarity: number }; error?: string }>;
        parseImportFile: () => Promise<{
            success: boolean;
            cancelled?: boolean;
            type?: 'full-backup' | 'words-only';
            data?: unknown;
            listName?: string | null;
            listDescription?: string;
            words?: Array<{ word: string; translation: string; source_language?: string; target_language?: string }>;
            error?: string;
        }>;
        importWordsToList: (listId: number, words: Array<{ word: string; translation: string; source_language?: string; target_language?: string }>) => Promise<{
            success: boolean;
            imported?: { words: number; familiarity: number };
            error?: string;
        }>;
        exportList: (listId: number, includeProgress: boolean) => Promise<{
            success: boolean;
            path?: string;
            wordCount?: number;
            error?: string;
        }>;

        // Auto-update
        checkForUpdates: () => Promise<{
            hasUpdate: boolean;
            version?: string;
            downloadUrl?: string;
            releaseDate?: string;
            error?: string;
        }>;
        downloadUpdate: () => Promise<boolean>;
        installUpdate: () => Promise<void>;
        openReleasePage: () => Promise<void>;
        getAppVersion: () => Promise<string>;
        onUpdateStatus: (callback: (status: {
            status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
            version?: string;
            percent?: number;
            message?: string;
        }) => void) => () => void;

        onSyncStatus: (callback: (status: {
            status: 'uploading' | 'downloading' | 'completed' | 'error';
            message: string
        }) => void) => () => void;

        // Sync Server
        startSyncServer: () => Promise<{ success: boolean; info?: { ip: string; port: number; pin: string; qrDataURL: string }; error?: string }>;
        stopSyncServer: () => Promise<{ success: boolean; error?: string }>;
    };
}
