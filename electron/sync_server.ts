// Phone sync over the local network.
//
// The desktop shows a QR code with its address and a one-time pairing token;
// the phone uploads its data, then downloads the desktop's. The server:
//  - uses a 128-bit random token instead of a 4-digit PIN, so it can't be guessed
//    (it is still sent as "pin" in the QR and the x-auth-pin header, which is
//    what the phone app already reads and sends);
//  - locks out an address after a few wrong tokens, and shuts down after too
//    many wrong tokens overall;
//  - stops by itself after one complete sync, or after 10 minutes;
//  - listens only on the LAN address shown in the QR code;
//  - caps request bodies, and never sends secrets (see onGetExportData in main.ts).
//
// Traffic is plain HTTP on the local network; the token only lives while the
// pairing screen is open.

import * as http from 'http';
import * as os from 'os';
import { randomBytes, timingSafeEqual } from 'crypto';
import * as QRCode from 'qrcode';
import type { BrowserWindow } from 'electron';

export const SYNC_PROTOCOL_VERSION = 1;
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const LIFETIME_MS = 10 * 60 * 1000;
const MAX_FAILS_PER_ADDRESS = 5;
const MAX_FAILS_TOTAL = 20;

export interface SyncInfo {
    ip: string;
    port: number;
    pin: string;
    qrDataURL: string;
}

type Status = { status: string; message: string };

/** The address other devices on the LAN can reach: private IPv4 first. */
export function lanAddress(interfaces = os.networkInterfaces()): string {
    const candidates: string[] = [];
    for (const list of Object.values(interfaces)) {
        for (const i of list ?? []) {
            if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) candidates.push(i.address);
        }
    }
    const isPrivate = (a: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a);
    return candidates.find(isPrivate) ?? candidates[0] ?? '127.0.0.1';
}

export function tokensMatch(given: unknown, expected: string) {
    if (typeof given !== 'string' || !expected) return false;
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

class HttpError extends Error {
    code: number;
    constructor(code: number, message: string) {
        super(message);
        this.code = code;
    }
}

export class SyncServer {
    private server: http.Server | null = null;
    private token = '';
    private failsByAddress = new Map<string, number>();
    private failsTotal = 0;
    private uploaded = false;
    private stopTimer: NodeJS.Timeout | null = null;

    public onGetExportData: (() => Promise<unknown>) | null = null;
    public onImportData: ((data: unknown) => Promise<unknown>) | null = null;
    /** Called once when the server shuts itself down (timeout, completed, too many bad tokens). */
    public onStopped: (() => void) | null = null;

    private mainWindow: BrowserWindow;
    private host: string;

    constructor(mainWindow: BrowserWindow, host = lanAddress()) {
        this.mainWindow = mainWindow;
        this.host = host;
    }

    private status(s: Status) {
        if (!this.mainWindow.isDestroyed()) this.mainWindow.webContents.send('sync-status', s);
    }

    private authorize(req: http.IncomingMessage) {
        const addr = req.socket.remoteAddress ?? '?';
        if ((this.failsByAddress.get(addr) ?? 0) >= MAX_FAILS_PER_ADDRESS) throw new HttpError(429, 'Too many attempts');
        const header = req.headers['x-auth-pin'];
        const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
        if (tokensMatch(header ?? bearer, this.token)) return;
        this.failsByAddress.set(addr, (this.failsByAddress.get(addr) ?? 0) + 1);
        this.failsTotal++;
        console.warn(`[sync] Rejected a request with a wrong pairing code (${this.failsTotal} so far)`);
        if (this.failsTotal >= MAX_FAILS_TOTAL) {
            this.status({ status: 'stopped', message: 'Phone sync stopped after too many wrong pairing attempts.' });
            setImmediate(() => this.shutdown());
        }
        throw new HttpError(401, 'Invalid PIN');
    }

    private readJson(req: http.IncomingMessage): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const type = req.headers['content-type'] ?? '';
            if (!type.toLowerCase().startsWith('application/json')) return reject(new HttpError(415, 'Expected JSON'));
            const declared = Number(req.headers['content-length'] ?? 0);
            if (declared > MAX_BODY_BYTES) return reject(new HttpError(413, 'Too large'));
            const chunks: Buffer[] = [];
            let size = 0;
            req.on('data', (c: Buffer) => {
                size += c.length;
                if (size > MAX_BODY_BYTES) {
                    reject(new HttpError(413, 'Too large'));
                    req.destroy();
                } else chunks.push(c);
            });
            req.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
                } catch {
                    reject(new HttpError(400, 'Invalid JSON'));
                }
            });
            req.on('error', reject);
        });
    }

    private async route(req: http.IncomingMessage): Promise<unknown> {
        this.authorize(req);
        const url = (req.url ?? '').split('?')[0];

        if (req.method === 'GET' && url === '/sync/handshake') {
            return { message: 'LinguaReader Desktop', version: SYNC_PROTOCOL_VERSION };
        }
        if (req.method === 'POST' && url === '/sync/upload') {
            this.status({ status: 'uploading', message: 'Receiving data from phone…' });
            const data = await this.readJson(req);
            if (!this.onImportData) throw new HttpError(503, 'Not ready');
            const result = await this.onImportData(data);
            this.uploaded = true;
            return result;
        }
        if (req.method === 'GET' && url === '/sync/download') {
            this.status({ status: 'downloading', message: 'Sending data to phone…' });
            if (!this.onGetExportData) throw new HttpError(503, 'Not ready');
            const data = await this.onGetExportData();
            if (this.uploaded) {
                // The phone uploads first, then downloads: this was the last step.
                this.status({ status: 'completed', message: 'Sync complete' });
                setTimeout(() => this.shutdown(), 1000);
            }
            return data;
        }
        throw new HttpError(404, 'Not found');
    }

    private handle = (req: http.IncomingMessage, res: http.ServerResponse) => {
        this.route(req).then(
            body => {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                res.end(JSON.stringify(body));
            },
            (err: unknown) => {
                const code = err instanceof HttpError ? err.code : 500;
                if (!(err instanceof HttpError)) {
                    console.error('[sync] Request failed:', err);
                    this.status({ status: 'error', message: 'Sync failed' });
                }
                // Generic messages only: no SQL errors or stack traces to the network.
                const message = err instanceof HttpError ? err.message : 'Sync failed';
                if (!res.headersSent) res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', Connection: 'close' });
                res.end(JSON.stringify({ error: message }));
            },
        );
    };

    public async start(): Promise<SyncInfo> {
        this.stop();
        this.token = randomBytes(16).toString('base64url');
        this.failsByAddress.clear();
        this.failsTotal = 0;
        this.uploaded = false;

        const server = http.createServer({ maxHeaderSize: 16 * 1024 }, this.handle);
        server.requestTimeout = 120_000;
        server.headersTimeout = 15_000;
        server.maxConnections = 8;
        this.server = server;
        await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, this.host, () => resolve());
        });
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('Failed to get server port');

        this.stopTimer = setTimeout(() => {
            this.status({ status: 'stopped', message: 'The pairing code expired. Show a new one to sync.' });
            this.shutdown();
        }, LIFETIME_MS);

        const conn = { ip: this.host, port: address.port, pin: this.token };
        const qrDataURL = await QRCode.toDataURL(JSON.stringify(conn));
        console.log(`[sync] Listening on ${this.host}:${address.port}`);
        return { ...conn, qrDataURL };
    }

    private shutdown() {
        if (!this.server) return;
        this.stop();
        this.onStopped?.();
    }

    public stop() {
        if (this.stopTimer) clearTimeout(this.stopTimer);
        this.stopTimer = null;
        this.token = '';
        if (this.server) {
            this.server.close();
            this.server.closeAllConnections();
            this.server = null;
        }
    }

    public get running() {
        return this.server !== null;
    }
}
