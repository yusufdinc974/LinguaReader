// Shared word helpers. Normalisation rules are kept exactly as they were in
// the old pages so stored keys keep matching.

/** Key used by the reader for word_familiarity (lowercase, single spaces). */
export function phraseKey(text: string) {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Key used by the quiz/review code when looking up due words in a list. */
export function reviewKey(word: string) {
    return word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ\s]/gi, '').toLowerCase();
}

/** Key used by the quiz/review code when updating SRS data. */
export function srsKey(word: string) {
    return word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ]/gi, '');
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
