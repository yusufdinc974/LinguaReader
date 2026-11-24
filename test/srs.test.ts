// Run with: npm test  (Node 22.18+ runs TypeScript directly)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule, leavesSession, levelFromInterval, MAX_INTERVAL, type SrsState, type Grade } from '../src/lib/srs.ts';

const DAY = 86400000;
const t0 = new Date(2026, 0, 10, 12, 0, 0);
const at = (days: number) => new Date(t0.getTime() + days * DAY);
const fresh = (): SrsState => ({ easiness_factor: 2.5, interval: 0, repetitions: 0, next_review_date: t0.toISOString(), last_review_date: null, familiarity_level: 1 });

/** Reviews a word on its due day with the given first answers; returns the gaps. */
function run(grades: Grade[], start = fresh()) {
    let s = start, day = 0;
    const gaps: number[] = [];
    for (const g of grades) {
        const u = schedule(s, g, at(day));
        gaps.push(u.interval);
        s = { easiness_factor: u.easinessFactor, interval: u.interval, repetitions: u.repetitions, next_review_date: u.nextReviewDate, last_review_date: at(day).toISOString(), familiarity_level: u.level };
        day += u.interval;
    }
    return { gaps, state: s };
}

test('a known word grows steadily, not 6x per session', () => {
    const { gaps } = run([3, 3, 3, 3, 3, 3]);
    assert.deepEqual(gaps.slice(0, 2), [1, 4]);
    assert.ok(gaps[2] >= 9 && gaps[2] <= 12, `third gap ${gaps[2]}`);
    for (let i = 3; i < gaps.length; i++) assert.ok(gaps[i] / gaps[i - 1] < 3, `gap ${gaps[i]} after ${gaps[i - 1]}`);
});

test('gaps are capped at a year', () => {
    const { gaps } = run(Array(15).fill(3));
    assert.equal(Math.max(...gaps), MAX_INTERVAL);
});

test('"Didn\'t know" restarts the word at 1 day and lowers ease', () => {
    const { state } = run([3, 3, 3, 3]);
    const u = schedule(state, 1, at(100));
    assert.equal(u.interval, 1);
    assert.equal(u.repetitions, 0);
    assert.ok(u.easinessFactor < state.easiness_factor!);
    assert.equal(u.level, 2);
});

test('"Unsure" is a pass that still grows the gap', () => {
    const { gaps, state } = run([2, 2, 2, 2, 2, 2]);
    assert.ok(state.repetitions! === 6);
    assert.ok(gaps[5] > gaps[2], `unsure gaps should grow: ${gaps}`);
});

test('practising early does not push a word out', () => {
    const { state } = run([3, 3, 3]); // next gap ~10 days
    const scheduled = state.next_review_date;
    const u = schedule(state, 3, new Date(new Date(state.last_review_date!).getTime() + 1 * DAY));
    assert.ok(new Date(u.nextReviewDate) <= new Date(new Date(scheduled!).getTime() + 3 * DAY), 'early review should not inflate much');
    assert.ok(u.interval < state.interval! * 2);
});

test('a late correct answer gets some credit for the extra time', () => {
    const { state } = run([3, 3, 3]);
    const onTime = schedule(state, 3, new Date(new Date(state.last_review_date!).getTime() + state.interval! * DAY));
    const late = schedule(state, 3, new Date(new Date(state.last_review_date!).getTime() + (state.interval! + 30) * DAY));
    assert.ok(late.interval > onTime.interval);
});

test('a second session on the same day leaves the schedule alone', () => {
    const { state } = run([3, 3]);
    const sameDay = new Date(new Date(state.last_review_date!).getTime() + 60_000);
    const u = schedule(state, 3, sameDay);
    assert.equal(u.interval, state.interval);
    assert.equal(u.repetitions, state.repetitions);
    assert.equal(u.nextReviewDate, new Date(state.next_review_date!).toISOString());
});

test('SQLite CURRENT_TIMESTAMP is read as a last review date', () => {
    const { state } = run([3, 3]);
    const d = new Date(state.last_review_date!);
    const sqlite = d.toISOString().slice(0, 19).replace('T', ' ');
    const u = schedule({ ...state, last_review_date: sqlite }, 3, new Date(d.getTime() + 60_000));
    assert.equal(u.interval, state.interval);
});

test('a word saved as Known stays Known when answered right', () => {
    const known: SrsState = { easiness_factor: 2.7, interval: 14, repetitions: 4, next_review_date: at(14).toISOString(), last_review_date: null, familiarity_level: 5 };
    const u = schedule(known, 3, at(14));
    assert.equal(u.level, 5);
    assert.ok(u.interval > 14);
});

test('levels follow the gap and Known is reachable by reviewing', () => {
    assert.deepEqual([0, 1, 5, 30, 120].map(levelFromInterval), [1, 2, 3, 4, 5]);
    const { state } = run(Array(8).fill(3));
    assert.equal(state.familiarity_level, 5);
    const fail = run([1, 3, 3]).state;
    assert.ok(fail.familiarity_level! < 4, 'a failed new word must not show Familiar');
});

test('a word leaves the session on "Knew it" only', () => {
    assert.equal(leavesSession(3), true);
    assert.equal(leavesSession(2), false);
    assert.equal(leavesSession(1), false);
});
