import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock, CheckCircle, Star, Brain, ChevronRight, BarChart3, Download, Upload, HardDrive, Check, X, Plus, List } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { WordList } from '../types';

interface ReviewSchedule {
    overdue: number;
    dueToday: number;
    dueSoon: number;
    good: number;
    mastered: number;
    totalWords: number;
    upcomingDays: { [date: string]: number };
}

function StatsPage() {
    const [schedule, setSchedule] = useState<ReviewSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [wordLists, setWordLists] = useState<WordList[]>([]);
    const [pendingWords, setPendingWords] = useState<Array<{ word: string; translation: string; source_language?: string; target_language?: string }>>([]);
    const [selectedListId, setSelectedListId] = useState<number | null>(null);
    const [createNewList, setCreateNewList] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDescription, setNewListDescription] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getReviewSchedule();
            setSchedule(data);
        } catch (error) {
            console.error('Failed to load schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        setExportStatus(null);
        try {
            const result = await window.electronAPI.exportData();
            if (result.success) {
                setExportStatus({ type: 'success', message: `Data exported to ${result.path}` });
            } else {
                setExportStatus({ type: 'error', message: result.error || 'Export failed' });
            }
        } catch (error) {
            setExportStatus({ type: 'error', message: String(error) });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        setImportStatus(null);
        try {
            const parseResult = await window.electronAPI.parseImportFile();

            if (!parseResult.success) {
                if (parseResult.cancelled) {
                    setIsImporting(false);
                    return;
                }
                setImportStatus({ type: 'error', message: parseResult.error || 'Failed to parse file' });
                setIsImporting(false);
                return;
            }

            // Full backup - import directly
            if (parseResult.type === 'full-backup') {
                const result = await window.electronAPI.importData();
                if (result.success && result.imported) {
                    const { lists, words, familiarity } = result.imported;
                    setImportStatus({
                        type: 'success',
                        message: `Imported ${lists} lists, ${words} words, ${familiarity} familiarity records`
                    });
                    loadSchedule();
                } else {
                    setImportStatus({ type: 'error', message: result.error || 'Import failed' });
                }
                setIsImporting(false);
                return;
            }

            // Words-only import
            if (parseResult.type === 'words-only' && parseResult.words) {
                // If file contains list name, auto-create
                if (parseResult.listName) {
                    const listId = await window.electronAPI.createWordList(
                        parseResult.listName,
                        parseResult.listDescription || ''
                    );
                    const result = await window.electronAPI.importWordsToList(listId, parseResult.words);
                    if (result.success && result.imported) {
                        setImportStatus({
                            type: 'success',
                            message: `Created list "${parseResult.listName}" with ${result.imported.words} words`
                        });
                        loadSchedule();
                    } else {
                        setImportStatus({ type: 'error', message: result.error || 'Import failed' });
                    }
                    setIsImporting(false);
                    return;
                }

                // No list name - show modal for selection
                const lists = await window.electronAPI.getWordLists();
                setWordLists(lists);
                setPendingWords(parseResult.words);
                setShowImportModal(true);
                setIsImporting(false);
            }
        } catch (error) {
            setImportStatus({ type: 'error', message: String(error) });
            setIsImporting(false);
        }
    };

    const handleImportToList = async () => {
        if (pendingWords.length === 0) return;

        try {
            let targetListId = selectedListId;

            // Create new list if selected
            if (createNewList && newListName.trim()) {
                targetListId = await window.electronAPI.createWordList(newListName.trim(), newListDescription.trim());
            }

            if (!targetListId) {
                setImportStatus({ type: 'error', message: 'Please select or create a list' });
                return;
            }

            const result = await window.electronAPI.importWordsToList(targetListId, pendingWords);
            if (result.success && result.imported) {
                setImportStatus({
                    type: 'success',
                    message: `Imported ${result.imported.words} words to list`
                });
                loadSchedule();
            } else {
                setImportStatus({ type: 'error', message: result.error || 'Import failed' });
            }

            // Reset modal state
            setShowImportModal(false);
            setPendingWords([]);
            setSelectedListId(null);
            setCreateNewList(false);
            setNewListName('');
            setNewListDescription('');
        } catch (error) {
            setImportStatus({ type: 'error', message: String(error) });
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    if (!schedule) {
        return (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                <p>Failed to load review schedule</p>
            </div>
        );
    }

    const urgent = schedule.overdue + schedule.dueToday;

    // Prepare upcoming days chart data
    const upcomingData = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        upcomingData.push({
            date: dayName,
            count: schedule.upcomingDays[dateStr] || 0,
            isToday: i === 0,
            isTomorrow: i === 1,
        });
    }

    // Health distribution for pie alternative
    const healthData = [
        { name: 'Overdue', count: schedule.overdue, color: '#ef4444' },
        { name: 'Due Today', count: schedule.dueToday, color: '#f97316' },
        { name: 'Due Soon (1-3d)', count: schedule.dueSoon, color: '#eab308' },
        { name: 'Good (4-7d)', count: schedule.good, color: '#22c55e' },
        { name: 'Mastered (7+d)', count: schedule.mastered, color: '#3b82f6' },
    ];

    return (
        <div className="h-full p-4 sm:p-6 lg:p-8 overflow-auto" style={{ background: 'var(--bg-primary)' }}>
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8" style={{ color: 'var(--accent)' }}>
                    Review Schedule
                </h1>

                {/* Urgent Review Alert */}
                {urgent > 0 && (
                    <div
                        onClick={() => navigate('/quiz')}
                        className="card mb-8 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30 cursor-pointer hover:border-orange-500/50 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-xl bg-orange-500/30">
                                    <AlertTriangle size={32} className="text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-orange-300">{urgent} words need review!</p>
                                    <p className="text-orange-200/70">
                                        {schedule.overdue > 0 && `${schedule.overdue} overdue`}
                                        {schedule.overdue > 0 && schedule.dueToday > 0 && ' • '}
                                        {schedule.dueToday > 0 && `${schedule.dueToday} due today`}
                                    </p>
                                </div>
                            </div>
                            <button className="btn-primary bg-orange-500 hover:bg-orange-600">
                                Start Review
                                <ChevronRight size={18} className="ml-1" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Word Health Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="card text-center">
                        <div className="p-3 rounded-xl bg-red-500/20 inline-block mb-2">
                            <AlertTriangle size={24} className="text-red-400" />
                        </div>
                        <p className="text-3xl font-bold text-red-400">{schedule.overdue}</p>
                        <p className="text-sm text-dark-400">Overdue</p>
                    </div>

                    <div className="card text-center">
                        <div className="p-3 rounded-xl bg-orange-500/20 inline-block mb-2">
                            <Clock size={24} className="text-orange-400" />
                        </div>
                        <p className="text-3xl font-bold text-orange-400">{schedule.dueToday}</p>
                        <p className="text-sm text-dark-400">Due Today</p>
                    </div>

                    <div className="card text-center">
                        <div className="p-3 rounded-xl bg-yellow-500/20 inline-block mb-2">
                            <Calendar size={24} className="text-yellow-400" />
                        </div>
                        <p className="text-3xl font-bold text-yellow-400">{schedule.dueSoon}</p>
                        <p className="text-sm text-dark-400">Due Soon</p>
                    </div>

                    <div className="card text-center">
                        <div className="p-3 rounded-xl bg-green-500/20 inline-block mb-2">
                            <CheckCircle size={24} className="text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-green-400">{schedule.good}</p>
                        <p className="text-sm text-dark-400">Good (4-7d)</p>
                    </div>

                    <div className="card text-center">
                        <div className="p-3 rounded-xl bg-blue-500/20 inline-block mb-2">
                            <Star size={24} className="text-blue-400" />
                        </div>
                        <p className="text-3xl font-bold text-blue-400">{schedule.mastered}</p>
                        <p className="text-sm text-dark-400">Mastered</p>
                    </div>
                </div>

                {/* Upcoming Reviews Chart */}
                <div className="card mb-8">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-primary-400" />
                        Upcoming Reviews (Next 14 Days)
                    </h2>
                    {schedule.totalWords > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={upcomingData}>
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    axisLine={{ stroke: '#334155' }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    axisLine={{ stroke: '#334155' }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: '#f8fafc' }}
                                    formatter={(value: number) => [`${value} words`, 'Reviews']}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {upcomingData.map((entry, index) => (
                                        <Cell
                                            key={index}
                                            fill={entry.isToday ? '#f97316' : entry.isTomorrow ? '#eab308' : '#0ea5e9'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-dark-400">
                            <div className="text-center">
                                <Brain size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No words yet. Start learning!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Word Health Distribution */}
                <div className="card">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Brain size={20} className="text-accent-400" />
                        Word Health Distribution
                    </h2>
                    <div className="space-y-4">
                        {healthData.map((item) => {
                            const percentage = schedule.totalWords > 0
                                ? Math.round((item.count / schedule.totalWords) * 100)
                                : 0;
                            return (
                                <div key={item.name}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium">{item.name}</span>
                                        <span className="text-sm text-dark-400">
                                            {item.count} ({percentage}%)
                                        </span>
                                    </div>
                                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: item.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10 text-center">
                        <p className="text-2xl font-bold">{schedule.totalWords}</p>
                        <p className="text-dark-400">Total Words Tracked</p>
                    </div>
                </div>

                {/* Data Management */}
                <div className="card mt-8">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <HardDrive size={20} className="text-primary-400" />
                        Data Management
                    </h2>
                    <p className="text-dark-400 mb-6">
                        Export your learning data to transfer to another device, or import a backup.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="btn-primary flex items-center gap-2"
                        >
                            {isExporting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                                <Download size={18} />
                            )}
                            Export Data
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="btn-secondary flex items-center gap-2"
                        >
                            {isImporting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-400 border-t-transparent" />
                            ) : (
                                <Upload size={18} />
                            )}
                            Import Data
                        </button>
                    </div>

                    {/* Export Status */}
                    {exportStatus && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${exportStatus.type === 'success'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                            }`}>
                            {exportStatus.type === 'success' ? <Check size={18} /> : <X size={18} />}
                            <span className="text-sm">{exportStatus.message}</span>
                        </div>
                    )}

                    {/* Import Status */}
                    {importStatus && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${importStatus.type === 'success'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                            }`}>
                            {importStatus.type === 'success' ? <Check size={18} /> : <X size={18} />}
                            <span className="text-sm">{importStatus.message}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-dark-600">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <List size={20} className="text-primary-400" />
                                Import {pendingWords.length} Words
                            </h3>
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setPendingWords([]);
                                }}
                                className="p-1 hover:bg-white/10 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-dark-400 mb-4">Choose where to add these words:</p>

                        {/* Existing Lists */}
                        {wordLists.length > 0 && (
                            <div className="space-y-2 mb-4 max-h-48 overflow-auto">
                                {wordLists.map(list => (
                                    <label
                                        key={list.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedListId === list.id && !createNewList
                                            ? 'bg-primary-500/20 border border-primary-500'
                                            : 'bg-dark-700/50 border border-transparent hover:bg-dark-700'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="importList"
                                            checked={selectedListId === list.id && !createNewList}
                                            onChange={() => {
                                                setSelectedListId(list.id);
                                                setCreateNewList(false);
                                            }}
                                            className="w-4 h-4 text-primary-500"
                                        />
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: list.color || '#eab308' }}
                                        />
                                        <span className="font-medium">{list.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* Create New List Option */}
                        <div className={`p-3 rounded-lg transition-all ${createNewList
                            ? 'bg-primary-500/20 border border-primary-500'
                            : 'bg-dark-700/50 border border-transparent hover:bg-dark-700'
                            }`}>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    name="importList"
                                    checked={createNewList}
                                    onChange={() => setCreateNewList(true)}
                                    className="w-4 h-4 text-primary-500"
                                />
                                <Plus size={16} className="text-primary-400" />
                                <span className="font-medium">Create New List</span>
                            </label>

                            {createNewList && (
                                <div className="mt-3 ml-7 space-y-3">
                                    <input
                                        type="text"
                                        value={newListName}
                                        onChange={e => setNewListName(e.target.value)}
                                        placeholder="List name *"
                                        className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm focus:border-primary-500 focus:outline-none"
                                        autoFocus
                                    />
                                    <input
                                        type="text"
                                        value={newListDescription}
                                        onChange={e => setNewListDescription(e.target.value)}
                                        placeholder="Description (optional)"
                                        className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm focus:border-primary-500 focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setPendingWords([]);
                                }}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportToList}
                                disabled={!selectedListId && !(createNewList && newListName.trim())}
                                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Import Words
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StatsPage;
