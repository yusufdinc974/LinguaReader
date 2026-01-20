import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import type { WordList } from '../types';

interface TranslationPopupProps {
    text: string;
    translation: string;
    detectedLanguage?: string;
    position: { x: number; y: number };
    isLoading: boolean;
    wordLists: WordList[];
    onClose: () => void;
    onAddToList: (listId: number) => void;
    onCreateList: (name: string) => void;
}

function TranslationPopup({
    text,
    translation,
    detectedLanguage,
    position,
    isLoading,
    wordLists,
    onClose,
    onAddToList,
    onCreateList,
}: TranslationPopupProps) {
    const [showListSelect, setShowListSelect] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [showNewListInput, setShowNewListInput] = useState(false);

    const handleCreateList = () => {
        if (newListName.trim()) {
            onCreateList(newListName.trim());
            setNewListName('');
            setShowNewListInput(false);
        }
    };

    return (
        <div
            className="fixed z-50 animate-scale-in"
            style={{
                left: Math.min(position.x, window.innerWidth - 320),
                top: Math.min(position.y + 10, window.innerHeight - 300),
            }}
        >
            <div className="glass rounded-xl shadow-2xl shadow-black/50 w-80 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-primary-500/20 to-accent-500/20">
                    <span className="text-sm font-medium text-dark-300">Translation</span>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Original Text */}
                    <div className="mb-3">
                        <span className="text-xs text-dark-400 uppercase tracking-wide">
                            Original {detectedLanguage && `(${detectedLanguage})`}
                        </span>
                        <p className="text-lg font-semibold mt-1 text-primary-300">{text}</p>
                    </div>

                    {/* Translation */}
                    <div className="mb-4">
                        <span className="text-xs text-dark-400 uppercase tracking-wide">
                            Translation
                        </span>
                        {isLoading ? (
                            <div className="flex items-center gap-2 mt-2 text-dark-400">
                                <Loader2 size={16} className="animate-spin" />
                                <span>Translating...</span>
                            </div>
                        ) : (
                            <p className="text-lg mt-1 text-white">{translation}</p>
                        )}
                    </div>

                    {/* Add to List Section */}
                    {!isLoading && translation && (
                        <div className="border-t border-white/10 pt-3">
                            {!showListSelect ? (
                                <button
                                    onClick={() => setShowListSelect(true)}
                                    className="btn-secondary w-full flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    Add to Word List
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-dark-400 uppercase tracking-wide">
                                        Select List
                                    </p>

                                    {wordLists.length > 0 ? (
                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                            {wordLists.map((list) => (
                                                <button
                                                    key={list.id}
                                                    onClick={() => onAddToList(list.id)}
                                                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm"
                                                >
                                                    {list.name}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-dark-400">No lists yet</p>
                                    )}

                                    {/* New List Input */}
                                    {showNewListInput ? (
                                        <div className="flex gap-2 mt-2">
                                            <input
                                                type="text"
                                                value={newListName}
                                                onChange={(e) => setNewListName(e.target.value)}
                                                placeholder="List name..."
                                                className="input text-sm py-2"
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                                            />
                                            <button onClick={handleCreateList} className="btn-primary px-3">
                                                Add
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowNewListInput(true)}
                                            className="text-sm text-primary-400 hover:text-primary-300 transition-colors mt-2"
                                        >
                                            + Create new list
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TranslationPopup;
