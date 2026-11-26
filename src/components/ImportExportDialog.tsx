import { useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import type { WordList } from '../types';
import type { AnkiOpenResult } from '../../electron/ankiTypes';
import Dialog from './Dialog';

interface Props {
    lists: WordList[];
    /** The list shown on the Words page, picked first for export */
    selectedId: number | null;
    onClose: () => void;
    /** An Anki deck was opened: show the Anki import dialog */
    onAnki: (deck: AnkiOpenResult) => void;
    /** Something was imported */
    onImported: () => void;
    flash: (msg: string) => void;
}

/** Every way in and out of the app, in one place. */
export default function ImportExportDialog({ lists, selectedId, onClose, onAnki, onImported, flash }: Props) {
    const [listId, setListId] = useState<number | null>(selectedId ?? lists[0]?.id ?? null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const run = async (key: string, fn: () => Promise<void>) => {
        setBusy(key);
        setError(null);
        try {
            await fn();
        } catch (e) {
            setError(String((e as Error)?.message ?? e));
        } finally {
            setBusy(null);
        }
    };

    const importAnki = () => run('anki', async () => {
        const r = await window.electronAPI.ankiOpen();
        if (r.success) onAnki(r);
        else if (r.error) setError(r.error);
    });

    const importBackup = () => run('backup', async () => {
        const r = await window.electronAPI.importData();
        if (r.anki) return onAnki(r.anki);
        if (r.success) {
            onImported();
            onClose();
            flash(`Imported ${r.imported?.words ?? 0} words in ${r.imported?.lists ?? 0} lists.`);
        } else if (r.error && r.error !== 'Import cancelled') setError(r.error);
    });

    const exportAs = (format: 'apkg' | 'csv' | 'json' | 'json-progress') => run(format, async () => {
        if (!listId) return;
        const r = format === 'apkg' || format === 'csv'
            ? await window.electronAPI.exportListFile(listId, format)
            : await window.electronAPI.exportList(listId, format === 'json-progress');
        if (r.success) {
            onClose();
            flash(format === 'apkg' ? `Exported ${r.wordCount} words. Open the file with Anki to add the deck.` : `Exported ${r.wordCount} words.`);
        } else if (r.error && r.error !== 'Export cancelled') setError(r.error);
    });

    const backup = () => run('full', async () => {
        const r = await window.electronAPI.exportData();
        if (r.success) {
            onClose();
            flash(`Backup saved to ${r.path}`);
        } else if (r.error) setError(r.error);
    });

    const Btn = ({ k, onClick, children, disabled }: { k: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
        <button className="btn btn-outline justify-start" onClick={onClick} disabled={busy !== null || disabled}>
            {busy === k && <Loader2 size={14} className="animate-spin" />}
            {children}
        </button>
    );

    return (
        <Dialog title="Import and export" width={460} onClose={onClose} footer={<button className="btn btn-ghost" onClick={onClose}>Close</button>}>
            <div className="grid gap-5">
                <section>
                    <p className="label mb-2 flex items-center gap-1.5"><Download size={13} /> Import</p>
                    <div className="grid grid-cols-2 gap-2">
                        <Btn k="anki" onClick={importAnki}>Anki deck (.apkg)</Btn>
                        <Btn k="backup" onClick={importBackup}>LinguaReader file (.json)</Btn>
                    </div>
                    <p className="text-[12px] faint mt-1.5">A .json file can be a full backup or a list someone shared with you.</p>
                </section>

                <section>
                    <p className="label mb-2 flex items-center gap-1.5"><Upload size={13} /> Export a list</p>
                    {lists.length === 0 ? (
                        <p className="text-[12.5px] faint">You have no lists yet.</p>
                    ) : (
                        <>
                            <select className="field mb-2" value={listId ?? ''} onChange={e => setListId(Number(e.target.value))} aria-label="List to export">
                                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <Btn k="apkg" onClick={() => exportAs('apkg')}>Anki deck (.apkg)</Btn>
                                <Btn k="csv" onClick={() => exportAs('csv')}>Spreadsheet (.csv)</Btn>
                                <Btn k="json-progress" onClick={() => exportAs('json-progress')}>JSON with progress</Btn>
                                <Btn k="json" onClick={() => exportAs('json')}>JSON, words only</Btn>
                            </div>
                            <p className="text-[12px] faint mt-1.5">The Anki deck keeps your review schedule. "Words only" is for sharing a list with someone.</p>
                        </>
                    )}
                </section>

                <section>
                    <p className="label mb-2">Back up everything</p>
                    <Btn k="full" onClick={backup}>Export full backup (.json)</Btn>
                    <p className="text-[12px] faint mt-1.5">All lists, words and review progress. Import it on another computer to restore.</p>
                </section>

                {error && <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>
        </Dialog>
    );
}
