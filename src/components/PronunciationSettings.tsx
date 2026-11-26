import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Trash2, Volume2 } from 'lucide-react';
import {
    getLearnLang, getVoicePref, installedPiperVoices, languageName, LEARN_LANGUAGES, piperFamily, setLearnLang, setPiperVoices,
    setVoicePref, speak, systemVoices, voicesReady,
} from '../lib/speech';

type CatalogVoice = Awaited<ReturnType<typeof window.electronAPI.ttsCatalog>>[number];
type Progress = { key: string; stage: 'engine' | 'voice'; got: number; total: number };

const MB = (n: number) => `${Math.max(1, Math.round(n / 1e6))} MB`;
const isKokoro = (key: string) => key.includes('-kokoro_');
/** Kokoro first (it sounds best), then medium quality Piper voices. */
const rank = (v: { key: string; quality: string }) => (isKokoro(v.key) ? 0 : v.quality === 'medium' ? 1 : 2);
/** "zh_CN-kokoro_xiaoxiao-high" → "Kokoro Xiaoxiao (zh-CN)", "fr_FR-siwis-medium" → "siwis (fr-FR)". */
const voiceLabel = (k: string) => {
    const [code, name] = k.split('-');
    const pretty = name.startsWith('kokoro_') ? `Kokoro ${name.slice(7, 8).toUpperCase()}${name.slice(8)}` : name;
    return `${pretty} (${code.replace('_', '-')})`;
};

function systemVoiceHelp() {
    const ua = navigator.userAgent;
    if (/Windows/.test(ua)) return 'Windows: Settings → Time & language → Speech → Add voices.';
    if (/Mac/.test(ua)) return 'macOS: System Settings → Accessibility → Spoken Content → System voice → Manage voices.';
    return 'Linux: install speech-dispatcher with an espeak or RHVoice voice.';
}

/** A short sample in the language itself: its own name ("français", "Türkçe"). */
function sample(lang: string) {
    try {
        const own = new Intl.DisplayNames([lang], { type: 'language' }).of(lang);
        if (own && own !== lang) return own;
    } catch { /* fall back */ }
    return languageName(lang);
}

export default function PronunciationSettings() {
    const [learn, setLearn] = useState(getLearnLang);
    const [lang, setLang] = useState(() => getLearnLang() || 'en');
    const [, setTick] = useState(0);
    const [supported, setSupported] = useState(false);
    const [installed, setInstalled] = useState<string[]>([]);
    const [catalog, setCatalog] = useState<CatalogVoice[] | null>(null);
    const [catalogError, setCatalogError] = useState('');
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [error, setError] = useState('');
    const [pref, setPref] = useState(() => getVoicePref(lang));

    useEffect(() => {
        voicesReady().then(() => setTick(t => t + 1));
        window.electronAPI.ttsStatus().then(s => {
            setSupported(s.supported);
            setInstalled(s.voices);
            setPiperVoices(s.voices);
        }).catch(() => { });
        return window.electronAPI.onTtsProgress(p => setProgress(p));
    }, []);

    useEffect(() => setPref(getVoicePref(lang)), [lang]);

    const system = systemVoices(lang);
    const natural = installed.filter(k => piperFamily(k) === lang);
    const offered = useMemo(
        () => (catalog ?? []).filter(v => v.family === lang).sort((a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key)),
        [catalog, lang],
    );

    const chooseLearn = (l: string) => {
        setLearnLang(l);
        setLearn(l);
        if (l) setLang(l);
    };

    const choosePref = (v: string) => {
        setVoicePref(lang, v);
        setPref(v);
    };

    const loadCatalog = async () => {
        setLoadingCatalog(true);
        setCatalogError('');
        try {
            setCatalog(await window.electronAPI.ttsCatalog());
        } catch (e) {
            setCatalogError(String((e as Error).message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
        } finally {
            setLoadingCatalog(false);
        }
    };

    const install = async (key: string) => {
        setError('');
        setProgress({ key, stage: 'voice', got: 0, total: 0 });
        try {
            const keys = await window.electronAPI.ttsInstall(key);
            setInstalled(keys);
            setPiperVoices(keys);
            choosePref(`piper:${key}`);
            await installedPiperVoices();
            speak(sample(lang), lang);
        } catch (e) {
            setError(String((e as Error).message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
        } finally {
            setProgress(null);
        }
    };

    const remove = async (key: string) => {
        const keys = await window.electronAPI.ttsRemove(key);
        setInstalled(keys);
        setPiperVoices(keys);
        if (pref === `piper:${key}`) choosePref('');
    };

    const test = async () => {
        setError('');
        const r = await speak(sample(lang), lang);
        if (!r.ok) setError(r.reason === 'no-voice' ? `There's no voice for ${languageName(lang)} yet.` : r.message || 'Could not play the voice.');
    };

    const pct = progress && progress.total > 0 ? Math.round((progress.got / progress.total) * 100) : null;

    return (
        <div className="grid gap-4">
            <div>
                <label className="label block mb-1.5" htmlFor="learn-lang">Language you're learning</label>
                <select id="learn-lang" className="field" value={learn} onChange={e => chooseLearn(e.target.value)}>
                    <option value="">Not set (detect from the text)</option>
                    {LEARN_LANGUAGES.map(l => <option key={l} value={l}>{languageName(l)}</option>)}
                </select>
                <p className="text-[12px] faint mt-1.5">Used to read words aloud when the language can't be detected.</p>
            </div>

            <div>
                <label className="label block mb-1.5" htmlFor="voice-lang">Voice for</label>
                <div className="flex gap-2">
                    <select id="voice-lang" className="field w-40 shrink-0" value={lang} onChange={e => setLang(e.target.value)}>
                        {LEARN_LANGUAGES.map(l => <option key={l} value={l}>{languageName(l)}</option>)}
                    </select>
                    <select className="field" value={pref} onChange={e => choosePref(e.target.value)} aria-label="Voice">
                        <option value="">Best available</option>
                        {natural.map(k => <option key={k} value={`piper:${k}`}>Natural: {voiceLabel(k)}</option>)}
                        {system.map(v => <option key={v.voiceURI} value={`system:${v.voiceURI}`}>{v.name}</option>)}
                    </select>
                    <button className="btn btn-outline shrink-0" onClick={test} disabled={system.length === 0 && natural.length === 0} title="Play a sample">
                        <Volume2 size={14} /> Test
                    </button>
                </div>
                {system.length === 0 && natural.length === 0 && (
                    <p className="text-[12px] faint mt-1.5">
                        Your computer has no {languageName(lang)} voice. {supported ? 'Download a natural voice below, or add one to your system. ' : 'Add one to your system. '}
                        {systemVoiceHelp()}
                    </p>
                )}
            </div>

            {supported && (
                <div>
                    <p className="label mb-1.5">Natural voices</p>
                    <p className="text-[12px] faint mb-2">Free voices that sound more natural and work offline: Piper voices for many languages, and Kokoro for English and Chinese. Each is a one-time download, plus the voice engine (about 20 MB) the first time.</p>
                    {natural.map(k => (
                        <div key={k} className="flex items-center gap-2 py-1.5 text-[13px]">
                            <span className="flex-1 truncate">{voiceLabel(k)}</span>
                            <button className="icon-btn w-7 h-7 hover:!text-[var(--danger)]" onClick={() => remove(k)} title="Remove this voice" aria-label={`Remove ${k}`}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {catalog === null ? (
                        <button className="btn btn-outline" onClick={loadCatalog} disabled={loadingCatalog}>
                            {loadingCatalog ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Find {languageName(lang)} voices
                        </button>
                    ) : offered.length === 0 ? (
                        <p className="text-[12.5px] muted">No natural voice for {languageName(lang)} yet.</p>
                    ) : (
                        <div className="grid gap-1 max-h-52 overflow-auto">
                            {offered.filter(v => !installed.includes(v.key)).map(v => {
                                const busy = progress?.key === v.key;
                                return (
                                    <div key={v.key} className="flex items-center gap-2 text-[13px] py-1">
                                        <span className="flex-1 min-w-0 truncate">
                                            {v.name} <span className="faint">· {v.country || v.code} · {v.quality} · {MB(v.sizeBytes)}</span>
                                        </span>
                                        <button className="btn btn-outline h-7 px-2.5" disabled={progress !== null} onClick={() => install(v.key)}>
                                            {busy ? <><Loader2 size={13} className="animate-spin" /> {progress?.stage === 'engine' ? 'Engine' : 'Voice'} {pct !== null ? `${pct}%` : ''}</> : 'Download'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {catalogError && <p className="text-[12.5px] mt-1.5" style={{ color: 'var(--danger)' }}>{catalogError}</p>}
                </div>
            )}
            {error && <p className="text-[12.5px]" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
    );
}
