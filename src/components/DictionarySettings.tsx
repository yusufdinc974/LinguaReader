import { useEffect, useState } from 'react';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { languageName } from '../lib/speech';
import { forgetInstalledDictionaries } from './DictionaryPanel';

type Info = Awaited<ReturnType<typeof window.electronAPI.dictAvailable>>[number];
const clean = (e: unknown) => String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** Download or remove the offline dictionary of each language. */
export default function DictionarySettings() {
    const [installed, setInstalled] = useState<string[]>([]);
    const [available, setAvailable] = useState<Info[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState<{ lang: string; pct: number | null } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        window.electronAPI.dictStatus().then(setInstalled).catch(() => { });
        return window.electronAPI.onDictProgress(p => setBusy({ lang: p.lang, pct: p.total ? Math.round((p.got / p.total) * 100) : null }));
    }, []);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            setAvailable(await window.electronAPI.dictAvailable());
        } catch (e) {
            setError(clean(e));
        } finally {
            setLoading(false);
        }
    };

    const install = async (lang: string) => {
        setError('');
        setBusy({ lang, pct: 0 });
        try {
            setInstalled(await window.electronAPI.dictInstall(lang));
        } catch (e) {
            setError(clean(e));
        } finally {
            forgetInstalledDictionaries();
            setBusy(null);
        }
    };

    const remove = async (lang: string) => {
        setInstalled(await window.electronAPI.dictRemove(lang));
        forgetInstalledDictionaries();
    };

    const sorted = (available ?? []).slice().sort((a, b) => languageName(a.lang).localeCompare(languageName(b.lang)));
    return (
        <div>
            {installed.map(l => (
                <div key={l} className="flex items-center gap-2 py-1 text-[13px]">
                    <span className="flex-1">{languageName(l)}</span>
                    <button className="icon-btn w-7 h-7 hover:!text-[var(--danger)]" onClick={() => remove(l)} title="Remove" aria-label={`Remove the ${languageName(l)} dictionary`}>
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
            {available === null ? (
                <button className="btn btn-outline mt-1" onClick={load} disabled={loading}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {installed.length ? 'Add a language' : 'Choose a language'}
                </button>
            ) : (
                <div className="grid gap-1 max-h-52 overflow-auto mt-1">
                    {sorted.filter(d => !installed.includes(d.lang)).map(d => (
                        <div key={d.lang} className="flex items-center gap-2 text-[13px] py-0.5">
                            <span className="flex-1 truncate">
                                {languageName(d.lang)} <span className="faint">· {d.entries.toLocaleString()} words · {Math.max(1, Math.round(d.bytes / 1e6))} MB</span>
                            </span>
                            <button className="btn btn-outline h-7 px-2.5" disabled={busy !== null} onClick={() => install(d.lang)}>
                                {busy?.lang === d.lang ? <><Loader2 size={13} className="animate-spin" /> {busy.pct ?? ''}{busy.pct !== null ? '%' : ''}</> : 'Download'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {error && <p className="text-[12.5px] mt-1.5" style={{ color: 'var(--danger)' }}>{error}</p>}
            <p className="text-[12px] faint mt-2">Definitions are in English, from Wiktionary (CC BY-SA 4.0).</p>
        </div>
    );
}
