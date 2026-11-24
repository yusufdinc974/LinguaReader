import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'theme';

export function getInitialTheme(): Theme {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    return { theme, setTheme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) };
}
