// Shapes shared by the Anki import in the main process and the window.

export interface FieldMap {
    word: number;
    translation: number;
    /** -1 for none */
    sentence: number;
}

export interface AnkiOpenResult {
    success: boolean;
    cancelled?: boolean;
    error?: string;
    /** The file's name without .apkg */
    fileName?: string;
    decks?: { id: number; name: string; notes: number }[];
    noteTypes?: { id: number; name: string; fields: string[]; notes: number; guess: FieldMap; samples: string[][] }[];
    /** Notes whose cards have been studied in Anki */
    studied?: number;
}

export interface AnkiImportOptions {
    /** null = every deck in the file */
    decks: number[] | null;
    maps: Record<number, FieldMap>;
    /** null = a new list called listName */
    listId: number | null;
    listName: string;
    /** Language of the words */
    lang: string;
    keepProgress: boolean;
}
