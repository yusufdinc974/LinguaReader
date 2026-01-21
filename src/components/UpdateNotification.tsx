import { useState, useEffect } from 'react';
import { Download, RefreshCw, ExternalLink, X, CheckCircle } from 'lucide-react';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

interface UpdateInfo {
    status: UpdateStatus;
    version?: string;
    percent?: number;
    message?: string;
}

function UpdateNotification() {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ status: 'idle' });
    const [dismissed, setDismissed] = useState(false);
    const [currentVersion, setCurrentVersion] = useState('');
    const isMac = navigator.userAgent.toLowerCase().includes('mac');

    useEffect(() => {
        // Get current version
        window.electronAPI.getAppVersion().then(setCurrentVersion);

        // Listen for update status from main process
        const unsubscribe = window.electronAPI.onUpdateStatus((status) => {
            setUpdateInfo(status as UpdateInfo);
            if (status.status === 'available') {
                setDismissed(false); // Show notification when update is available
            }
        });

        return () => unsubscribe();
    }, []);

    const handleDownload = async () => {
        if (isMac) {
            await window.electronAPI.openReleasePage();
        } else {
            await window.electronAPI.downloadUpdate();
        }
    };

    const handleInstall = async () => {
        await window.electronAPI.installUpdate();
    };

    const handleCheckForUpdates = async () => {
        setUpdateInfo({ status: 'checking' });
        const result = await window.electronAPI.checkForUpdates();
        if (result.hasUpdate) {
            setUpdateInfo({ status: 'available', version: result.version });
            setDismissed(false);
        } else {
            setUpdateInfo({ status: 'not-available' });
        }
    };

    // Don't show if dismissed or no update
    if (dismissed || updateInfo.status === 'idle' || updateInfo.status === 'not-available') {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
            <div
                className="rounded-xl shadow-2xl border border-white/10 p-4"
                style={{ background: 'var(--bg-secondary)' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        {updateInfo.status === 'downloaded' ? (
                            <CheckCircle size={20} className="text-green-400" />
                        ) : updateInfo.status === 'downloading' ? (
                            <RefreshCw size={20} className="text-blue-400 animate-spin" />
                        ) : (
                            <Download size={20} className="text-primary-400" />
                        )}
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {updateInfo.status === 'checking' && 'Checking for updates...'}
                            {updateInfo.status === 'available' && 'Update Available'}
                            {updateInfo.status === 'downloading' && 'Downloading Update...'}
                            {updateInfo.status === 'downloaded' && 'Update Ready'}
                            {updateInfo.status === 'error' && 'Update Error'}
                        </span>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <X size={16} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                </div>

                {/* Content */}
                {updateInfo.status === 'available' && (
                    <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Version {updateInfo.version} is available. You are on v{currentVersion}.
                    </p>
                )}

                {updateInfo.status === 'downloading' && updateInfo.percent !== undefined && (
                    <div className="mb-3">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-500 transition-all duration-300"
                                style={{ width: `${updateInfo.percent}%` }}
                            />
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {Math.round(updateInfo.percent)}% complete
                        </p>
                    </div>
                )}

                {updateInfo.status === 'downloaded' && (
                    <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        The update has been downloaded. Restart to apply.
                    </p>
                )}

                {updateInfo.status === 'error' && (
                    <p className="text-sm mb-3 text-red-400">
                        {updateInfo.message || 'Failed to check for updates'}
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    {updateInfo.status === 'available' && (
                        <button
                            onClick={handleDownload}
                            className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5"
                        >
                            {isMac ? (
                                <>
                                    <ExternalLink size={14} />
                                    Open Downloads
                                </>
                            ) : (
                                <>
                                    <Download size={14} />
                                    Download
                                </>
                            )}
                        </button>
                    )}

                    {updateInfo.status === 'downloaded' && (
                        <button
                            onClick={handleInstall}
                            className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5"
                        >
                            <RefreshCw size={14} />
                            Restart Now
                        </button>
                    )}

                    {updateInfo.status === 'error' && (
                        <button
                            onClick={handleCheckForUpdates}
                            className="btn-secondary flex items-center gap-2 text-sm px-3 py-1.5"
                        >
                            <RefreshCw size={14} />
                            Retry
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UpdateNotification;
