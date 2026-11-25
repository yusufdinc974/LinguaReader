import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, X, MoreHorizontal, ArrowRightLeft, Trash2, Play } from 'lucide-react';
import type { Word, WordList } from '../types';
import { useStore } from '../store/useStore';
import { LEVELS, LIST_COLORS, DEFAULT_LIST_COLOR, wordKey } from '../lib/words';
import { displayName } from '../lib/document';
import Dialog, { ConfirmDialog } from '../components/Dialog';
import ReviewSetup from '../components/ReviewSetup';

interface Schedule {
    overdue: number;
    dueToday: number;
    dueSoon: number;
    good: number;
    mastered: number;
    totalWords: number;
    upcomingDays: { [date: string]: number };
}

type Counts = Record<number, { total: number; due: number }>;

function nextReviewLabel(iso?: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
    if (diff <= 0) return 'Due';
    if (diff === 1) return 'Tomorrow';
    if (diff < 7) return `In ${diff} days`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Upcoming({ days, dueNow }: { days: Schedule['upcomingDays']; dueNow: number }) {
    const data = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        const n = (days[key] || 0);
        return { key, label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), n: i === 0 ? Math.max(n, dueNow) : n };
    });
    const max = Math.max(1, ...data.map(d => d.n));
    return (
        <div className="flex items-end gap-[3px] h-8" aria-label="Reviews over the next 14 days">
            {data.map((d, i) => (
                <div
                    key={d.key}
                    className="flex-1 rounded-[2px]"
                    title={`${i === 0 ? 'Today' : d.label}: ${d.n}`}
                    style={{
                        height: `${Math.max(8, (d.n / max) * 100)}%`,
                        background: d.n === 0 ? 'var(--surface-3)' : i === 0 ? 'var(--accent)' : 'var(--text-3)',
                        opacity: d.n === 0 ? 0.6 : 1,
                    }}
                />
            ))}
        </div>
    );
}

export default function Words() {
    const navigate = useNavigate();
    const location = useLocation();
    const bumpData = useStore(s => s.bumpData);
    const dataVersion = useStore(s => s.dataVersion);

    const [lists, setLists] = useState<WordList[] | null>(null);
    const [counts, setCounts] = useState<Counts>({});
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(() => Number(localStorage.getItem('wordsList')) || null);
    const [words, setWords] = useState<Word[]>([]);
    const [query, setQuery] = useState('');

    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newColor, setNewColor] = useState(LIST_COLORS[5]);

    const [reviewFor, setReviewFor] = useState<'all' | 'list' | null>(
        () => ((location.state as { startReview?: boolean } | null)?.startReview ? 'all' : null),
    );
    const [listMenu, setListMenu] = useState(false);
    const [rowMenu, setRowMenu] = useState<number | null>(null);
    const [confirm, setConfirm] = useState<{ title: string; message: string; label: string; run: () => void } | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const selected = lists?.find(l => l.id === selectedId) ?? null;

    const loadAll = useCallback(async () => {
        const [ls, due, sched] = await Promise.all([
            window.electronAPI.getWordLists(),
            window.electronAPI.getWordsDueForReview(),
            window.electronAPI.getReviewSchedule(),
        ]);
        const dueSet = new Set(due.map(w => w.word_lower));
        const c: Counts = {};
        await Promise.all(ls.map(async l => {
            const ws = await window.electronAPI.getWordsInList(l.id);
            c[l.id] = { total: ws.length, due: ws.filter(w => dueSet.has(wordKey(w.word))).length };
        }));
        setLists(ls);
        setCounts(c);
        setSchedule(sched);
        setSelectedId(id => (id && ls.some(l => l.id === id) ? id : ls[0]?.id ?? null));
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll, dataVersion]);

    const loadWords = useCallback(async (id: number) => setWords(await window.electronAPI.getWordsInList(id)), []);

    useEffect(() => {
        if (selectedId) {
            localStorage.setItem('wordsList', String(selectedId));
            loadWords(selectedId);
        } else setWords([]);
        setQuery('');
        setRowMenu(null);
    }, [selectedId, loadWords]);

    const flash = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const createList = async () => {
        if (!newName.trim()) return;
        const id = await window.electronAPI.createWordList(newName.trim(), newDesc.trim(), newColor);
        setCreating(false);
        setNewName('');
        setNewDesc('');
        await loadAll();
        setSelectedId(id);
    };

    const deleteList = (list: WordList) => setConfirm({
        title: `Delete “${list.name}”?`,
        message: 'The list is removed. Words that are not in any other list are deleted too.',
        label: 'Delete list',
        run: async () => {
            await window.electronAPI.deleteWordList(list.id);
            setSelectedId(null);
            bumpData();
        },
    });

    const removeWord = (word: Word) => setConfirm({
        title: `Remove “${word.word}”?`,
        message: 'It is removed from this list. If it is not in any other list, it is deleted.',
        label: 'Remove',
        run: async () => {
            if (!selected) return;
            await window.electronAPI.removeWordFromList(word.id, selected.id);
            await loadWords(selected.id);
            bumpData();
        },
    });

    const moveWord = async (word: Word, toId: number) => {
        if (!selected) return;
        setRowMenu(null);
        const r = await window.electronAPI.moveWordToList(word.id, selected.id, toId);
        if (r.success) {
            await loadWords(selected.id);
            bumpData();
        } else flash(r.message || 'Could not move the word.');
    };

    const exportList = async (includeProgress: boolean) => {
        if (!selected) return;
        setListMenu(false);
        const r = await window.electronAPI.exportList(selected.id, includeProgress);
        if (r.success) flash(`Exported ${r.wordCount} words.`);
        else if (r.error) flash(r.error);
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return words;
        return words.filter(w => w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q));
    }, [words, query]);

    const dueNow = schedule ? schedule.overdue + schedule.dueToday : 0;
    const learned = schedule ? schedule.good + schedule.mastered : 0;
    const totalWords = schedule?.totalWords ?? 0;
    const selCounts = selected ? counts[selected.id] ?? { total: words.length, due: 0 } : null;

    return (
        <div className="h-full flex" onMouseDown={e => {
            if (!(e.target as HTMLElement).closest('[data-popover]')) {
                setListMenu(false);
                setRowMenu(null);
                if (reviewFor) setReviewFor(null);
            }
        }}>
            {/* ---------- left column ---------- */}
            <aside className="w-[260px] shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <h1 className="serif text-[24px] font-semibold leading-none">Words</h1>

                    {schedule && totalWords > 0 && (
                        <>
                            <div className="grid grid-cols-3 mt-5 mb-4">
                                {[
                                    { n: dueNow, l: 'Due now', strong: dueNow > 0 },
                                    { n: schedule.dueSoon, l: 'Soon' },
                                    { n: learned, l: 'Learned' },
                                ].map(s => (
                                    <div key={s.l}>
                                        <p className="text-[20px] font-semibold tabular-nums leading-none" style={{ color: s.strong ? 'var(--accent)' : 'var(--text)' }}>{s.n}</p>
                                        <p className="text-[11.5px] faint mt-1">{s.l}</p>
                                    </div>
                                ))}
                            </div>
                            <Upcoming days={schedule.upcomingDays} dueNow={dueNow} />
                            <p className="text-[11px] faint mt-1.5 flex justify-between"><span>Today</span><span>2 weeks</span></p>

                            <div className="relative mt-4" data-popover>
                                <button
                                    className={`btn w-full ${dueNow > 0 ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setReviewFor(r => (r === 'all' ? null : 'all'))}
                                >
                                    <Play size={13} />
                                    {dueNow > 0 ? `Review ${dueNow} due` : 'Practice all words'}
                                </button>
                                {reviewFor === 'all' && (
                                    <ReviewSetup align="left" listId={null} listName="" total={totalWords} due={dueNow} onClose={() => setReviewFor(null)} />
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <span className="label">Lists</span>
                    <button className="icon-btn w-7 h-7 -mr-1.5" onClick={() => setCreating(true)} title="New list" aria-label="New list">
                        <Plus size={15} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto px-2 pb-4">
                    {lists?.length === 0 && (
                        <div className="px-3 py-2">
                            <p className="text-[12.5px] faint">No lists yet.</p>
                            <button className="btn btn-outline mt-3" onClick={() => setCreating(true)}><Plus size={14} /> New list</button>
                        </div>
                    )}
                    {lists?.map(list => {
                        const active = list.id === selectedId;
                        const c = counts[list.id];
                        return (
                            <button
                                key={list.id}
                                onClick={() => setSelectedId(list.id)}
                                className="w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-left transition-colors"
                                style={{ background: active ? 'var(--surface-2)' : 'transparent' }}
                            >
                                <span className="dot" style={{ background: list.color || DEFAULT_LIST_COLOR }} />
                                <span className={`flex-1 truncate text-[13.5px] ${active ? 'font-medium' : ''}`}>{list.name}</span>
                                {c && c.due > 0 && <span className="text-[11.5px] tabular-nums font-medium" style={{ color: 'var(--accent)' }}>{c.due}</span>}
                                <span className="text-[11.5px] tabular-nums faint w-6 text-right">{c?.total ?? ''}</span>
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* ---------- main ---------- */}
            <section className="flex-1 min-w-0 flex flex-col">
                {selected ? (
                    <>
                        <header className="px-10 pt-8 pb-5">
                            <div className="flex items-start justify-between gap-6">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <span className="dot" style={{ background: selected.color || DEFAULT_LIST_COLOR, width: 10, height: 10 }} />
                                        <h2 className="serif text-[26px] font-semibold leading-tight truncate">{selected.name}</h2>
                                    </div>
                                    <p className="muted text-[13px] mt-1">
                                        {selCounts?.total ?? 0} {selCounts?.total === 1 ? 'word' : 'words'}
                                        {selCounts && selCounts.due > 0 && <> · <span style={{ color: 'var(--accent)' }}>{selCounts.due} due</span></>}
                                        {selected.description && <> · {selected.description}</>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="relative" data-popover>
                                        <button className="btn btn-primary" disabled={words.length === 0} onClick={() => setReviewFor(r => (r === 'list' ? null : 'list'))}>
                                            <Play size={13} /> Review
                                        </button>
                                        {reviewFor === 'list' && (
                                            <ReviewSetup
                                                listId={selected.id}
                                                listName={selected.name}
                                                total={selCounts?.total ?? words.length}
                                                due={selCounts?.due ?? 0}
                                                onClose={() => setReviewFor(null)}
                                            />
                                        )}
                                    </div>
                                    <div className="relative" data-popover>
                                        <button className="icon-btn" data-active={listMenu} onClick={() => setListMenu(m => !m)} aria-label="List options">
                                            <MoreHorizontal size={17} />
                                        </button>
                                        {listMenu && (
                                            <div className="popover absolute right-0 top-full mt-1.5 w-56 p-1 z-50 anim-in">
                                                <button className="menu-item" onClick={() => exportList(true)}>Export with progress</button>
                                                <button className="menu-item" onClick={() => exportList(false)}>Export words only</button>
                                                <div className="h-px my-1" style={{ background: 'var(--border)' }} />
                                                <button className="menu-item" style={{ color: 'var(--danger)' }} onClick={() => { setListMenu(false); deleteList(selected); }}>
                                                    Delete list…
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {words.length > 0 && (
                                <div className="relative mt-5 max-w-[360px]">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 faint" />
                                    <input className="field pl-8 pr-8" placeholder="Search this list" value={query} onChange={e => setQuery(e.target.value)} />
                                    {query && (
                                        <button className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn w-6 h-6" onClick={() => setQuery('')} aria-label="Clear search">
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </header>

                        <div className="flex-1 overflow-auto px-10 pb-10">
                            {words.length === 0 ? (
                                <div className="mt-10 max-w-[360px]">
                                    <p className="serif text-[18px] font-semibold">This list is empty</p>
                                    <p className="muted mt-1">Open a PDF in the Reader, select a word, and choose <em>Save to list</em>.</p>
                                    <button className="btn btn-outline mt-4" onClick={() => navigate('/reader')}>Go to Reader</button>
                                </div>
                            ) : filtered.length === 0 ? (
                                <p className="muted mt-6">No words match “{query}”.</p>
                            ) : (
                                <table className="w-full text-[13.5px] border-collapse">
                                    <thead>
                                        <tr className="text-left">
                                            <th className="label font-medium py-2 pr-4 w-[34%] border-b" style={{ borderColor: 'var(--border)' }}>Word</th>
                                            <th className="label font-medium py-2 pr-4 border-b" style={{ borderColor: 'var(--border)' }}>Translation</th>
                                            <th className="label font-medium py-2 pr-4 w-[110px] border-b" style={{ borderColor: 'var(--border)' }}>Level</th>
                                            <th className="label font-medium py-2 pr-4 w-[100px] border-b" style={{ borderColor: 'var(--border)' }}>Next</th>
                                            <th className="w-[72px] border-b" style={{ borderColor: 'var(--border)' }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(w => {
                                            const lvl = LEVELS[w.familiarity_level || 1] ?? LEVELS[1];
                                            const next = nextReviewLabel(w.next_review_date);
                                            const others = lists?.filter(l => l.id !== selected.id) ?? [];
                                            return (
                                                <tr key={w.id} className="group border-b hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
                                                    <td className="py-2.5 pr-4 align-top">
                                                        <p className="serif text-[16px] leading-snug break-words">{w.word}</p>
                                                        {w.pdf_name && <p className="text-[11.5px] faint mt-0.5 truncate max-w-[280px]" title={w.pdf_name}>{displayName(w.pdf_name)}</p>}
                                                    </td>
                                                    <td className="py-2.5 pr-4 align-top muted break-words">
                                                        {w.translation}
                                                        {w.sentence_context && <p className="serif italic text-[12.5px] faint mt-0.5 line-clamp-2" title={w.sentence_context}>{w.sentence_context}</p>}
                                                    </td>
                                                    <td className="py-2.5 pr-4 align-top">
                                                        <span className="inline-flex items-center gap-1.5 text-[12.5px] muted">
                                                            <span className="w-3 h-[3px] rounded-full" style={{ background: lvl.color }} />
                                                            {lvl.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 pr-4 align-top text-[12.5px] tabular-nums" style={{ color: next === 'Due' ? 'var(--accent)' : 'var(--text-3)' }}>
                                                        {next}
                                                    </td>
                                                    <td className="py-1.5 align-top">
                                                        <div className={`flex justify-end gap-0.5 ${rowMenu === w.id ? '' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                                                            <div className="relative" data-popover>
                                                                <button className="icon-btn w-7 h-7" onClick={() => setRowMenu(m => (m === w.id ? null : w.id))} title="Move to list" aria-label="Move to list">
                                                                    <ArrowRightLeft size={14} />
                                                                </button>
                                                                {rowMenu === w.id && (
                                                                    <div className="popover absolute right-0 top-full mt-1 w-52 p-1 z-50 anim-in">
                                                                        <p className="label px-2 pt-1.5 pb-1">Move to</p>
                                                                        {others.length === 0 && <p className="text-[12.5px] faint px-2 py-1.5">No other lists.</p>}
                                                                        {others.map(l => (
                                                                            <button key={l.id} className="menu-item" onClick={() => moveWord(w, l.id)}>
                                                                                <span className="dot" style={{ background: l.color || DEFAULT_LIST_COLOR }} />
                                                                                <span className="truncate">{l.name}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button className="icon-btn w-7 h-7 hover:!text-[var(--danger)]" onClick={() => removeWord(w)} title="Remove" aria-label="Remove word">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                ) : lists && lists.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                        <p className="serif text-[22px] font-semibold">Make your first list</p>
                        <p className="muted mt-1.5 max-w-[340px]">Lists group the words you save while reading, and each one gets its own highlight color.</p>
                        <button className="btn btn-primary btn-lg mt-6" onClick={() => setCreating(true)}><Plus size={15} /> New list</button>
                    </div>
                ) : null}
            </section>

            {creating && (
                <Dialog
                    title="New list"
                    onClose={() => setCreating(false)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={!newName.trim()} onClick={createList}>Create</button>
                        </>
                    }
                >
                    <label className="label block mb-1.5" htmlFor="list-name">Name</label>
                    <input id="list-name" className="field" autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createList()} placeholder="e.g. Novel vocabulary" />
                    <label className="label block mt-4 mb-1.5" htmlFor="list-desc">Description</label>
                    <input id="list-desc" className="field" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional" />
                    <p className="label mt-4 mb-2">Highlight color</p>
                    <div className="flex gap-2">
                        {LIST_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setNewColor(c)}
                                className="w-6 h-6 rounded-full transition-transform"
                                style={{ background: c, boxShadow: newColor === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : 'none' }}
                                aria-label={`Color ${c}`}
                            />
                        ))}
                    </div>
                </Dialog>
            )}

            {confirm && (
                <ConfirmDialog title={confirm.title} message={confirm.message} confirmLabel={confirm.label} onConfirm={confirm.run} onClose={() => setConfirm(null)} />
            )}

            {toast && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[150] px-3.5 py-2 rounded-md text-[13px] anim-in" style={{ background: 'var(--text)', color: 'var(--surface)' }}>
                    {toast}
                </div>
            )}
        </div>
    );
}
