import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, X, BookOpen, ChevronRight, Download, Share2 } from 'lucide-react';
import type { WordList, Word } from '../types';

function WordLists() {
    const [wordLists, setWordLists] = useState<WordList[]>([]);
    const [selectedList, setSelectedList] = useState<WordList | null>(null);
    const [words, setWords] = useState<Word[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDescription, setNewListDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [exportDropdownId, setExportDropdownId] = useState<number | null>(null);
    const [exportStatus, setExportStatus] = useState<{ listId: number; message: string } | null>(null);

    useEffect(() => {
        loadWordLists();
    }, []);

    const loadWordLists = async () => {
        setLoading(true);
        try {
            const lists = await window.electronAPI.getWordLists();
            setWordLists(lists);
        } catch (error) {
            console.error('Failed to load word lists:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadWords = async (listId: number) => {
        try {
            const listWords = await window.electronAPI.getWordsInList(listId);
            setWords(listWords);
        } catch (error) {
            console.error('Failed to load words:', error);
        }
    };

    const handleSelectList = async (list: WordList) => {
        setSelectedList(list);
        await loadWords(list.id);
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) return;

        try {
            await window.electronAPI.createWordList(newListName.trim(), newListDescription.trim());
            await loadWordLists();
            setShowCreateModal(false);
            setNewListName('');
            setNewListDescription('');
        } catch (error) {
            console.error('Failed to create list:', error);
        }
    };

    const handleDeleteList = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this list?')) return;

        try {
            await window.electronAPI.deleteWordList(id);
            await loadWordLists();
            if (selectedList?.id === id) {
                setSelectedList(null);
                setWords([]);
            }
        } catch (error) {
            console.error('Failed to delete list:', error);
        }
    };

    const handleDeleteWord = async (wordId: number) => {
        if (!selectedList) return;

        try {
            await window.electronAPI.removeWordFromList(wordId, selectedList.id);
            await loadWords(selectedList.id);
        } catch (error) {
            console.error('Failed to remove word:', error);
        }
    };

    const filteredWords = words.filter(word =>
        word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        word.translation.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExportList = async (listId: number, includeProgress: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        setExportDropdownId(null);
        try {
            const result = await window.electronAPI.exportList(listId, includeProgress);
            if (result.success) {
                setExportStatus({ listId, message: `Exported ${result.wordCount} words` });
                setTimeout(() => setExportStatus(null), 3000);
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const getFamiliarityColor = (level: number) => {
        switch (level) {
            case 1: return 'bg-red-500';      // Unknown
            case 2: return 'bg-orange-500';   // Seen
            case 3: return 'bg-yellow-500';   // Learning
            case 4: return 'bg-green-500';    // Familiar
            case 5: return 'bg-blue-500';     // Mastered
            default: return 'bg-dark-600';
        }
    };

    return (
        <div className="h-full flex" style={{ background: 'var(--bg-primary)' }}>
            {/* Lists Sidebar */}
            <div className="w-80 shrink-0 flex flex-col" style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}>
                <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Word Lists</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Create New List
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
                        </div>
                    ) : wordLists.length === 0 ? (
                        <div className="text-center py-8 text-dark-400">
                            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No word lists yet</p>
                            <p className="text-sm">Create one to start learning!</p>
                        </div>
                    ) : (
                        wordLists.map(list => (
                            <div
                                key={list.id}
                                onClick={() => handleSelectList(list)}
                                className="w-full text-left p-4 rounded-lg transition-all duration-200 group cursor-pointer"
                                style={{
                                    background: selectedList?.id === list.id ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                                    border: selectedList?.id === list.id ? '1px solid var(--accent)' : '1px solid transparent'
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: list.color || '#eab308' }}
                                            />
                                            <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{list.name}</p>
                                        </div>
                                        {list.description && (
                                            <p className="text-sm truncate ml-5" style={{ color: 'var(--text-muted)' }}>{list.description}</p>
                                        )}
                                        <p className="text-xs mt-1 ml-5" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(list.created_at).toLocaleDateString()}
                                        </p>
                                        {exportStatus?.listId === list.id && (
                                            <p className="text-xs text-green-400 mt-1 ml-5">{exportStatus.message}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Export Button */}
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExportDropdownId(exportDropdownId === list.id ? null : list.id);
                                                }}
                                                className="p-2 hover:bg-primary-500/20 rounded-lg transition-colors"
                                                title="Export list"
                                            >
                                                <Download size={16} className="text-primary-400" />
                                            </button>
                                            {exportDropdownId === list.id && (
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-50 overflow-hidden">
                                                    <button
                                                        onClick={(e) => handleExportList(list.id, true, e)}
                                                        className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center gap-3"
                                                    >
                                                        <Download size={16} className="text-green-400" />
                                                        <div>
                                                            <p className="text-sm font-medium">With Progress</p>
                                                            <p className="text-xs text-dark-400">Include SRS data</p>
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleExportList(list.id, false, e)}
                                                        className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center gap-3 border-t border-dark-700"
                                                    >
                                                        <Share2 size={16} className="text-blue-400" />
                                                        <div>
                                                            <p className="text-sm font-medium">Raw Words</p>
                                                            <p className="text-xs text-dark-400">For sharing</p>
                                                        </div>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteList(list.id, e)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} className="text-red-400" />
                                        </button>
                                        <ChevronRight size={18} className="text-dark-400" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Words Content */}
            <div className="flex-1 flex flex-col">
                {selectedList ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold">{selectedList.name}</h1>
                                    {selectedList.description && (
                                        <p className="text-dark-400 mt-1">{selectedList.description}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold gradient-text">{words.length}</p>
                                    <p className="text-sm text-dark-400">words</p>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                                <input
                                    type="text"
                                    placeholder="Search words..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="input pl-10"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Words Grid */}
                        <div className="flex-1 overflow-auto p-6">
                            {filteredWords.length === 0 ? (
                                <div className="text-center py-12 text-dark-400">
                                    {searchQuery ? (
                                        <>
                                            <Search size={48} className="mx-auto mb-4 opacity-50" />
                                            <p>No words match your search</p>
                                        </>
                                    ) : (
                                        <>
                                            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                                            <p>No words in this list yet</p>
                                            <p className="text-sm">Add words while reading PDFs!</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredWords.map(word => (
                                        <div key={word.id} className="card card-hover group">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-3 h-3 rounded-full ${getFamiliarityColor(word.familiarity_level || 1)} ring-2 ring-white/10`}
                                                        title={`Familiarity Level: ${word.familiarity_level || 1}`}
                                                    />
                                                    <span className="text-xs text-dark-400 uppercase">
                                                        {word.source_language} → {word.target_language}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteWord(word.id)}
                                                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
                                                >
                                                    <Trash2 size={14} className="text-red-400" />
                                                </button>
                                            </div>

                                            <p className="text-lg font-semibold text-primary-300 mb-1">{word.word}</p>
                                            <p className="text-white mb-3">{word.translation}</p>

                                            {word.sentence_context && (
                                                <p className="text-sm text-dark-400 italic border-t border-white/10 pt-3">
                                                    "{word.sentence_context}"
                                                </p>
                                            )}

                                            {word.pdf_name && (
                                                <p className="text-xs text-dark-500 mt-2">
                                                    From: {word.pdf_name}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-dark-400">
                        <div className="text-center">
                            <BookOpen size={64} className="mx-auto mb-4 opacity-50" />
                            <p className="text-xl">Select a word list to view words</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create List Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="card w-full max-w-md animate-scale-in">
                        <h2 className="text-xl font-bold mb-4">Create New List</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    placeholder="e.g., Spanish Vocabulary"
                                    className="input"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">Description (optional)</label>
                                <textarea
                                    value={newListDescription}
                                    onChange={(e) => setNewListDescription(e.target.value)}
                                    placeholder="Describe this list..."
                                    className="input resize-none h-24"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateList}
                                    disabled={!newListName.trim()}
                                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WordLists;
