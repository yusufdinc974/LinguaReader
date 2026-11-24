/**
 * Review scheduling for saved words (SM-2 family).
 *
 * Grades match the review buttons: 1 Didn't know, 2 Unsure, 3 Knew it.
 *
 * Rules:
 * - Only "Didn't know" is a lapse: the word restarts at 1 day and gets harder.
 * - "Unsure" is a pass with a small step (×1.2) and a small ease penalty.
 * - "Knew it" grows the gap by the word's ease factor.
 * - The next gap is based on the days that really passed since the last
 *   review, so practising early can't push a word out, and a late correct
 *   answer gets half of the extra time as credit.
 * - Practising a word again on the day it was already reviewed doesn't move
 *   its schedule (unless you miss it).
 * - Gaps are capped at MAX_INTERVAL days so every word stays in rotation.
 *
 * The caller must apply this once per word per session (its first answer).
 */

export type Grade = 1 | 2 | 3;

export interface SrsState {
    easiness_factor: number | null;
    interval: number | null;
    repetitions: number | null;
    next_review_date: string | null;
    last_review_date: string | null;
    familiarity_level?: number | null;
}

export interface SrsUpdate {
    easinessFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: string;
    level: number;
}

export const MIN_EF = 1.3;
export const MAX_EF = 3.0;
export const MAX_INTERVAL = 365;
const DAY = 24 * 60 * 60 * 1000;

/** Parses ISO strings and SQLite's CURRENT_TIMESTAMP ("YYYY-MM-DD HH:MM:SS", UTC). */
export function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
}

/** Whole local calendar days from a to b. */
export function daysBetween(a: Date, b: Date): number {
    const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((db - da) / DAY);
}

/** Level shown in the app, from how far out the word is scheduled. */
export function levelFromInterval(interval: number): number {
    if (interval <= 0) return 1;  // New
    if (interval < 3) return 2;   // Seen
    if (interval < 21) return 3;  // Learning
    if (interval < 90) return 4;  // Familiar
    return 5;                     // Known
}

function addDays(now: Date, days: number): string {
    const next = new Date(now);
    next.setDate(next.getDate() + days);
    return next.toISOString();
}

export function schedule(state: SrsState, grade: Grade, now: Date = new Date()): SrsUpdate {
    const ef = state.easiness_factor ?? 2.5;
    const interval = Math.max(0, state.interval ?? 0);
    const reps = Math.max(0, state.repetitions ?? 0);
    const due = parseDate(state.next_review_date);
    // When the word was last scheduled: the last review, or (for words that were
    // only saved with a level) the date its current gap started.
    const last = parseDate(state.last_review_date) ?? (due ? new Date(due.getTime() - interval * DAY) : null);
    const elapsed = last ? Math.max(0, daysBetween(last, now)) : interval;
    const remaining = due ? Math.max(0, daysBetween(now, due)) : 0;
    const prevLevel = state.familiarity_level ?? levelFromInterval(interval);

    if (grade === 1) {
        return {
            easinessFactor: Math.max(MIN_EF, ef - 0.2),
            interval: 1,
            repetitions: 0,
            nextReviewDate: addDays(now, 1),
            level: levelFromInterval(1),
        };
    }

    // Already reviewed today: extra practice doesn't move the schedule.
    if (state.last_review_date && elapsed === 0 && reps > 0) {
        return {
            easinessFactor: ef,
            interval,
            repetitions: reps,
            nextReviewDate: due ? due.toISOString() : addDays(now, interval),
            level: Math.max(prevLevel, levelFromInterval(interval)),
        };
    }

    const newReps = reps + 1;
    const newEf = grade === 2 ? Math.max(MIN_EF, ef - 0.15) : Math.min(MAX_EF, ef + 0.05);
    let next: number;
    if (newReps === 1) next = 1;
    else if (newReps === 2) next = grade === 2 ? 2 : 4;
    else {
        const base = Math.min(elapsed, interval) + Math.max(0, elapsed - interval) / 2;
        const mult = grade === 2 ? 1.2 : newEf;
        next = Math.max(remaining, Math.round(base + 1), Math.round(base * mult));
    }
    next = Math.min(MAX_INTERVAL, Math.max(1, next));

    return {
        easinessFactor: newEf,
        interval: next,
        repetitions: newReps,
        nextReviewDate: addDays(now, next),
        // A correct answer never lowers the level you see.
        level: Math.max(prevLevel, levelFromInterval(next)),
    };
}
