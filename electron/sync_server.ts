import express from 'express';
import * as http from 'http';
import * as QRCode from 'qrcode';
import * as ip from 'ip';
import { BrowserWindow, ipcMain } from 'electron';

export class SyncServer {
    private app: express.Express;
    private server: http.Server | null = null;
    private port: number = 0;
    private pin: string = '';
    private mainWindow: BrowserWindow;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
        this.app = express();
        // Initial setup - we will reset this later but good to have defaults
        this.app.use(express.json({ limit: '50mb' }));
        this.setupRoutes();
    }

    private setupRoutes() {
        // middleware: Body Parser (Must re-add after stack clear)
        this.app.use(express.json({ limit: '50mb' }));

        // Authenticate all requests
        this.app.use((req, res, next) => {
            console.log(`[SyncServer] Incoming request: ${req.method} ${req.url} from ${req.ip}`);
            const requestPin = req.headers['x-auth-pin'];
            if (requestPin !== this.pin) {
                console.warn(`[SyncServer] Invalid PIN attempt: ${requestPin}`);
                res.status(401).json({ error: 'Invalid PIN' });
                return;
            }
            next();
        });

        // Test Endpoint
        this.app.get('/sync/handshake', (req, res) => {
            res.json({ message: 'LinguaReader Desktop', version: '1.0.0' });
        });

        // NOTE: Real data handlers are added by setupHandlersWithCallbacks()
        // Do NOT add placeholder routes here, or they will block the real ones and hang!
    }

    // We need to inject the data handlers
    public onGetExportData: (() => Promise<any>) | null = null;
    public onImportData: ((data: any) => Promise<any>) | null = null;

    private setupHandlersWithCallbacks() {
        // Re-implement routes with callbacks
        this.app.get('/sync/download', async (req, res) => {
            console.log('[SyncServer] Handling GET /sync/download');

            // Log window state and send status
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                console.log(`[SyncServer] Sending 'sync-status: downloading' to WebContents ID: ${this.mainWindow.webContents.id}`);
                this.mainWindow.webContents.send('sync-status', { status: 'downloading', message: 'Sending data to mobile...' });
            } else {
                console.error('[SyncServer] Cannot send status: MainWindow is missing or destroyed');
            }

            try {
                if (this.onGetExportData) {
                    console.log('[SyncServer] Fetching export data from main process...');
                    const data = await this.onGetExportData();
                    console.log(`[SyncServer] Data fetched. Keys: ${Object.keys(data).join(', ')}. Sending response...`);
                    res.json(data);
                    console.log('[SyncServer] Download response sent.');

                    // Final success message
                    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                        console.log(`[SyncServer] Sending 'sync-status: completed' to WebContents ID: ${this.mainWindow.webContents.id}`);
                        this.mainWindow.webContents.send('sync-status', { status: 'completed', message: 'Sync Complete!' });
                    }
                } else {
                    console.warn('[SyncServer] Export provider not ready');
                    res.status(503).json({ error: 'Export provider not ready' });
                    this.mainWindow?.webContents?.send('sync-status', { status: 'error', message: 'Server not ready' });
                }
            } catch (error) {
                console.error('Sync Download Error:', error);
                res.status(500).json({ error: String(error) });
                this.mainWindow?.webContents?.send('sync-status', { status: 'error', message: String(error) });
            }
        });

        this.app.post('/sync/upload', async (req, res) => {
            console.log('[SyncServer] Handling POST /sync/upload');
            // First valid request -> Connected
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                console.log(`[SyncServer] Sending 'sync-status: uploading' to WebContents ID: ${this.mainWindow.webContents.id}`);
                this.mainWindow.webContents.send('sync-status', { status: 'uploading', message: 'Receiving data from mobile...' });
            } else {
                console.error('[SyncServer] Cannot send status: MainWindow is missing or destroyed');
            }

            try {
                const data = req.body;
                console.log(`[SyncServer] Received upload payload. Size: ${JSON.stringify(data).length} chars approx.`);

                if (this.onImportData) {
                    console.log('[SyncServer] Invoking import handler...');
                    const result = await this.onImportData(data);
                    console.log('[SyncServer] Import handler finished:', result);
                    res.json(result);
                    console.log('[SyncServer] Upload response sent.');
                } else {
                    console.warn('[SyncServer] Import provider not ready');
                    res.status(503).json({ error: 'Import provider not ready' });
                    this.mainWindow?.webContents?.send('sync-status', { status: 'error', message: 'Server not ready' });
                }
            } catch (error) {
                console.error('Sync Upload Error:', error);
                res.status(500).json({ error: String(error) });
                this.mainWindow?.webContents?.send('sync-status', { status: 'error', message: String(error) });
            }
        });
    }

    public async start(): Promise<{ ip: string; port: number; pin: string; qrDataURL: string }> {
        return new Promise((resolve, reject) => {
            // Find a free port (0 lets OS choose)
            this.server = this.app.listen(0, '0.0.0.0', async () => {
                const address = this.server?.address();
                console.log('Sync Server listening at:', address);

                if (address && typeof address !== 'string') {
                    this.port = address.port;
                    this.pin = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit PIN

                    try {
                        const ipAddress = ip.address();
                        console.log('Detected IP (default):', ipAddress);

                        // LOG ALL INTERFACES DEBUGGING
                        const os = require('os');
                        const interfaces = os.networkInterfaces();
                        console.log('Available Network Interfaces:');
                        for (const name of Object.keys(interfaces)) {
                            for (const iface of interfaces[name]) {
                                console.log(`  ${name}: ${iface.family} - ${iface.address} (Internal: ${iface.internal})`);
                            }
                        }

                        const connInfo = {
                            ip: ipAddress,
                            port: this.port,
                            pin: this.pin
                        };

                        const qrDataURL = await QRCode.toDataURL(JSON.stringify(connInfo));
                        console.log('QR Code generated successfully');

                        console.log('QR Code generated successfully');

                        // Setup routes with actual logic now that we are starting
                        // Hacky but effective way to reset routes: verify _router exists first
                        if (this.app._router) {
                            this.app._router.stack = []; // CLEAR handlers
                        }
                        this.setupRoutes(); // Restore middleware
                        this.setupHandlersWithCallbacks(); // Restore logic

                        resolve({ ...connInfo, qrDataURL });
                    } catch (e) {
                        console.error('Error generating sync info:', e);
                        reject(e);
                    }
                } else {
                    const err = new Error('Failed to get server port');
                    console.error(err);
                    reject(err);
                }
            });
        });
    }

    public stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
