import { useEffect, useState, type ReactNode } from 'react';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { Theme } from '../lib/theme';
import PronunciationSettings from './PronunciationSettings';
import DictionarySettings from './DictionarySettings';

interface Props {
    open: boolean;
    onClose: () => void;
    theme: Theme;
    onThemeChange: (t: Theme) => void;
}

type SyncInfo = { ip: string; port: number; pin: string; qrDataURL: string };
type SyncStatus = { status: 'uploading' | 'downloading' | 'completed' | 'error' | 'stopped'; message: string };
type Notice = { type: 'ok' | 'error'; text: string } | null;

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="py-5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex gap-8">
                <div className="w-44 shrink-0">
                    <h3 className="text-[13px] font-semibold">{title}</h3>
                    {description && <p className="text-[12.5px] faint mt-1 leading-snug">{description}</p>}
                </div>
                <div className="flex-1 min-w-0">{children}</div>
            </div>
        </section>
    );
}

export default function SettingsPanel({ open, onClose, theme, onThemeChange }: Props) {
    // The saved key never comes back to this page: only whether one is saved and its last 4 characters.
    const [apiKey, setApiKey] = useState('');
    const [keyStatus, setKeyStatus] = useState<{ saved: boolean; hint: string }>({ saved: false, hint: '' });
    const [notice, setNotice] = useState<Notice>(null);
    const [busy, setBusy] = useState<'export' | 'import' | 'key' | 'sync' | null>(null);
    const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [version, setVersion] = useState('');

    useEffect(() => {
        if (!open) return;
        setApiKey('');
        window.electronAPI.getDeeplKeyStatus().then(setKeyStatus);
        window.electronAPI.getAppVersion().then(setVersion);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (!syncInfo) {
            setSyncStatus(null);
            return;
        }
        const cleanup = window.electronAPI.onSyncStatus(status => {
            if (status.status === 'stopped') {
                // The desktop stopped pairing by itself (timed out, or too many wrong codes)
                setSyncInfo(null);
                flash({ type: 'error', text: status.message });
                return;
            }
            setSyncStatus(status);
            if (status.status === 'completed') {
                setTimeout(() => {
                    window.electronAPI.stopSyncServer();
                    setSyncInfo(null);
                }, 3000);
            }
        });
        return cleanup;
    }, [syncInfo]);

    // Stop the sync server if the panel closes while it's running
    useEffect(() => {
        if (!open && syncInfo) {
            window.electronAPI.stopSyncServer();
            setSyncInfo(null);
        }
    }, [open, syncInfo]);

    const flash = (n: Notice) => {
        setNotice(n);
        if (n?.type === 'ok') setTimeout(() => setNotice(null), 3500);
    };

    const saveKey = async (key: string) => {
        setBusy('key');
        try {
            const ok = await window.electronAPI.setDeeplKey(key);
            if (!ok) throw new Error('rejected');
            setApiKey('');
            setKeyStatus(await window.electronAPI.getDeeplKeyStatus());
            flash({ type: 'ok', text: key ? 'DeepL key saved.' : 'DeepL key removed.' });
        } catch {
            flash({ type: 'error', text: key ? "Could not save the key. Check that it's a DeepL API key." : 'Could not remove the key.' });
        } finally {
            setBusy(null);
        }
    };

    const doExport = async () => {
        setBusy('export');
        try {
            const r = await window.electronAPI.exportData();
            if (r.success) flash({ type: 'ok', text: `Backup saved to ${r.path}` });
            else if (r.error) flash({ type: 'error', text: r.error });
        } catch {
            flash({ type: 'error', text: 'Export failed.' });
        } finally {
            setBusy(null);
        }
    };

    const doImport = async () => {
        setBusy('import');
        try {
            const r = await window.electronAPI.importData();
            if (r.success) flash({ type: 'ok', text: `Imported ${r.imported?.words ?? 0} words in ${r.imported?.lists ?? 0} lists.` });
            else if (r.error && r.error !== 'Import cancelled') flash({ type: 'error', text: r.error });
        } catch {
            flash({ type: 'error', text: 'Import failed.' });
        } finally {
            setBusy(null);
        }
    };

    const toggleSync = async () => {
        if (syncInfo) {
            await window.electronAPI.stopSyncServer();
            setSyncInfo(null);
            return;
        }
        setBusy('sync');
        try {
            const r = await window.electronAPI.startSyncServer();
            if (r.success && r.info) setSyncInfo(r.info);
            else flash({ type: 'error', text: r.error || 'Could not start phone sync.' });
        } catch {
            flash({ type: 'error', text: 'Could not start phone sync.' });
        } finally {
            setBusy(null);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Settings">
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.32)' }} onClick={onClose} />
            <div className="popover relative w-full max-w-[640px] max-h-[85vh] flex flex-col anim-in">
                <header className="flex items-center justify-between h-14 px-6 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                    <h2 className="text-[15px] font-semibold">Settings</h2>
                    <button className="icon-btn" onClick={onClose} aria-label="Close settings">
                        <X size={17} />
                    </button>
                </header>

                <div className="overflow-auto px-6">
                    {notice && (
                        <div
                            className="mt-4 flex items-start gap-2 text-[13px] px-3 py-2 rounded-md"
                            style={{
                                background: notice.type === 'ok' ? 'var(--accent-soft)' : 'var(--danger-soft)',
                                color: notice.type === 'ok' ? 'var(--accent)' : 'var(--danger)',
                            }}
                        >
                            {notice.type === 'ok' ? <Check size={15} className="mt-px shrink-0" /> : <AlertCircle size={15} className="mt-px shrink-0" />}
                            <span className="break-all">{notice.text}</span>
                        </div>
                    )}

                    <Section title="Appearance">
                        <div className="segmented">
                            <button data-active={theme === 'light'} onClick={() => onThemeChange('light')}>Light</button>
                            <button data-active={theme === 'dark'} onClick={() => onThemeChange('dark')}>Dark</button>
                        </div>
                    </Section>

                    <Section title="Translation" description="Without a key, the free MyMemory service is used.">
                        <label className="label block mb-1.5" htmlFor="deepl-key">DeepL API key</label>
                        <div className="flex gap-2">
                            <input
                                id="deepl-key"
                                type="password"
                                className="field"
                                placeholder={keyStatus.saved ? `Saved key ending in ${keyStatus.hint}` : 'Optional'}
                                value={apiKey}
                                autoComplete="off"
                                spellCheck={false}
                                onChange={e => setApiKey(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && apiKey.trim() && saveKey(apiKey.trim())}
                            />
                            <button className="btn btn-outline" onClick={() => saveKey(apiKey.trim())} disabled={busy === 'key' || !apiKey.trim()}>
                                {keyStatus.saved ? 'Replace' : 'Save'}
                            </button>
                            {keyStatus.saved && (
                                <button className="btn btn-ghost" onClick={() => saveKey('')} disabled={busy === 'key'}>
                                    Remove
                                </button>
                            )}
                        </div>
                        <p className="text-[12px] faint mt-1.5">Stored encrypted on this computer. Never included in backups or phone sync.</p>
                    </Section>

                    <Section title="Pronunciation" description="Read words aloud with your computer's voices or a downloaded natural voice.">
                        <PronunciationSettings />
                    </Section>

                    <Section title="Dictionaries" description="Definitions, examples and synonyms on the word card, offline.">
                        <DictionarySettings />
                    </Section>

                    <Section title="Backup" description="Lists, words and review progress as a JSON file.">
                        <div className="flex gap-2">
                            <button className="btn btn-outline" onClick={doExport} disabled={busy !== null}>
                                {busy === 'export' && <Loader2 size={14} className="animate-spin" />}
                                Export backup
                            </button>
                            <button className="btn btn-outline" onClick={doImport} disabled={busy !== null}>
                                {busy === 'import' && <Loader2 size={14} className="animate-spin" />}
                                Import…
                            </button>
                        </div>
                    </Section>

                    <Section title="Phone sync" description="Both devices need to be on the same Wi-Fi.">
                        {!syncInfo ? (
                            <button className="btn btn-outline" onClick={toggleSync} disabled={busy === 'sync'}>
                                {busy === 'sync' && <Loader2 size={14} className="animate-spin" />}
                                Show pairing code
                            </button>
                        ) : (
                            <div className="flex gap-5 items-start">
                                <div className="p-2 rounded-md bg-white shrink-0" style={{ border: '1px solid var(--border)' }}>
                                    <img src={syncInfo.qrDataURL} alt="Pairing QR code" className="w-32 h-32 block" />
                                </div>
                                <div className="min-w-0 text-[13px]">
                                    <p className="muted">In the phone app, open <strong className="font-medium" style={{ color: 'var(--text)' }}>Sync with Desktop</strong> and scan the code.</p>
                                    <p className="text-[12px] faint mt-2">The code works for one sync and expires in 10 minutes.</p>
                                    <p className="font-mono text-[12px] faint mt-1">{syncInfo.ip}:{syncInfo.port}</p>

                                    {syncStatus && (
                                        <p
                                            className="mt-3 flex items-center gap-1.5"
                                            style={{ color: syncStatus.status === 'error' ? 'var(--danger)' : syncStatus.status === 'completed' ? 'var(--ok)' : 'var(--text-2)' }}
                                        >
                                            {syncStatus.status === 'completed' ? <Check size={14} /> :
                                                syncStatus.status === 'error' ? <AlertCircle size={14} /> :
                                                    <Loader2 size={14} className="animate-spin" />}
                                            {syncStatus.message}
                                        </p>
                                    )}

                                    <button className="btn btn-ghost mt-3 -ml-3" onClick={toggleSync}>
                                        {syncStatus?.status === 'completed' ? 'Done' : 'Stop'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </Section>

                    <Section title="About">
                        <p className="text-[13px] muted">LinguaReader {version && `v${version}`}</p>
                    </Section>
                </div>
            </div>
        </div>
    );
}
