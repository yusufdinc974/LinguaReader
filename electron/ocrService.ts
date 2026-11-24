// Text recognition for pages that are pictures (scans, manga, webtoons).
// The models run in a separate utility process; results are cached in SQLite
// per document (content hash) and page, so a page is only read once.

import { app, ipcMain, utilityProcess, type UtilityProcess } from 'electron';
import type Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { OCR_VERSION, SCRIPTS, type OcrPage, type ScriptId } from './ocr/types.ts';

const IDLE_MS = 3 * 60 * 1000;

function modelDir() {
    return app.isPackaged ? path.join(process.resourcesPath, 'ocr') : path.join(__dirname, '../resources/ocr');
}

let child: UtilityProcess | null = null;
let idleTimer: NodeJS.Timeout | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (p: OcrPage) => void; reject: (e: Error) => void }>();

function worker(): UtilityProcess {
    if (child) return child;
    const proc = utilityProcess.fork(path.join(__dirname, 'ocr', 'worker.js'), [modelDir()], { serviceName: 'LinguaReader OCR' });
    proc.on('message', (msg: { id: number; page?: OcrPage; error?: string; ms?: number }) => {
        const job = pending.get(msg.id);
        if (!job) return;
        pending.delete(msg.id);
        if (msg.page) job.resolve(msg.page);
        else job.reject(new Error(msg.error || 'OCR failed'));
        armIdle();
    });
    proc.on('exit', () => {
        if (child === proc) child = null;
        for (const [id, job] of pending) {
            job.reject(new Error('The OCR process stopped'));
            pending.delete(id);
        }
    });
    child = proc;
    return proc;
}

/** The models take a few hundred MB of memory; let the process go when unused. */
function armIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (pending.size === 0 && child) {
            child.kill();
            child = null;
        }
    }, IDLE_MS);
}

function recognize(image: { data: Uint8Array; width: number; height: number }, script: ScriptId | 'auto', hint?: ScriptId): Promise<OcrPage> {
    if (idleTimer) clearTimeout(idleTimer);
    const id = nextId++;
    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker().postMessage({ id, image, script, hint });
    });
}

const isScript = (s: unknown): s is ScriptId => SCRIPTS.some(x => x.id === s);

export function setupOcr(getDb: () => Database.Database | null) {
    const db = () => getDb();
    db()?.exec(`
        CREATE TABLE IF NOT EXISTS ocr_pages (
            doc_hash TEXT NOT NULL,
            page INTEGER NOT NULL,
            script TEXT NOT NULL,
            version INTEGER NOT NULL,
            data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (doc_hash, page, script)
        );
        CREATE TABLE IF NOT EXISTS ocr_docs (
            doc_hash TEXT PRIMARY KEY,
            script TEXT NOT NULL,
            chosen INTEGER NOT NULL DEFAULT 0
        );
    `);

    ipcMain.handle('ocr-available', () => fs.existsSync(path.join(modelDir(), 'det.onnx')) && fs.existsSync(path.join(modelDir(), 'rec-v6.onnx')));

    /** The script of a document: chosen by the user (`chosen`), else the one detected first. */
    ipcMain.handle('ocr-get-doc', (_, hash: string) => {
        const row = db()?.prepare('SELECT script, chosen FROM ocr_docs WHERE doc_hash = ?').get(hash) as { script: string; chosen: number } | undefined;
        return row && isScript(row.script) ? { script: row.script, chosen: row.chosen === 1 } : null;
    });

    /** null = back to automatic detection. */
    ipcMain.handle('ocr-set-doc-script', (_, hash: string, script: ScriptId | null) => {
        if (script === null) db()?.prepare('DELETE FROM ocr_docs WHERE doc_hash = ?').run(hash);
        else if (isScript(script)) db()?.prepare('INSERT OR REPLACE INTO ocr_docs (doc_hash, script, chosen) VALUES (?, ?, 1)').run(hash, script);
        return true;
    });

    /** A cached page: in the given script, or with 'auto' in whichever script it was read (the book's first). */
    ipcMain.handle('ocr-cached', (_, hash: string, page: number, script: ScriptId | 'auto') => {
        const row = (script === 'auto'
            ? db()?.prepare(`SELECT p.data FROM ocr_pages p LEFT JOIN ocr_docs d ON d.doc_hash = p.doc_hash
                WHERE p.doc_hash = ? AND p.page = ? AND p.version = ? ORDER BY (p.script = d.script) DESC, p.created_at DESC LIMIT 1`).get(hash, page, OCR_VERSION)
            : db()?.prepare('SELECT data FROM ocr_pages WHERE doc_hash = ? AND page = ? AND script = ? AND version = ?').get(hash, page, script, OCR_VERSION)
        ) as { data: string } | undefined;
        return row ? (JSON.parse(row.data) as OcrPage) : null;
    });

    ipcMain.handle('ocr-recognize', async (_, hash: string, page: number, script: ScriptId | 'auto', image: { data: Uint8Array; width: number; height: number }) => {
        if (script !== 'auto' && !isScript(script)) throw new Error(`Unknown script ${script}`);
        // Automatic: start from the script found on earlier pages; a page in another one is still caught.
        const known = db()?.prepare('SELECT script FROM ocr_docs WHERE doc_hash = ?').get(hash) as { script: string } | undefined;
        const result = await recognize(image, script, known && isScript(known.script) ? known.script : undefined);
        const d = db();
        if (d) {
            d.prepare('INSERT OR REPLACE INTO ocr_pages (doc_hash, page, script, version, data) VALUES (?, ?, ?, ?, ?)')
                .run(hash, page, result.script, OCR_VERSION, JSON.stringify(result));
            // Remember the detected script so the next pages skip detection.
            if (script === 'auto' && result.lines.length > 0) {
                d.prepare('INSERT OR IGNORE INTO ocr_docs (doc_hash, script, chosen) VALUES (?, ?, 0)').run(hash, result.script);
            }
        }
        return result;
    });

    app.on('will-quit', () => child?.kill());
}
