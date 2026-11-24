import { useEffect, type ReactNode } from 'react';

interface Props {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    width?: number;
}

export default function Dialog({ title, onClose, children, footer, width = 400 }: Props) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.32)' }} onClick={onClose} />
            <div className="popover relative w-full anim-in" style={{ maxWidth: width }}>
                <div className="px-5 pt-5 pb-4">
                    <h2 className="text-[15px] font-semibold mb-3">{title}</h2>
                    {children}
                </div>
                {footer && (
                    <div className="px-5 py-3 flex justify-end gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <Dialog
            title={title}
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn"
                        style={{ background: 'var(--danger)', color: '#fff' }}
                        onClick={() => { onConfirm(); onClose(); }}
                        autoFocus
                    >
                        {confirmLabel}
                    </button>
                </>
            }
        >
            <p className="text-[13.5px] muted">{message}</p>
        </Dialog>
    );
}
