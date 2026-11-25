import { NavLink } from 'react-router-dom';
import { Library, BookOpen, Layers, Settings } from 'lucide-react';
import Logo from './Logo';

const items = [
    { to: '/', label: 'Library', icon: Library, end: true },
    { to: '/reader', label: 'Reader', icon: BookOpen, end: false },
    { to: '/words', label: 'Words', icon: Layers, end: false },
];

interface Props {
    onOpenSettings: () => void;
    dueCount: number;
}

export default function Sidebar({ onOpenSettings, dueCount }: Props) {
    return (
        <nav
            className="w-[60px] shrink-0 h-full flex flex-col items-center py-3 gap-1 border-r drag-region"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            aria-label="Main"
        >
            <div className="no-drag w-8 h-8 mb-3 flex items-center justify-center" title="LinguaReader">
                <Logo size={32} />
            </div>

            {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className="no-drag group relative" title={label}>
                    {({ isActive }) => (
                        <span
                            className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative"
                            style={{
                                background: isActive ? 'var(--surface-2)' : 'transparent',
                                color: isActive ? 'var(--text)' : 'var(--text-3)',
                            }}
                        >
                            <Icon size={19} strokeWidth={isActive ? 2 : 1.75} />
                            {to === '/words' && dueCount > 0 && (
                                <span
                                    className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full"
                                    style={{ background: 'var(--accent)', boxShadow: '0 0 0 2px var(--surface)' }}
                                />
                            )}
                            <span className="sr-only">{label}</span>
                        </span>
                    )}
                </NavLink>
            ))}

            <div className="flex-1" />

            <button
                onClick={onOpenSettings}
                className="no-drag w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--text-3)' }}
                title="Settings"
                aria-label="Settings"
            >
                <Settings size={19} strokeWidth={1.75} />
            </button>
        </nav>
    );
}
