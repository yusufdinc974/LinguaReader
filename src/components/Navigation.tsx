import { NavLink } from 'react-router-dom';
import { Home, BookOpen, List, Brain, BarChart3, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/reader', label: 'PDF Reader', icon: BookOpen },
    { path: '/wordlists', label: 'Word Lists', icon: List },
    { path: '/quiz', label: 'Quiz', icon: Brain },
    { path: '/stats', label: 'Stats', icon: BarChart3 },
];

function Navigation() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        // Load saved theme or default to dark
        const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const initial = saved || 'dark';
        setTheme(initial);
        document.documentElement.setAttribute('data-theme', initial);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <nav className="w-64 shrink-0 h-full flex flex-col" style={{
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)'
        }}>
            {/* App Title - Drag Region */}
            <div className="drag-region p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <h1 className="text-2xl font-bold no-drag" style={{ color: 'var(--accent)' }}>
                    LinguaReader
                </h1>
                <p className="text-sm mt-1 no-drag" style={{ color: 'var(--text-muted)' }}>
                    Learn while you read
                </p>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 py-4 px-3 space-y-1 overflow-auto">
                {navItems.map(({ path, label, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group`
                        }
                        style={({ isActive }) => ({
                            background: isActive ? 'var(--accent-muted)' : 'transparent',
                            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: isActive ? 600 : 500,
                        })}
                    >
                        <Icon
                            size={20}
                            className="group-hover:scale-110 transition-transform duration-200"
                        />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </div>

            {/* Theme Toggle & Footer */}
            <div className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all"
                    style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    <span className="text-sm font-medium">
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                </button>
                <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                    Version 1.0.0
                </p>
            </div>
        </nav>
    );
}

export default Navigation;
