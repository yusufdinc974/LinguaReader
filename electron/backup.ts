// Checks a backup file or a phone sync upload before it is imported.
// Both come from outside the app, so every field is checked for type and size
// and anything unexpected is dropped rather than written to the database.

const MAX_ROWS = 200_000;
const MAX_TEXT = 10_000;

export interface BackupList { id: number; name: string; description: string | null; color: string | null; created_at: string | null }
export interface BackupWord {
    id: number; word: string; translation: string; source_language: string; target_language: string;
    sentence_context: string | null; pdf_name: string | null; created_at: string | null; mastery_level: number;
}
export interface BackupItem { word_list_id: number; word_id: number }
export interface BackupFamiliarity {
    word_lower: string; familiarity_level: number; translation: string | null; easiness_factor: number;
    interval: number; repetitions: number; next_review_date: string | null; last_review_date: string | null;
}
export interface BackupSetting { key: string; value: string }
export interface Backup {
    version: number;
    wordLists: BackupList[];
    words: BackupWord[];
    wordListItems: BackupItem[];
    wordFamiliarity: BackupFamiliarity[];
    userSettings: BackupSetting[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, d: number | null = null) => (typeof v === 'number' && Number.isInteger(v) && Number.isSafeInteger(v) ? v : d);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const text = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' && v.length <= max ? v : null);
// Lists exported by the phone app carry the color as a number or "0xFFRRGGBB".
const color = (v: unknown) => {
    if (typeof v === 'number' && Number.isInteger(v)) v = '0x' + (v >>> 0).toString(16).padStart(8, '0');
    if (typeof v !== 'string') return null;
    if (/^0x[0-9a-fA-F]{8}$/.test(v)) return '#' + v.substring(4);
    return /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : null;
};
const date = (v: unknown) => (typeof v === 'string' && v.length <= 40 && /^\d{4}-\d{2}-\d{2}/.test(v) ? v : null);

function rows(v: unknown, field: string): unknown[] {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) throw new Error(`${field} is not a list`);
    if (v.length > MAX_ROWS) throw new Error(`${field} has too many entries`);
    return v;
}

/** Returns a cleaned copy of `data`, or throws with a short reason. */
export function parseBackup(data: unknown): Backup {
    if (!isObj(data) || !data.version || !Array.isArray(data.wordLists) || !Array.isArray(data.words)) {
        throw new Error('Invalid backup file format');
    }
    const wordLists: BackupList[] = [];
    for (const r of rows(data.wordLists, 'wordLists')) {
        if (!isObj(r)) continue;
        const id = int(r.id);
        const name = text(r.name, 500);
        if (id === null || !name) continue;
        wordLists.push({ id, name, description: text(r.description), color: color(r.color), created_at: date(r.created_at) });
    }
    const words: BackupWord[] = [];
    for (const r of rows(data.words, 'words')) {
        if (!isObj(r)) continue;
        const id = int(r.id);
        const word = text(r.word, 1000);
        const translation = text(r.translation);
        if (id === null || !word || translation === null) continue;
        words.push({
            id, word, translation,
            source_language: text(r.source_language, 20) ?? '',
            target_language: text(r.target_language, 20) ?? '',
            sentence_context: text(r.sentence_context),
            pdf_name: text(r.pdf_name, 1000),
            created_at: date(r.created_at),
            mastery_level: int(r.mastery_level, 0)!,
        });
    }
    const wordListItems: BackupItem[] = [];
    for (const r of rows(data.wordListItems, 'wordListItems')) {
        if (!isObj(r)) continue;
        const word_list_id = int(r.word_list_id);
        const word_id = int(r.word_id);
        if (word_list_id !== null && word_id !== null) wordListItems.push({ word_list_id, word_id });
    }
    const wordFamiliarity: BackupFamiliarity[] = [];
    for (const r of rows(data.wordFamiliarity, 'wordFamiliarity')) {
        if (!isObj(r)) continue;
        const word_lower = text(r.word_lower, 1000);
        if (!word_lower) continue;
        wordFamiliarity.push({
            word_lower,
            familiarity_level: Math.min(5, Math.max(0, int(r.familiarity_level, 1)!)),
            translation: text(r.translation),
            easiness_factor: Math.min(5, Math.max(1.3, num(r.easiness_factor, 2.5))),
            interval: Math.min(36500, Math.max(0, int(r.interval, 0)!)),
            repetitions: Math.min(100000, Math.max(0, int(r.repetitions, 0)!)),
            next_review_date: date(r.next_review_date),
            last_review_date: date(r.last_review_date),
        });
    }
    const userSettings: BackupSetting[] = [];
    for (const r of rows(data.userSettings, 'userSettings')) {
        if (!isObj(r)) continue;
        const key = text(r.key, 100);
        const value = text(r.value, 1000);
        if (key && value !== null) userSettings.push({ key, value });
    }
    return { version: int(data.version, 1)!, wordLists, words, wordListItems, wordFamiliarity, userSettings };
}
