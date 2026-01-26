import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock, CheckCircle, Star, Brain, ChevronRight, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';


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
                                    {upcomingData.map((_, index) => {
                                        // Color based on urgency: today = orange, tomorrow = yellow, 2-3 days = yellow, 4-7 = green, 7+ = blue
                                        let color = '#0ea5e9'; // default blue for 8+ days
                                        if (index === 0) color = '#f97316'; // Today - orange
                                        else if (index === 1) color = '#eab308'; // Tomorrow - yellow
                                        else if (index <= 3) color = '#eab308'; // 2-3 days - yellow
                                        else if (index <= 7) color = '#22c55e'; // 4-7 days - green
                                        return (
                                            <Cell key={index} fill={color} />
                                        );
                                    })}
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

                {/* Learning Summary */}
                <div className="card">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Brain size={20} className="text-accent-400" />
                        Learning Summary
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                            <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{schedule.totalWords}</p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Words</p>
                        </div>
                        <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                            <p className="text-3xl font-bold text-green-400">{schedule.mastered + schedule.good}</p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Well Learned</p>
                        </div>
                        <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                            <p className="text-3xl font-bold text-yellow-400">{schedule.dueSoon}</p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>In Progress</p>
                        </div>
                        <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                            <p className="text-3xl font-bold text-orange-400">{schedule.overdue + schedule.dueToday}</p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Need Review</p>
                        </div>
                    </div>

                    {/* Chart Color Legend */}
                    <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Chart Legend:</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: '#f97316' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>Today (Review Now)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: '#eab308' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>1-3 Days</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>4-7 Days</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: '#0ea5e9' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>8+ Days</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StatsPage;
