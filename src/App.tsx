import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import UpdateNotification from './components/UpdateNotification';
import Library from './pages/Library';
import Reader from './pages/Reader';
import Words from './pages/Words';
import Review from './pages/Review';
import { useTheme } from './lib/theme';
import { useStore } from './store/useStore';

export default function App() {
    const { theme, setTheme } = useTheme();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [dueCount, setDueCount] = useState(0);
    const focus = useStore(s => s.focus);
    const dataVersion = useStore(s => s.dataVersion);
    const bumpData = useStore(s => s.bumpData);
    const location = useLocation();

    useEffect(() => {
        window.electronAPI.getWordsDueForReview().then(w => setDueCount(w.length)).catch(() => { });
    }, [dataVersion, location.pathname]);

    useEffect(() => {
        const off = window.electronAPI.onDataUpdated(() => bumpData());
        return () => {
            if (typeof off === 'function') off();
        };
    }, [bumpData]);

    const closeSettings = useCallback(() => setSettingsOpen(false), []);
    const inReview = location.pathname.startsWith('/review');

    return (
        <div className="h-full flex overflow-hidden">
            {!focus && !inReview && <Sidebar onOpenSettings={() => setSettingsOpen(true)} dueCount={dueCount} />}
            <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
                <Routes>
                    <Route path="/" element={<Library dueCount={dueCount} />} />
                    <Route path="/reader" element={<Reader />} />
                    <Route path="/words" element={<Words />} />
                    <Route path="/review" element={<Review />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            <SettingsPanel open={settingsOpen} onClose={closeSettings} theme={theme} onThemeChange={setTheme} />
            <UpdateNotification />
        </div>
    );
}
