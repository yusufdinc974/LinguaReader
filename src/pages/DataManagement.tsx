import { useState, useEffect } from 'react';
import { Upload, Download, Smartphone, Check, X, QrCode, Key } from 'lucide-react';

export default function DataManagement() {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [savingKey, setSavingKey] = useState(false);

    const [syncInfo, setSyncInfo] = useState<{ ip: string; port: number; pin: string; qrDataURL: string } | null>(null);
    const [startingSync, setStartingSync] = useState(false);
    const [syncStatus, setSyncStatus] = useState<{ status: 'uploading' | 'downloading' | 'completed' | 'error'; message: string } | null>(null);

    useEffect(() => {
        // Load settings
        window.electronAPI.getSetting('deepl_api_key').then(key => {
            if (key) setApiKey(key);
        });

        if (syncInfo && window.electronAPI.onSyncStatus) {
            console.log('[DataManagement] Subscribing to sync status...');
            const cleanup = window.electronAPI.onSyncStatus((status: any) => {
                console.log('[DataManagement] Status update:', status);
                setSyncStatus(status);

                // Auto-close on completion
                if (status.status === 'completed') {
                    setTimeout(() => {
                        window.electronAPI.stopSyncServer();
                        setSyncInfo(null);
                        setSyncStatus(null);
                    }, 3000); // Close after 3 seconds
                }
            });
            return cleanup;
        } else {
            setSyncStatus(null);
        }
    }, [syncInfo]);

    const handleSaveKey = async () => {
        setSavingKey(true);
        try {
            await window.electronAPI.setSetting('deepl_api_key', apiKey.trim());
            setMessage({ type: 'success', text: 'API Key saved successfully' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save API Key' });
        } finally {
            setSavingKey(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        setMessage(null);
        try {
            const result = await window.electronAPI.exportData();
            if (result.success) {
                setMessage({ type: 'success', text: `Data exported successfully to ${result.path}` });
            } else if (result.error) {
                setMessage({ type: 'error', text: result.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Export failed' });
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async () => {
        setImporting(true);
        setMessage(null);
        try {
            const result = await window.electronAPI.importData();
            if (result.success) {
                setMessage({
                    type: 'success',
                    text: `Import successful! (Words: ${result.imported?.words}, Lists: ${result.imported?.lists})`
                });
            } else if (result.error !== 'Import cancelled') {
                setMessage({ type: 'error', text: result.error || 'Import failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Import failed' });
        } finally {
            setImporting(false);
        }
    };

    const toggleSyncServer = async () => {
        if (syncInfo) {
            // Stop Server
            await window.electronAPI.stopSyncServer();
            setSyncInfo(null);
        } else {
            // Start Server
            setStartingSync(true);
            try {
                const result = await window.electronAPI.startSyncServer();
                if (result.success && result.info) {
                    setSyncInfo(result.info);
                } else {
                    setMessage({ type: 'error', text: result.error || 'Failed to start sync server' });
                }
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to start sync server' });
            } finally {
                setStartingSync(false);
            }
        }
    };

    return (
        <div className="h-full flex flex-col p-8 max-w-4xl mx-auto w-full">
            <h1 className="text-3xl font-bold mb-2 text-[var(--accent)]">Data Management</h1>
            <p className="text-[var(--text-secondary)] mb-8">Backup, sync, and configure translation settings.</p>

            {message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${message.type === 'success'
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                    {message.type === 'success' ? <Check size={20} /> : <X size={20} />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Translation Settings */}
                <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] col-span-1 md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Key size={24} className="text-[var(--accent)]" />
                        Translation Settings
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Enter your DeepL API Key to use high-quality translations. Leave empty to use the free fallback.
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="password"
                            placeholder="DeepL API Key (optional)"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                        <button
                            onClick={handleSaveKey}
                            disabled={savingKey}
                            className="btn-primary"
                        >
                            {savingKey ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2 italic opacity-80">
                        Your API Key is stored locally and used only to communicate directly with DeepL.
                    </p>
                </div>
                {/* File Backup Section */}
                <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Download size={24} className="text-[var(--accent)]" />
                        File Backup
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                        Export your word lists, quiz results, and learning progress to a JSON file.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors font-medium border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                        >
                            {exporting ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                <Upload size={18} />
                            )}
                            Export Data to File
                        </button>

                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors font-medium border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                        >
                            {importing ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                <Download size={18} />
                            )}
                            Import Data from File
                        </button>
                    </div>
                </div>

                {/* Mobile Sync Section */}
                <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Smartphone size={24} className="text-[var(--accent)]" />
                        Sync with Mobile
                    </h2>

                    {!syncInfo ? (
                        <>
                            <p className="text-sm text-[var(--text-secondary)] mb-6">
                                Generate a QR code to quickly sync data with your LinguaReader Mobile App.
                                <br /><br />
                                <span className="text-xs opacity-70">
                                    Note: Both devices must be on the same Wi-Fi network.
                                </span>
                            </p>
                            <button
                                onClick={toggleSyncServer}
                                disabled={startingSync}
                                className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-medium text-white transition-opacity hover:opacity-90"
                                style={{ background: 'var(--accent)' }}
                            >
                                {startingSync ? (
                                    <span>Starting...</span>
                                ) : (
                                    <>
                                        <QrCode size={20} />
                                        Show Sync QR Code
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 relative">
                            {/* Status Overlay */}
                            {syncStatus && (
                                <div className="absolute inset-0 z-10 glass rounded-xl flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
                                    {syncStatus.status === 'completed' ? (
                                        <>
                                            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4 animate-in zoom-in spin-in-12 duration-500">
                                                <Check size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-green-500 mb-2">Sync Complete!</h3>
                                            <p className="text-sm text-[var(--text-secondary)]">{syncStatus.message}</p>
                                        </>
                                    ) : syncStatus.status === 'error' ? (
                                        <>
                                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                                                <X size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-red-500 mb-2">Sync Failed</h3>
                                            <p className="text-sm text-[var(--text-secondary)] px-2">{syncStatus.message}</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="relative mb-6">
                                                <div className="w-16 h-16 rounded-full border-4 border-[var(--bg-tertiary)]"></div>
                                                <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin"></div>
                                                <div className="absolute inset-0 flex items-center justify-center text-[var(--accent)]">
                                                    {syncStatus.status === 'uploading' ? <Download size={20} /> : <Upload size={20} />}
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                                                {syncStatus.status === 'uploading' ? 'Receiving Data...' : 'Sending Data...'}
                                            </h3>
                                            <p className="text-sm text-[var(--text-secondary)]">{syncStatus.message}</p>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="bg-white p-4 rounded-xl mb-4 shadow-lg">
                                <img src={syncInfo.qrDataURL} alt="Sync QR Code" className="w-48 h-48" />
                            </div>
                            <div className="text-center mb-6">
                                <p className="font-mono text-lg font-bold tracking-widest text-[var(--accent)] mb-1">
                                    PIN: {syncInfo.pin}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] font-mono">
                                    {syncInfo.ip}:{syncInfo.port}
                                </p>
                            </div>
                            <button
                                onClick={toggleSyncServer}
                                className="px-6 py-2 rounded-lg text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                {syncStatus?.status === 'completed' ? 'Close' : 'Stop Syncing'}
                            </button>
                            <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
                                Open "Sync with Desktop" in your mobile app and scan this code.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
