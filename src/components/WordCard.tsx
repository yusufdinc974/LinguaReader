import { useLayoutEffect, useRef, useState } from 'react';
import { X, Plus, Check, Loader2, ChevronDown } from 'lucide-react';
import type { WordList } from '../types';
import { LEVELS, DEFAULT_LIST_COLOR } from '../lib/words';

export interface WordCardState {
    text: string;
    translation: string;
    loading: boolean;
    failed: boolean;
    source?: string;
    detectedLanguage?: string;
    anchor: { left: number; top: number; bottom: number; width: number };
}

interface Props {
    card: WordCardState;
    level: number;
    onLevel: (l: number) => void;
    lists: WordList[];
    saved: boolean;
    onSave: (listId: number) => void;
    onCreateList: (name: string) => void;
    onRemove: () => void;
    onClose: () => void;
}

const W = 320;
const GAP = 10;

export default function WordCard({ card, level, onLevel, lists, saved, onSave, onCreateList, onRemove, onClose }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
    const [menu, setMenu] = useState(false);
    const [newName, setNewName] = useState('');

    // Place under the selection, or above it if there's no room; keep on screen.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const h = el.offsetHeight;
        const { left, top, bottom, width } = card.anchor;
        let x = left + width / 2 - W / 2;
        x = Math.max(12, Math.min(x, window.innerWidth - W - 12));
        let y = bottom + GAP;
        if (y + h > window.innerHeight - 12) y = Math.max(12, top - GAP - h);
        setPos({ left: x, top: y });
    }, [card.anchor, menu, card.loading]);

    const canSave = !card.loading && !card.failed && !!card.translation;

    const createList = () => {
        const name = newName.trim();
        if (!name) return;
        onCreateList(name);
        setNewName('');
        setMenu(false);
    };

    return (
        <div
            ref={ref}
            className="popover fixed z-[120] anim-in"
            style={{ width: W, left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
            onMouseUp={e => e.stopPropagation()}
            role="dialog"
            aria-label="Translation"
        >
            <div className="p-4 pb-3">
                <div className="flex items-start gap-2">
                    <p className="serif text-[19px] font-semibold leading-snug flex-1 min-w-0 break-words">{card.text}</p>
                    <button className="icon-btn -mr-2 -mt-1 shrink-0" onClick={onClose} aria-label="Close">
                        <X size={15} />
                    </button>
                </div>

                <div className="mt-1.5 min-h-[22px]">
                    {card.loading ? (
                        <span className="flex items-center gap-2 muted text-[13.5px]">
                            <Loader2 size={13} className="animate-spin" /> Translating…
                        </span>
                    ) : card.failed ? (
                        <span className="text-[13.5px]" style={{ color: 'var(--danger)' }}>Translation failed. Select the text again to retry.</span>
                    ) : (
                        <p className="text-[15px] leading-snug break-words" style={{ color: 'var(--text-2)' }}>{card.translation}</p>
                    )}
                </div>
                {card.source && !card.loading && !card.failed && (
                    <p className="text-[11px] faint mt-1.5">via {card.source}</p>
                )}
            </div>

            <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                    <span className="label">How well do you know it?</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map(l => {
                        const active = level === l;
                        return (
                            <button
                                key={l}
                                onClick={() => onLevel(l)}
                                className="h-8 rounded-md flex flex-col items-center justify-center gap-[3px] text-[11px] font-medium transition-colors"
                                style={{
                                    background: active ? 'var(--surface-2)' : 'transparent',
                                    color: active ? 'var(--text)' : 'var(--text-3)',
                                    boxShadow: active ? `inset 0 0 0 1px var(--border-strong)` : 'none',
                                }}
                                title={LEVELS[l].label}
                            >
                                <span className="w-4 h-[3px] rounded-full" style={{ background: LEVELS[l].color, opacity: active ? 1 : 0.55 }} />
                                {LEVELS[l].label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-4 pb-4 pt-1">
                <div className="flex items-center gap-2">
                    <button className="btn btn-primary flex-1" disabled={!canSave} onClick={() => setMenu(m => !m)}>
                        {saved ? <Check size={14} /> : <Plus size={14} />}
                        {saved ? 'Save to another list' : 'Save to list'}
                        <ChevronDown size={14} className={`opacity-70 -mr-1 transition-transform ${menu ? 'rotate-180' : ''}`} />
                    </button>
                    {saved && (
                        <button className="btn btn-danger" onClick={onRemove} title="Delete this word from all lists">
                            Remove
                        </button>
                    )}
                </div>

                {menu && (
                    <div className="mt-2 p-1 rounded-md border anim-in" style={{ borderColor: 'var(--border)' }}>
                        <div className="max-h-44 overflow-auto">
                            {lists.length === 0 && <p className="text-[12.5px] faint px-2 py-2">No lists yet. Create one below.</p>}
                            {lists.map(list => (
                                <button key={list.id} className="menu-item" onClick={() => { onSave(list.id); setMenu(false); }}>
                                    <span className="dot" style={{ background: list.color || DEFAULT_LIST_COLOR }} />
                                    <span className="truncate">{list.name}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1 p-1 mt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                            <input
                                className="field h-[30px]"
                                placeholder="New list…"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && createList()}
                            />
                            <button className="btn btn-outline h-[30px] px-2.5" disabled={!newName.trim()} onClick={createList} aria-label="Create list">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
