import type { TranslationResult } from '../types';

// MyMemory - Free translation API with 10,000 words/day limit
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

export async function translateText(
    text: string,
    targetLang: string = 'en',
    sourceLang: string = 'auto'
): Promise<TranslationResult> {
    try {
        // Delegate to main process (supports DeepL Key + MyMemory Fallback)
        return await window.electronAPI.translateText(text, targetLang);
    } catch (error) {
        console.error('Translation failed:', error);
        throw new Error('Translation failed. Please try again.');
    }
}

export async function detectLanguage(text: string): Promise<string> {
    try {
        // MyMemory auto-detects when source is empty
        const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=|en`;
        const response = await fetch(url);

        if (!response.ok) {
            return 'unknown';
        }

        const data = await response.json();
        return data.responseData?.detectedLanguage || 'unknown';
    } catch {
        return 'unknown';
    }
}

// Available languages (Latin alphabet only for now)
export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pl', name: 'Polish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'es', name: 'Spanish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fi', name: 'Finnish' },
    { code: 'cs', name: 'Czech' },
    { code: 'ro', name: 'Romanian' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'id', name: 'Indonesian' },
];
