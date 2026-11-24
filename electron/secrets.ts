// The DeepL API key: stored encrypted with the OS keychain where there is one,
// never sent to the renderer, never put in backups or phone sync.

import { safeStorage } from 'electron';
import type Database from 'better-sqlite3';

const PLAIN = 'deepl_api_key';
const ENCRYPTED = 'deepl_api_key_enc';

/** Settings that may go into a backup or phone sync, and come back from one. */
export const PORTABLE_SETTINGS = new Set(['target_language', 'theme']);

/** Settings the renderer may read and write through get-setting/set-setting. */
export const RENDERER_SETTINGS = new Set(['target_language', 'theme']);

async function canEncrypt() {
    try {
        return await safeStorage.isAsyncEncryptionAvailable();
    } catch {
        return false;
    }
}

function get(db: Database.Database, key: string) {
    return (db.prepare('SELECT value FROM user_settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;
}

export async function getDeeplKey(db: Database.Database): Promise<string | null> {
    const enc = get(db, ENCRYPTED);
    if (enc) {
        try {
            const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(Buffer.from(enc, 'base64'));
            if (shouldReEncrypt) await setDeeplKey(db, result);
            return result;
        } catch (e) {
            console.error('[secrets] Could not decrypt the DeepL key:', (e as Error).message);
            return null;
        }
    }
    return get(db, PLAIN) || null;
}

export async function setDeeplKey(db: Database.Database, key: string) {
    // Encrypt first: better-sqlite3 transactions can't span an await.
    const encrypted = key && (await canEncrypt()) ? (await safeStorage.encryptStringAsync(key)).toString('base64') : null;
    const del = db.prepare('DELETE FROM user_settings WHERE key IN (?, ?)');
    const put = db.prepare('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)');
    db.transaction(() => {
        del.run(PLAIN, ENCRYPTED);
        if (!key) return;
        if (encrypted) put.run(ENCRYPTED, encrypted);
        else put.run(PLAIN, key);
    })();
}

/** What the settings screen shows: whether a key is saved, and its last 4 characters. */
export async function deeplKeyStatus(db: Database.Database) {
    const key = await getDeeplKey(db);
    return { saved: !!key, hint: key ? key.replace(/:fx$/, '').slice(-4) : '' };
}

/** A DeepL key is a UUID with an optional ":fx" suffix; allow some slack. */
export function isPlausibleDeeplKey(key: unknown): key is string {
    return typeof key === 'string' && key.length <= 128 && /^[A-Za-z0-9:_-]*$/.test(key);
}

/** user_settings rows that may leave this computer. */
export function portableSettings(db: Database.Database) {
    const rows = db.prepare('SELECT key, value FROM user_settings').all() as { key: string; value: string }[];
    return rows.filter(r => PORTABLE_SETTINGS.has(r.key));
}
