/**
 * SM-2 Spaced Repetition Algorithm Service
 * 
 * Based on the SuperMemo 2 algorithm by Piotr Wozniak.
 * 
 * Quality scores (0-5):
 * 5 - Perfect response
 * 4 - Correct response after hesitation
 * 3 - Correct with significant difficulty
 * 2 - Incorrect; correct seemed easy to recall
 * 1 - Incorrect; correct one remembered
 * 0 - Complete blackout
 * 
 * Familiarity levels (1-5) are mapped from EF:
 * Level 1 (Unknown): EF < 1.7
 * Level 2 (Seen): 1.7 <= EF < 2.0
 * Level 3 (Learning): 2.0 <= EF < 2.3
 * Level 4 (Familiar): 2.3 <= EF < 2.6
 * Level 5 (Mastered): EF >= 2.6
 */

export interface SRSData {
    easinessFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: string | null;
    lastReviewDate: string | null;
    familiarityLevel: number;
}

export interface ReviewResult {
    newEasinessFactor: number;
    newInterval: number;
    newRepetitions: number;
    nextReviewDate: string;
    familiarityLevel: number;
}

// Default values for new words
export const DEFAULT_SRS_DATA: SRSData = {
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: null,
    lastReviewDate: null,
    familiarityLevel: 1,
};

/**
 * Calculate familiarity level from Easiness Factor
 */
export function efToFamiliarityLevel(ef: number): number {
    if (ef < 1.7) return 1;      // Unknown
    if (ef < 2.0) return 2;       // Seen
    if (ef < 2.3) return 3;       // Learning
    if (ef < 2.6) return 4;       // Familiar
    return 5;                      // Mastered
}

/**
 * Calculate new Easiness Factor based on quality of response
 * Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 * EF cannot fall below 1.3
 */
export function calculateNewEF(currentEF: number, quality: number): number {
    const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    return Math.max(1.3, newEF);
}

/**
 * Process a review and calculate new SRS data
 * 
 * @param currentData - Current SRS data for the word
 * @param quality - Quality of response (0-5)
 * @returns New SRS data after review
 */
export function processReview(currentData: SRSData, quality: number): ReviewResult {
    // Clamp quality to 0-5
    quality = Math.max(0, Math.min(5, Math.round(quality)));

    let newEF = currentData.easinessFactor;
    let newInterval: number;
    let newRepetitions: number;

    if (quality < 3) {
        // Failed recall - reset repetitions, EF stays the same
        newRepetitions = 0;
        newInterval = 1; // Review tomorrow
        // Slightly decrease EF on failure (optional enhancement)
        newEF = Math.max(1.3, currentData.easinessFactor - 0.2);
    } else {
        // Successful recall
        newEF = calculateNewEF(currentData.easinessFactor, quality);
        newRepetitions = currentData.repetitions + 1;

        // Calculate new interval
        if (newRepetitions === 1) {
            newInterval = 1;
        } else if (newRepetitions === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.ceil(currentData.interval * newEF);
        }
    }

    // Calculate next review date
    const now = new Date();
    const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    return {
        newEasinessFactor: newEF,
        newInterval: newInterval,
        newRepetitions: newRepetitions,
        nextReviewDate: nextReview.toISOString(),
        familiarityLevel: efToFamiliarityLevel(newEF),
    };
}

/**
 * Check if a word is due for review
 */
export function isDueForReview(nextReviewDate: string | null): boolean {
    if (!nextReviewDate) return true; // New word, needs first review

    const now = new Date();
    const reviewDate = new Date(nextReviewDate);
    return now >= reviewDate;
}

/**
 * Map quiz correctness to quality score
 * true = correct (quality 4-5 based on speed/confidence)
 * false = incorrect (quality 0-2)
 */
export function booleanToQuality(correct: boolean, wasHard: boolean = false): number {
    if (correct) {
        return wasHard ? 3 : 5;
    } else {
        return wasHard ? 0 : 2;
    }
}

/**
 * Get words that are due for review today
 */
export function getWordsForReviewToday(words: Array<{
    word_lower: string;
    next_review_date: string | null;
}>): string[] {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    return words
        .filter(w => {
            if (!w.next_review_date) return true;
            return new Date(w.next_review_date) <= today;
        })
        .map(w => w.word_lower);
}
