// Hardening for the renderer: Chromium sandbox, what the window may load,
// where it may navigate, and which pages may call the IPC handlers.
//
// The renderer shows untrusted content (PDFs, comics, images), so it is
// treated as untrusted too: it gets no Node.js, it can only load the app's own
// files, and the main process checks every IPC call it makes.

import { app, ipcMain, session, shell, type IpcMainInvokeEvent, type WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

/**
 * Keeps Chromium's sandbox on, except on Linux systems where it can't start.
 *
 * The sandbox needs either unprivileged user namespaces or a setuid
 * `chrome-sandbox` helper. Ubuntu 23.10+ blocks user namespaces for apps
 * without an AppArmor profile, and an AppImage can't carry a setuid helper, so
 * there the app would crash on launch. Only in that case is it switched off.
 * Must run before the app is ready.
 */
export function configureSandbox() {
    // Someone who starts the app with --no-sandbox gets what they asked for
    // (app.enableSandbox() would override it).
    if (app.commandLine.hasSwitch('no-sandbox')) return;
    if (process.platform !== 'linux' || linuxSandboxAvailable()) {
        app.enableSandbox();
        return;
    }
    console.warn('[security] Chromium sandbox unavailable on this system (no user namespaces, no setuid chrome-sandbox); running without it');
    app.commandLine.appendSwitch('no-sandbox');
}

function readProc(file: string) {
    try {
        return fs.readFileSync(file, 'utf8').trim();
    } catch {
        return null;
    }
}

function linuxSandboxAvailable() {
    // A setuid-root chrome-sandbox next to the binary (the .deb installs one).
    try {
        const helper = fs.statSync(path.join(path.dirname(process.execPath), 'chrome-sandbox'));
        if (helper.uid === 0 && (helper.mode & 0o4000) !== 0 && !process.env.APPIMAGE) return true;
    } catch { /* no helper */ }
    // Otherwise unprivileged user namespaces.
    if (readProc('/proc/sys/kernel/unprivileged_userns_clone') === '0') return false;
    if (readProc('/proc/sys/kernel/apparmor_restrict_unprivileged_userns') === '1') return false;
    const max = readProc('/proc/sys/user/max_user_namespaces');
    if (max !== null && Number(max) === 0) return false;
    return true;
}

/** Whether `url` is the app's own page (the built index.html, or the dev server). */
export function makeAppUrlCheck(distDir: string, devUrl: string | null) {
    const distPrefix = pathToFileURL(distDir + path.sep).href;
    return (url: string) => {
        if (devUrl && url.startsWith(devUrl)) return true;
        return url.startsWith(distPrefix);
    };
}

// Fonts for the UI. Everything else the renderer loads comes from the app.
const ALLOWED_REMOTE = ['https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

/**
 * Blocks every request from the app's windows except the app's own files,
 * the UI fonts, and data:/blob: URLs. Above all this stops a page from
 * reading other local files through file:// URLs. Requests the main process
 * makes itself (translation, updates) don't come from a window and pass.
 */
export function restrictRequests(isAppUrl: (url: string) => boolean, devUrl: string | null) {
    const ses = session.defaultSession;
    ses.webRequest.onBeforeRequest((details, callback) => {
        if (details.webContentsId === undefined) return callback({});
        const url = details.url;
        const ok =
            isAppUrl(url) ||
            url.startsWith('data:') ||
            url.startsWith('blob:') ||
            url.startsWith('devtools:') ||
            ALLOWED_REMOTE.some(p => url.startsWith(p)) ||
            (devUrl !== null && url.startsWith(devUrl.replace('localhost', '127.0.0.1'))) ||
            (devUrl !== null && url.startsWith('ws://localhost:'));
        if (!ok) console.warn('[security] Blocked request:', url.slice(0, 200));
        callback({ cancel: !ok });
    });

    // The app needs no camera, microphone, location, notifications and so on.
    ses.setPermissionRequestHandler((_wc, permission, callback) => callback(permission === 'clipboard-sanitized-write'));
    ses.setPermissionCheckHandler((_wc, permission) => permission === 'clipboard-sanitized-write');
}

/** No navigation away from the app, no new windows, no <webview>. */
export function lockDownWebContents(isAppUrl: (url: string) => boolean) {
    app.on('web-contents-created', (_e, contents: WebContents) => {
        contents.on('will-navigate', (event, url) => {
            if (!isAppUrl(url)) {
                event.preventDefault();
                console.warn('[security] Blocked navigation:', url.slice(0, 200));
            }
        });
        contents.on('will-redirect', (event, url) => {
            if (!isAppUrl(url)) event.preventDefault();
        });
        contents.setWindowOpenHandler(({ url }) => {
            // Links to web pages open in the user's browser; nothing opens inside the app.
            if (url.startsWith('https://')) shell.openExternal(url);
            return { action: 'deny' };
        });
        contents.on('will-attach-webview', event => event.preventDefault());
    });
}

/**
 * Makes every `ipcMain.handle` handler (registered after this call) refuse
 * calls that don't come from the app's own page in its main frame.
 */
export function guardIpc(isAppUrl: (url: string) => boolean) {
    const original = ipcMain.handle.bind(ipcMain);
    ipcMain.handle = ((channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => any) => {
        original(channel, (event, ...args) => {
            const frame = event.senderFrame;
            if (!frame || frame.parent !== null || !isAppUrl(frame.url)) {
                console.warn(`[security] Refused IPC '${channel}' from`, frame?.url?.slice(0, 200));
                throw new Error('Not allowed');
            }
            return listener(event, ...args);
        });
    }) as typeof ipcMain.handle;
}

// ---------------------------------------------------------------- file access

const OPENABLE = new Set(['.pdf', '.cbz', '.zip', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif']);

/**
 * The files the renderer may read: ones the user picked in the open dialog,
 * passed on the command line ("Open with"), or already in the recent list.
 * A compromised page can't name an arbitrary path and get its contents.
 */
export class FileGrants {
    private granted = new Set<string>();

    private norm(p: string) {
        const r = path.resolve(p);
        return process.platform === 'win32' || process.platform === 'darwin' ? r.toLowerCase() : r;
    }

    static isOpenable(p: unknown): p is string {
        return typeof p === 'string' && p.length > 0 && p.length < 4096 && !p.includes('\0') && path.isAbsolute(p) && OPENABLE.has(path.extname(p).toLowerCase());
    }

    grant(p: string) {
        if (FileGrants.isOpenable(p)) this.granted.add(this.norm(p));
    }

    has(p: unknown): p is string {
        return FileGrants.isOpenable(p) && this.granted.has(this.norm(p));
    }
}

/** Book/comic/image paths given on the command line, e.g. by "Open with". */
export function filesFromArgv(argv: string[]) {
    return argv.slice(1).filter(a => !a.startsWith('-') && FileGrants.isOpenable(a) && fs.existsSync(a));
}
