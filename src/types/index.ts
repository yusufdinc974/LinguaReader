export interface PdfFile {
    name: string;
    path: string;
    data: string;
}

export interface WordList {
    id: number;
    name: string;
    description: string;
    color?: string;
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
    familiarity_level?: number;
    easiness_factor?: number;
    next_review_date?: string;
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

export interface TranslationResult {
    translatedText: string;
    detectedLanguage?: string;
}

export type QuizType = 'flashcard' | 'multiple-choice' | 'reverse';

export interface QuizQuestion {
    word: Word;
    options?: string[];
    correctAnswer: string;
}
