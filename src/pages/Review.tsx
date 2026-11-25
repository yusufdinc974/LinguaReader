import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Check, ArrowRight } from 'lucide-react';
import type { QuizQuestion, Word } from '../types';
import type { ReviewConfig } from '../components/ReviewSetup';
import { wordKey } from '../lib/words';
import { splitAround } from '../lib/context';
import { displayName } from '../lib/document';
import { schedule, leavesSession, type Grade } from '../lib/srs';
import { useStore } from '../store/useStore';

interface Item {
    question: QuizQuestion;
    attempts: number;
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/**
 * Reschedules a word from its first answer in a session. Later answers in the
 * same session are practice and must not call this (see src/lib/srs.ts).
 */
async function updateSRS(word: string, grade: Grade) {
    try {
        const key = wordKey(word);
        const f = await window.electronAPI.getWordFamiliarity(key);
        if (!f) return;
        const u = schedule(f, grade);
        await window.electronAPI.updateWordSRS(key, u.easinessFactor, u.interval, u.repetitions, u.nextReviewDate, u.level);
    } catch (e) {
        console.error('Failed to update SRS:', e);
    }
}

/**
 * The sentence the word was saved from, with the word marked, or blanked out
 * when the word itself is the answer (Reverse, before answering).
 */
function Context({ word, blank }: { word: Word; blank: boolean }) {
    const sentence = word.sentence_context?.trim();
    if (!sentence) return null;
    const parts = splitAround(sentence, word.word);
    // Can't hide the word in this sentence: show it only after answering
    if (blank && !parts) return null;
    return (
        <div className="mt-5 max-w-[520px] mx-auto anim-in">
            <p className="serif text-[16.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                {parts ? (
                    <>
                        {parts[0]}
                        {blank
                            ? <span className="inline-block align-baseline border-b-2 mx-0.5" style={{ borderColor: 'var(--border-strong)', width: `${Math.min(8, Math.max(2, parts[1].length * 0.6))}em` }} aria-label="hidden word" />
                            : <mark className="rounded px-0.5" style={{ background: 'var(--accent-soft)', color: 'var(--text)' }}>{parts[1]}</mark>}
                        {parts[2]}
                    </>
                ) : sentence}
            </p>
            {word.pdf_name && <p className="text-[11.5px] faint mt-1.5 truncate">{displayName(word.pdf_name)}</p>}
        </div>
    );
}

export default function Review() {
    const navigate = useNavigate();
    const config = useLocation().state as ReviewConfig | null;
    const bumpData = useStore(s => s.bumpData);

    const [queue, setQueue] = useState<Item[]>([]);
    const [done, setDone] = useState<Item[]>([]);
    const [total, setTotal] = useState(0);
    const [firstTry, setFirstTry] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [picked, setPicked] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'empty' | 'active' | 'complete'>('loading');
    const saved = useRef(false);

    const mode = config?.mode ?? 'flashcard';

    const build = useCallback(async () => {
        if (!config) return;
        setStatus('loading');
        saved.current = false;
        const pool: Word[] = config.listId ? await window.electronAPI.getWordsInList(config.listId) : await window.electronAPI.getAllWords();
        let candidates = pool;
        if (config.dueOnly) {
            const due = new Set((await window.electronAPI.getWordsDueForReview()).map(w => w.word_lower));
            candidates = pool.filter(w => due.has(wordKey(w.word)));
        }
        if (candidates.length === 0) {
            setStatus('empty');
            return;
        }
        const picked = shuffle(candidates).slice(0, config.size > 0 ? config.size : candidates.length);
        const items: Item[] = picked.map(word => {
            const others = shuffle(pool.filter(w => w.id !== word.id)).slice(0, 3);
            const correct = mode === 'reverse' ? word.word : word.translation;
            const options = shuffle([correct, ...others.map(w => (mode === 'reverse' ? w.word : w.translation))]);
            return { question: { word, options, correctAnswer: correct }, attempts: 0 };
        });
        setQueue(items);
        setDone([]);
        setTotal(items.length);
        setFirstTry(0);
        setRevealed(false);
        setPicked(null);
        setStatus('active');
    }, [config, mode]);

    useEffect(() => {
        if (!config) navigate('/words', { replace: true });
        else build();
    }, [config, build, navigate]);

    // Session finished
    useEffect(() => {
        if (status !== 'active' || queue.length > 0 || done.length === 0) return;
        setStatus('complete');
        if (!saved.current && config?.listId) {
            saved.current = true;
            window.electronAPI.saveQuizResult(config.listId, firstTry, total, mode).catch(() => { });
        }
        bumpData();
    }, [status, queue.length, done.length, config, firstTry, total, mode, bumpData]);

    const current = queue[0];

    /** Apply a grade (1 didn't know, 2 unsure, 3 knew) to the current word and advance. */
    const advance = useCallback((grade: number) => {
        const [head, ...rest] = queue;
        if (!head) return;
        const updated = { ...head, attempts: head.attempts + 1 };
        if (leavesSession(grade as Grade)) {
            setDone(d => [...d, updated]);
            setQueue(rest);
        } else {
            setQueue([...rest, updated]);
        }
        setRevealed(false);
        setPicked(null);
    }, [queue]);

    const gradeFlashcard = useCallback((grade: number) => {
        if (!current) return;
        if (current.attempts === 0) {
            if (grade === 3) setFirstTry(n => n + 1);
            updateSRS(current.question.word.word, grade as Grade);
        }
        advance(grade);
    }, [current, advance]);

    const choose = useCallback((option: string) => {
        if (!current || revealed) return;
        const correct = option === current.question.correctAnswer;
        if (current.attempts === 0) {
            if (correct) setFirstTry(n => n + 1);
            updateSRS(current.question.word.word, correct ? 3 : 1);
        }
        setPicked(option);
        setRevealed(true);
    }, [current, revealed]);

    const next = useCallback(() => {
        if (!current) return;
        advance(picked === current.question.correctAnswer ? 3 : 1);
    }, [current, picked, advance]);

    const exit = () => navigate('/words');

    // Keyboard: Space reveals, 1/2/3 grade, 1–4 pick, Enter continues, Esc leaves.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') return exit();
            if (status !== 'active' || !current) return;
            if (mode === 'flashcard') {
                if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setRevealed(true); }
                else if (revealed && ['1', '2', '3'].includes(e.key)) gradeFlashcard(Number(e.key));
            } else {
                const opts = current.question.options ?? [];
                const i = Number(e.key) - 1;
                if (!revealed && i >= 0 && i < opts.length) choose(opts[i]);
                else if (revealed && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, current, mode, revealed, gradeFlashcard, choose, next]);

    const progress = total > 0 ? done.length / total : 0;
    const title = config?.listName || 'All words';

    return (
        <div className="h-full flex flex-col" style={{ background: 'var(--bg)' }}>
            <header className="h-14 shrink-0 flex items-center gap-4 px-5 drag-region">
                <button className="icon-btn no-drag" onClick={exit} aria-label="End review" title="End review (Esc)">
                    <X size={18} />
                </button>
                <div className="flex-1 max-w-[520px] mx-auto no-drag">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress * 100}%`, background: 'var(--accent)' }} />
                    </div>
                </div>
                <span className="text-[12.5px] faint tabular-nums w-24 text-right no-drag">
                    {status === 'active' || status === 'complete' ? `${done.length} / ${total}` : ''}
                </span>
            </header>

            <div className="flex-1 flex items-center justify-center px-6 pb-14 overflow-auto">
                {status === 'loading' && null}

                {status === 'empty' && (
                    <div className="text-center">
                        <p className="serif text-[22px] font-semibold">Nothing to review</p>
                        <p className="muted mt-1.5">No words in “{title}” are due right now.</p>
                        <button className="btn btn-outline btn-lg mt-6" onClick={exit}>Back to words</button>
                    </div>
                )}

                {status === 'complete' && (
                    <div className="text-center max-w-[380px] anim-in">
                        <p className="label">{title}</p>
                        <p className="serif text-[30px] font-semibold mt-2">Session complete</p>
                        <p className="muted mt-2">
                            You got <strong style={{ color: 'var(--text)' }}>{firstTry} of {total}</strong> right on the first try.
                            {' '}Words you missed came back until you got them right.
                        </p>
                        <div className="flex justify-center gap-2 mt-8">
                            <button className="btn btn-outline btn-lg" onClick={exit}>Done</button>
                            <button className="btn btn-primary btn-lg" onClick={build}>Go again</button>
                        </div>
                    </div>
                )}

                {status === 'active' && current && (
                    <div key={`${current.question.word.id}-${current.attempts}`} className="w-full max-w-[560px] anim-in">
                        <div className="text-center mb-10">
                            <p className="label mb-4">
                                {mode === 'reverse' ? 'Which word means' : 'Translate'}
                                {current.attempts > 0 && <span className="ml-2 normal-case tracking-normal" style={{ color: 'var(--warn)' }}>· again</span>}
                            </p>
                            <p className="serif text-[40px] leading-tight font-semibold break-words">
                                {mode === 'reverse' ? current.question.word.translation : current.question.word.word}
                            </p>
                            <Context word={current.question.word} blank={mode === 'reverse' && !revealed} />
                        </div>

                        {mode === 'flashcard' ? (
                            <div className="text-center">
                                <div className="min-h-[64px] flex items-center justify-center">
                                    {revealed ? (
                                        <p className="text-[22px] anim-in break-words" style={{ color: 'var(--text-2)' }}>{current.question.word.translation}</p>
                                    ) : (
                                        <div className="h-px w-16" style={{ background: 'var(--border-strong)' }} />
                                    )}
                                </div>
                                <div className="mt-10">
                                    {!revealed ? (
                                        <button className="btn btn-primary btn-lg min-w-[200px]" onClick={() => setRevealed(true)}>
                                            Show answer <span className="kbd ml-1" style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'inherit', opacity: 0.8 }}>Space</span>
                                        </button>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2 max-w-[460px] mx-auto">
                                            {[
                                                { g: 1, label: "Didn't know", color: 'var(--danger)' },
                                                { g: 2, label: 'Unsure', color: 'var(--warn)' },
                                                { g: 3, label: 'Knew it', color: 'var(--ok)' },
                                            ].map(b => (
                                                <button
                                                    key={b.g}
                                                    onClick={() => gradeFlashcard(b.g)}
                                                    className="h-14 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors hover:bg-[var(--surface)]"
                                                    style={{ borderColor: 'var(--border-strong)' }}
                                                >
                                                    <span className="text-[13.5px] font-medium" style={{ color: b.color }}>{b.label}</span>
                                                    <span className="text-[11px] faint">{b.g}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="grid gap-2">
                                    {(current.question.options ?? []).map((opt, i) => {
                                        const isCorrect = opt === current.question.correctAnswer;
                                        const isPicked = opt === picked;
                                        let border = 'var(--border-strong)';
                                        let bg = 'var(--surface)';
                                        let fg = 'var(--text)';
                                        if (revealed && isCorrect) { border = 'var(--ok)'; bg = 'color-mix(in srgb, var(--ok) 10%, var(--surface))'; }
                                        else if (revealed && isPicked) { border = 'var(--danger)'; bg = 'var(--danger-soft)'; }
                                        else if (revealed) fg = 'var(--text-3)';
                                        return (
                                            <button
                                                key={`${opt}-${i}`}
                                                disabled={revealed}
                                                onClick={() => choose(opt)}
                                                className={`h-[52px] px-4 rounded-lg border flex items-center gap-3 text-left transition-colors ${revealed ? '' : 'hover:bg-[var(--surface-2)]'}`}
                                                style={{ borderColor: border, background: bg, color: fg }}
                                            >
                                                <span className="kbd">{i + 1}</span>
                                                <span className={`flex-1 truncate text-[15px] ${mode === 'reverse' ? 'serif' : ''}`}>{opt}</span>
                                                {revealed && isCorrect && <Check size={17} style={{ color: 'var(--ok)' }} />}
                                                {revealed && isPicked && !isCorrect && <X size={17} style={{ color: 'var(--danger)' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="h-14 mt-5 flex justify-center">
                                    {revealed && (
                                        <button className="btn btn-primary btn-lg min-w-[200px] anim-in" onClick={next} autoFocus>
                                            {picked === current.question.correctAnswer ? 'Continue' : "Continue · you'll see it again"}
                                            <ArrowRight size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
