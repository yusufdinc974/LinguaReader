import type { TranslationResult } from '../types';

export async function translateText(
    text: string,
    targetLang: string = 'en'
): Promise<TranslationResult> {
    try {
        // Delegate to main process (supports DeepL Key + MyMemory Fallback)
        return await window.electronAPI.translateText(text, targetLang);
    } catch (error) {
        console.error('Translation failed:', error);
        throw new Error('Translation failed. Please try again.');
    }
}

// Available languages for translation target
export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pl', name: 'Polish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'es', name: 'Spanish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'uk', name: 'Ukrainian' },
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
    { code: 'ru', name: 'Russian' },
];
