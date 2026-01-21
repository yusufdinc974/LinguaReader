import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, List, Brain, BarChart3, TrendingUp, Target, FileText, Clock } from 'lucide-react';
import type { Stats } from '../types';

interface RecentPdf {
    id: number;
    name: string;
    path: string;
    last_opened: string;
}

interface WordFamiliarity {
    id: number;
    word_lower: string;
    familiarity_level: number;
}

function HomePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentPdfs, setRecentPdfs] = useState<RecentPdf[]>([]);
    const [dueWords, setDueWords] = useState<WordFamiliarity[]>([]);
    const [loading, setLoading] = useState(true);

    // Reload data every time the component mounts or location changes
    useEffect(() => {
        loadData();
    }, [location.key]);

    const loadData = async () => {
        try {
            const [statsData, pdfsData, dueWordsData] = await Promise.all([
                window.electronAPI.getStats(),
                window.electronAPI.getRecentPdfs(),
                window.electronAPI.getWordsDueForReview()
            ]);
            setStats(statsData);
            setRecentPdfs(pdfsData);
            setDueWords(dueWordsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPdf = async (path: string) => {
        const pdf = recentPdfs.find(p => p.path === path);
        if (pdf) {
            try {
                await window.electronAPI.addRecentPdf(pdf.name, pdf.path);
            } catch (error) {
                console.error('Failed to update recent PDF:', error);
            }
        }
        navigate('/reader');
    };

    const quickActions = [
        { icon: BookOpen, label: 'Read PDF', description: 'Open a PDF and start learning', path: '/reader', color: '#3b82f6' },
        { icon: List, label: 'Word Lists', description: 'Manage your vocabulary', path: '/wordlists', color: '#8b5cf6' },
        { icon: Brain, label: 'Take Quiz', description: 'Test your knowledge', path: '/quiz', color: '#f59e0b' },
        { icon: BarChart3, label: 'View Stats', description: 'Track your progress', path: '/stats', color: '#10b981' },
    ];

    return (
        <div className="h-full p-4 sm:p-6 lg:p-8 overflow-auto" style={{ background: 'var(--bg-primary)' }}>
            <div className="max-w-6xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-8 sm:mb-12">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Learn Languages While{' '}
                        <span style={{ color: 'var(--accent)' }}>Reading</span>
                    </h1>
                    <p className="text-base sm:text-lg lg:text-xl max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        Upload any PDF, click on words to translate them, build vocabulary lists,
                        and test yourself with interactive quizzes.
                    </p>
                </div>

                {/* Stats Overview */}
                {!loading && stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
                        <div className="card">
                            <div className="flex items-center gap-3">
                                <div className="p-2 sm:p-3 rounded-lg" style={{ background: '#3b82f620' }}>
                                    <Target size={20} style={{ color: '#3b82f6' }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalWords}</p>
                                    <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-muted)' }}>Words Learned</p>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-3">
                                <div className="p-2 sm:p-3 rounded-lg" style={{ background: '#8b5cf620' }}>
                                    <List size={20} style={{ color: '#8b5cf6' }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalLists}</p>
                                    <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-muted)' }}>Word Lists</p>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-3">
                                <div className="p-2 sm:p-3 rounded-lg" style={{ background: '#f59e0b20' }}>
                                    <Brain size={20} style={{ color: '#f59e0b' }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalQuizzes}</p>
                                    <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-muted)' }}>Quizzes Taken</p>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-3">
                                <div className="p-2 sm:p-3 rounded-lg" style={{ background: '#10b98120' }}>
                                    <TrendingUp size={20} style={{ color: '#10b981' }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {stats.averageScore ? `${Math.round(stats.averageScore)}%` : '—'}
                                    </p>
                                    <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-muted)' }}>Avg. Score</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Due for Review */}
                {!loading && dueWords.length > 0 && (
                    <div className="mb-8 sm:mb-12">
                        <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: '1px' }}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
                                        <Clock size={24} style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {dueWords.length} Words Due for Review
                                        </h2>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                            Based on spaced repetition (SRS)
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/quiz')} className="btn-primary whitespace-nowrap">
                                    Start Review
                                </button>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {dueWords.slice(0, 10).map((w) => (
                                    <span
                                        key={w.id}
                                        className="px-2 py-1 rounded text-sm"
                                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                    >
                                        {w.word_lower}
                                    </span>
                                ))}
                                {dueWords.length > 10 && (
                                    <span className="px-2 py-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                                        +{dueWords.length - 10} more
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    {quickActions.map(({ icon: Icon, label, description, path, color }) => (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className="card card-hover text-left group"
                        >
                            <div
                                className="inline-flex p-3 sm:p-4 rounded-xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300"
                                style={{ background: `${color}20` }}
                            >
                                <Icon size={24} style={{ color: color }} />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2" style={{ color: 'var(--text-primary)' }}>
                                {label}
                            </h3>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                                {description}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Recent PDFs */}
                {!loading && recentPdfs.length > 0 && (
                    <div className="mt-8 sm:mt-12">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Clock size={24} style={{ color: 'var(--text-muted)' }} />
                            Recent PDFs
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {recentPdfs.slice(0, 6).map((pdf) => (
                                <button
                                    key={pdf.id}
                                    onClick={() => handleOpenPdf(pdf.path)}
                                    className="card card-hover text-left flex items-center gap-4"
                                >
                                    <div className="p-3 rounded-lg shrink-0" style={{ background: 'var(--accent-muted)' }}>
                                        <FileText size={24} style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{pdf.name}</p>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(pdf.last_opened).toLocaleDateString()}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                {!loading && stats && stats.recentQuizzes.length > 0 && (
                    <div className="mt-8 sm:mt-12">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--text-primary)' }}>
                            Recent Activity
                        </h2>
                        <div className="card">
                            <div className="space-y-4">
                                {stats.recentQuizzes.slice(0, 5).map((quiz) => (
                                    <div
                                        key={quiz.id}
                                        className="flex items-center justify-between py-3"
                                        style={{ borderBottom: '1px solid var(--border-color)' }}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="p-2 rounded-lg shrink-0" style={{ background: 'var(--accent-muted)' }}>
                                                <Brain size={20} style={{ color: 'var(--accent)' }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{quiz.list_name}</p>
                                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                                    {quiz.quiz_type} • {new Date(quiz.completed_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-4">
                                            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                                {Math.round((quiz.score / quiz.total_questions) * 100)}%
                                            </p>
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                                {quiz.score}/{quiz.total_questions}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HomePage;
