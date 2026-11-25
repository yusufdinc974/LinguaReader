import { useEffect, useRef, useState } from 'react';
import { Loader2, Volume2 } from 'lucide-react';
import { languageName, speak, speechLang } from '../lib/speech';

interface Props {
    text: string;
    /** Language hints, best first: detected language, book language, saved word language. */
    langs?: (string | null | undefined)[];
    size?: number;
    className?: string;
    /** Read aloud when `text` changes (reviews). */
    auto?: boolean;
    /** Keyboard shortcut shown in the tooltip; the caller handles the key. */
    shortcut?: string;
}

/** Event a SpeakButton listens for, so a keyboard shortcut can press it. */
export const SPEAK_EVENT = 'linguareader:speak';

/** Opens Settings at the pronunciation section. */
export const openPronunciationSettings = () => window.dispatchEvent(new CustomEvent('linguareader:open-settings', { detail: 'pronunciation' }));

/** A speaker button that reads `text` aloud, with a hint when no voice is installed. */
export default function SpeakButton({ text, langs = [], size = 15, className = '', auto = false, shortcut }: Props) {
    const [busy, setBusy] = useState(false);
    const [hint, setHint] = useState<string | null>(null);
    const lang = speechLang(text, ...langs);
    const ref = useRef<() => void>(() => { });

    const play = async () => {
        setBusy(true);
        setHint(null);
        const r = await speak(text, lang);
        setBusy(false);
        if (r.ok) return;
        if (r.reason === 'no-lang') setHint('Which language is this? Choose the language you’re learning in Settings.');
        else if (r.reason === 'no-voice') setHint(`No ${languageName(r.lang ?? '')} voice yet.`);
        else setHint(r.message ? `Couldn't play it: ${r.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')}` : "Couldn't play it.");
    };
    ref.current = play;

    // Only the button that shows a shortcut answers it
    useEffect(() => {
        if (!shortcut) return;
        const onKey = () => ref.current();
        window.addEventListener(SPEAK_EVENT, onKey);
        return () => window.removeEventListener(SPEAK_EVENT, onKey);
    }, [shortcut]);

    useEffect(() => {
        if (auto && text) ref.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auto, text]);

    useEffect(() => {
        if (!hint) return;
        const t = setTimeout(() => setHint(null), 6000);
        return () => clearTimeout(t);
    }, [hint]);

    return (
        <span className="relative inline-flex">
            <button
                type="button"
                className={`icon-btn ${className}`}
                onClick={e => { e.stopPropagation(); play(); }}
                onMouseUp={e => e.stopPropagation()}
                title={`Listen${shortcut ? ` (${shortcut})` : ''}`}
                aria-label="Listen"
            >
                {busy ? <Loader2 size={size} className="animate-spin" /> : <Volume2 size={size} />}
            </button>
            {hint && (
                <span className="popover absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-60 p-2.5 z-[130] text-[12.5px] leading-snug anim-in text-left" role="status">
                    {hint}{' '}
                    <button className="underline" style={{ color: 'var(--accent)' }} onClick={e => { e.stopPropagation(); openPronunciationSettings(); setHint(null); }}>
                        Voice settings
                    </button>
                </span>
            )}
        </span>
    );
}
