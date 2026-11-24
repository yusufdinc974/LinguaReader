import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, FileText, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getThumbnail } from '../lib/pdf';

interface RecentPdf {
    id: number;
    name: string;
    path: string;
    last_opened: string;
    last_page?: number | null;
    page_count?: number | null;
}

function relativeDate(iso: string) {
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: days > 300 ? 'numeric' : undefined });
}

function progressLabel(pdf: { last_page?: number | null; page_count?: number | null }) {
    if (!pdf.page_count) return null;
    return `Page ${pdf.last_page ?? 1} of ${pdf.page_count}`;
}

function displayName(name: string) {
    return name.replace(/\.pdf$/i, '');
}

function Cover({ path, name }: { path: string; name: string }) {
    const [src, setSrc] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        let alive = true;
        getThumbnail(path).then(url => alive && setSrc(url));
        return () => {
            alive = false;
        };
    }, [path]);

    return (
        <div
            className="aspect-[3/4] w-full rounded-[4px] overflow-hidden flex items-center justify-center transition-transform group-hover:-translate-y-0.5"
            style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-page)' }}
        >
            {src ? (
                <img src={src} alt="" className="w-full h-full object-cover object-top bg-white" draggable={false} />
            ) : (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <FileText size={22} className="faint" strokeWidth={1.5} />
                    {src === null && <span className="serif text-[13px] muted line-clamp-3">{displayName(name)}</span>}
                </div>
            )}
        </div>
    );
}

export default function Library({ dueCount }: { dueCount: number }) {
    const navigate = useNavigate();
    const setCurrentPdf = useStore(s => s.setCurrentPdf);
    const [recent, setRecent] = useState<RecentPdf[] | null>(null);
    const [wordTotal, setWordTotal] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        window.electronAPI.getRecentPdfs().then(setRecent).catch(() => setRecent([]));
        window.electronAPI.getStats().then(s => setWordTotal(s.totalWords)).catch(() => { });
    }, []);

    const openFile = async () => {
        const file = await window.electronAPI.openPdfDialog();
        if (!file) return;
        await window.electronAPI.addRecentPdf(file.name, file.path);
        setCurrentPdf(file);
        navigate('/reader');
    };

    const openRecent = async (pdf: RecentPdf) => {
        setError(null);
        const file = await window.electronAPI.openPdfByPath(pdf.path);
        if (!file) {
            setError(`Couldn't open “${pdf.name}”. It may have been moved or deleted.`);
            return;
        }
        await window.electronAPI.addRecentPdf(file.name, file.path);
        setCurrentPdf(file);
        navigate('/reader');
    };

    const [latest, ...rest] = recent ?? [];

    return (
        <div className="h-full overflow-auto">
            <div className="max-w-[1080px] mx-auto px-10 pt-10 pb-16">
                <header className="flex items-end justify-between gap-6 mb-8">
                    <div>
                        <h1 className="serif text-[30px] leading-tight font-semibold tracking-[-0.01em]">Library</h1>
                        <p className="muted mt-1 text-[13.5px]">
                            {wordTotal === null ? ' ' : wordTotal === 0
                                ? 'Select any word while reading to translate and save it.'
                                : `${wordTotal} saved ${wordTotal === 1 ? 'word' : 'words'}`}
                        </p>
                    </div>
                    <button className="btn btn-primary btn-lg" onClick={openFile}>
                        <FolderOpen size={16} />
                        Open PDF
                    </button>
                </header>

                {dueCount > 0 && (
                    <button
                        onClick={() => navigate('/words', { state: { startReview: true } })}
                        className="w-full flex items-center justify-between gap-4 px-4 h-12 mb-8 rounded-lg border text-left transition-colors hover:bg-[var(--surface-2)]"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <span className="flex items-center gap-3 text-[13.5px]">
                            <span className="dot" style={{ background: 'var(--accent)' }} />
                            <span>
                                <strong className="font-semibold">{dueCount}</strong> {dueCount === 1 ? 'word is' : 'words are'} due for review
                            </span>
                        </span>
                        <span className="flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
                            Review now <ArrowRight size={15} />
                        </span>
                    </button>
                )}

                {error && (
                    <p className="mb-6 text-[13px] px-3 py-2 rounded-md" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>
                )}

                {recent === null ? null : recent.length === 0 ? (
                    <div className="mt-16 flex flex-col items-center text-center">
                        <div className="w-[120px] mb-6 opacity-80">
                            <div className="aspect-[3/4] rounded-[4px] border border-dashed flex items-center justify-center" style={{ borderColor: 'var(--border-strong)' }}>
                                <FileText size={26} className="faint" strokeWidth={1.5} />
                            </div>
                        </div>
                        <h2 className="serif text-[20px] font-semibold">Nothing here yet</h2>
                        <p className="muted mt-1.5 max-w-[340px]">Open a PDF in the language you're learning. Select a word to see its translation and save it to a list.</p>
                        <button className="btn btn-outline btn-lg mt-6" onClick={openFile}>
                            <FolderOpen size={16} />
                            Choose a PDF…
                        </button>
                    </div>
                ) : (
                    <>
                        {latest && (
                            <section className="mb-12">
                                <h2 className="label mb-3">Continue reading</h2>
                                <button
                                    onClick={() => openRecent(latest)}
                                    className="group w-full flex items-center gap-6 p-4 rounded-xl border text-left transition-colors hover:bg-[var(--surface-2)]"
                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                                >
                                    <div className="w-[84px] shrink-0">
                                        <Cover path={latest.path} name={latest.name} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="serif text-[19px] font-semibold leading-snug truncate">{displayName(latest.name)}</p>
                                        <p className="faint text-[12.5px] mt-1">
                                            {progressLabel(latest) ? `${progressLabel(latest)} · ` : ''}Opened {relativeDate(latest.last_opened).toLowerCase()}
                                        </p>
                                        {latest.page_count ? (
                                            <div className="h-1 w-48 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                                                <div className="h-full rounded-full" style={{ width: `${Math.round(((latest.last_page ?? 1) / latest.page_count) * 100)}%`, background: 'var(--accent)' }} />
                                            </div>
                                        ) : null}
                                    </div>
                                    <span className="btn btn-outline shrink-0 mr-1">
                                        {(latest.last_page ?? 1) > 1 ? 'Resume' : 'Open'} <ArrowRight size={14} />
                                    </span>
                                </button>
                            </section>
                        )}

                        {rest.length > 0 && (
                            <section>
                                <h2 className="label mb-4">Recent</h2>
                                <div className="grid gap-x-6 gap-y-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                                    {rest.slice(0, 15).map(pdf => (
                                        <button key={pdf.id} onClick={() => openRecent(pdf)} className="group text-left min-w-0">
                                            <Cover path={pdf.path} name={pdf.name} />
                                            <p className="text-[13px] font-medium mt-3 leading-snug line-clamp-2">{displayName(pdf.name)}</p>
                                            <p className="text-[12px] faint mt-0.5">{progressLabel(pdf) ?? relativeDate(pdf.last_opened)}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
