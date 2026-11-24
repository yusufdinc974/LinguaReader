import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

interface UpdateInfo {
    status: UpdateStatus;
    version?: string;
    percent?: number;
    message?: string;
}

export default function UpdateNotification() {
    const [info, setInfo] = useState<UpdateInfo>({ status: 'idle' });
    const [dismissed, setDismissed] = useState(false);
    const [current, setCurrent] = useState('');
    const isMac = navigator.userAgent.toLowerCase().includes('mac');

    useEffect(() => {
        window.electronAPI.getAppVersion().then(setCurrent);
        const off = window.electronAPI.onUpdateStatus(status => {
            setInfo(status as UpdateInfo);
            if (status.status === 'available') setDismissed(false);
        });
        return () => off();
    }, []);

    const retry = async () => {
        setInfo({ status: 'checking' });
        const r = await window.electronAPI.checkForUpdates();
        setInfo(r.hasUpdate ? { status: 'available', version: r.version } : { status: 'not-available' });
    };

    if (dismissed || info.status === 'idle' || info.status === 'not-available' || info.status === 'checking') return null;

    return (
        <div className="fixed bottom-4 right-4 z-[150] w-[300px] popover p-4 anim-in" role="status">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold">
                        {info.status === 'available' && `Version ${info.version} is available`}
                        {info.status === 'downloading' && 'Downloading update'}
                        {info.status === 'downloaded' && 'Update ready'}
                        {info.status === 'error' && 'Update check failed'}
                    </p>
                    <p className="text-[12.5px] muted mt-0.5">
                        {info.status === 'available' && `You have v${current}.`}
                        {info.status === 'downloading' && `${Math.round(info.percent ?? 0)}%`}
                        {info.status === 'downloaded' && 'Restart LinguaReader to finish.'}
                        {info.status === 'error' && (info.message || 'Try again later.')}
                    </p>
                </div>
                <button className="icon-btn -mr-2 -mt-1.5 shrink-0" onClick={() => setDismissed(true)} aria-label="Dismiss">
                    <X size={15} />
                </button>
            </div>

            {info.status === 'downloading' && (
                <div className="h-1 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full transition-all" style={{ width: `${info.percent ?? 0}%`, background: 'var(--accent)' }} />
                </div>
            )}

            <div className="flex gap-2 mt-3 empty:hidden">
                {info.status === 'available' && (
                    <button
                        className="btn btn-primary"
                        onClick={() => (isMac ? window.electronAPI.openReleasePage() : window.electronAPI.downloadUpdate())}
                    >
                        {isMac ? 'Open download page' : 'Download'}
                    </button>
                )}
                {info.status === 'downloaded' && (
                    <button className="btn btn-primary" onClick={() => window.electronAPI.installUpdate()}>Restart now</button>
                )}
                {info.status === 'error' && (
                    <button className="btn btn-outline" onClick={retry}>Retry</button>
                )}
            </div>
        </div>
    );
}
