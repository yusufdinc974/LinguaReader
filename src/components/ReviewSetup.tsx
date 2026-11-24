import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { QuizType } from '../types';

export interface ReviewConfig {
    listId: number | null; // null = every list
    listName: string;
    mode: QuizType;
    size: number; // 0 = all
    dueOnly: boolean;
}

interface Props {
    listId: number | null;
    listName: string;
    total: number;
    due: number;
    onClose: () => void;
    align?: 'left' | 'right';
}

const MODES: { id: QuizType; label: string; hint: string }[] = [
    { id: 'flashcard', label: 'Flashcards', hint: 'See the word, recall the meaning, rate yourself.' },
    { id: 'multiple-choice', label: 'Choice', hint: 'Pick the right translation from four.' },
    { id: 'reverse', label: 'Reverse', hint: 'See the translation, pick the word.' },
];

export default function ReviewSetup({ listId, listName, total, due, onClose, align = 'right' }: Props) {
    const navigate = useNavigate();
    const [mode, setMode] = useState<QuizType>(() => (localStorage.getItem('reviewMode') as QuizType) || 'flashcard');
    const [dueOnly, setDueOnly] = useState(due > 0);
    const [size, setSize] = useState(() => Number(localStorage.getItem('reviewSize') ?? 20));

    const pool = dueOnly ? due : total;
    const sizes = [10, 20, 50].filter(s => s < pool);

    const start = () => {
        localStorage.setItem('reviewMode', mode);
        localStorage.setItem('reviewSize', String(size));
        const config: ReviewConfig = { listId, listName, mode, size, dueOnly };
        navigate('/review', { state: config });
    };

    return (
        <div className={`popover absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-[320px] p-4 z-50 anim-in text-left`} data-popover onMouseDown={e => e.stopPropagation()}>
            <p className="label mb-2">Mode</p>
            <div className="segmented w-full">
                {MODES.map(m => (
                    <button key={m.id} className="flex-1" data-active={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
                ))}
            </div>
            <p className="text-[12.5px] faint mt-2 min-h-[34px]">{MODES.find(m => m.id === mode)?.hint}</p>

            {due > 0 && due < total && (
                <>
                    <p className="label mt-3 mb-2">Words</p>
                    <div className="segmented w-full">
                        <button className="flex-1" data-active={dueOnly} onClick={() => setDueOnly(true)}>Due ({due})</button>
                        <button className="flex-1" data-active={!dueOnly} onClick={() => setDueOnly(false)}>All ({total})</button>
                    </div>
                </>
            )}

            {pool > 10 && (
                <>
                    <p className="label mt-4 mb-2">Session length</p>
                    <div className="segmented w-full">
                        {sizes.map(s => (
                            <button key={s} className="flex-1" data-active={size === s} onClick={() => setSize(s)}>{s}</button>
                        ))}
                        <button className="flex-1" data-active={size === 0 || !sizes.includes(size)} onClick={() => setSize(0)}>All {pool}</button>
                    </div>
                </>
            )}

            <div className="flex justify-end gap-2 mt-5">
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={start} disabled={pool === 0}>
                    Start
                </button>
            </div>
        </div>
    );
}
