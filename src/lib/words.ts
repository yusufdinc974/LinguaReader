/**
 * The one key used to link a saved word to its review progress
 * (word_familiarity.word_lower). Keep identical to electron/wordKey.ts.
 */
export function wordKey(text: string) {
    return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

const CJK = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー々';
/** Line breaks between Chinese/Japanese characters are not word breaks. */
const CJK_GAP = new RegExp(`(?<=[${CJK}])\\s+(?=[${CJK}])`, 'gu');

/**
 * Cleans a reader selection before it's translated and saved: trims
 * punctuation and quotes from both ends ("étals," → "étals") and joins
 * lines with single spaces. Inner apostrophes and hyphens stay.
 */
export function cleanSelection(text: string) {
    return text
        .replace(CJK_GAP, '')
        .replace(/\s+/g, ' ')
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
        .trim();
}

export const LEVELS: Record<number, { label: string; color: string }> = {
    1: { label: 'New', color: '#c8553d' },
    2: { label: 'Seen', color: '#d08a3a' },
    3: { label: 'Learning', color: '#c9a83b' },
    4: { label: 'Familiar', color: '#5f9a5a' },
    5: { label: 'Known', color: '#4f7fb0' },
};

export const LIST_COLORS = [
    '#c8553d', '#d08a3a', '#c9a83b', '#5f9a5a', '#3f8f84',
    '#4f7fb0', '#6c6fc2', '#9467b8', '#b65f8f', '#7d7a72',
];

export const DEFAULT_LIST_COLOR = '#eab308';
