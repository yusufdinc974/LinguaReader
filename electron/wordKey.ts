/**
 * The one key used to link a saved word to its review progress
 * (word_familiarity.word_lower). Unicode-aware lowercase, NFC, single spaces.
 *
 * Keep identical to `wordKey` in src/lib/words.ts. It matches the phone
 * app's `toLowerCase()` for any single-line word, so sync keeps lining up.
 */
export function wordKey(text: string): string {
    if (typeof text !== 'string') return text;
    return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Keys earlier versions may have written for the same word, newest first. */
export function legacyKeys(word: string): string[] {
    const lower = word.toLowerCase();
    const latin = /[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ\s]/gi;
    return [
        lower.replace(/\s+/g, ' ').trim(), // reader before this fix
        lower,                              // delete/remove paths, phone app
        lower.replace(latin, ''),           // list import / export
        lower.replace(latin, '').replace(/\s+/g, ''), // quiz SRS updates
    ];
}
