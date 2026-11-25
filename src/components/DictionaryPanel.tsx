import { useEffect, useState } from 'react';
import { BookText, ChevronDown } from 'lucide-react';
import type { DictEntry } from '../types';
import { languageName } from '../lib/speech';
import { openPronunciationSettings } from './SpeakButton';

let installedCache: Promise<string[]> | null = null;
/** Installed dictionary languages (refreshed when Settings changes them). */
export function installedDictionaries() {
    installedCache ??= window.electronAPI.dictStatus().catch(() => []);
    return installedCache;
}
export function forgetInstalledDictionaries() {
    installedCache = null;
}

const POS: Record<string, string> = { adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', det: 'determiner', num: 'numeral', intj: 'interjection', name: 'proper noun', phrase: 'phrase', particle: 'particle', suffix: 'suffix', prefix: 'prefix' };

/** Definitions, examples and synonyms for `text`, from the offline dictionary of `lang`. */
export default function DictionaryPanel({ text, lang }: { text: string; lang: string | null }) {
    const [state, setState] = useState<{ status: 'loading' | 'missing' | 'none' | 'done'; entries: DictEntry[] }>({ status: 'loading', entries: [] });
    const [more, setMore] = useState(false);

    useEffect(() => {
        let alive = true;
        setMore(false);
        setState({ status: 'loading', entries: [] });
        (async () => {
            if (!lang || !(await installedDictionaries()).includes(lang)) {
                if (alive) setState({ status: 'missing', entries: [] });
                return;
            }
            const entries = (await window.electronAPI.dictLookup(lang, text).catch(() => null)) ?? [];
            if (alive) setState({ status: entries.length ? 'done' : 'none', entries });
        })();
        return () => {
            alive = false;
        };
    }, [text, lang]);

    if (state.status === 'loading') return null;
    if (state.status === 'missing') {
        if (!lang) return null;
        return (
            <button className="mt-2 flex items-center gap-1.5 text-[12px] faint hover:underline" onClick={openPronunciationSettings}>
                <BookText size={12} /> Get the {languageName(lang)} dictionary for definitions
            </button>
        );
    }
    if (state.status === 'none') return <p className="mt-2 text-[12px] faint">Not in the {languageName(lang ?? '')} dictionary.</p>;

    // Short view: first entry, first 3 senses
    const entries = more ? state.entries : state.entries.slice(0, 1);
    const hidden = state.entries.length - 1 + Math.max(0, state.entries[0].senses.length - 3);
    return (
        <div className="mt-2.5 pt-2.5 border-t max-h-64 overflow-auto text-[13px] leading-snug" style={{ borderColor: 'var(--border)' }} aria-label="Dictionary">
            {entries.map((e, i) => (
                <div key={i} className={i > 0 ? 'mt-3' : ''}>
                    <p className="text-[12px] faint">
                        {(i > 0 || e.word.toLowerCase() !== text.trim().toLowerCase()) && <span className="serif text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>{e.word} </span>}
                        <span className="italic">{POS[e.pos] ?? e.pos}</span>
                        {e.ipa && <span> · {e.ipa}</span>}
                        {e.viaForm && e.viaForm !== 'form' && <span> · {text.trim()} is the {e.viaForm} form</span>}
                    </p>
                    <ol className="mt-1 grid gap-1.5 list-decimal pl-5 marker:text-[11px] marker:text-[var(--text-3)]">
                        {(more ? e.senses : e.senses.slice(0, 3)).map((s, j) => (
                            <li key={j}>
                                {s.t && s.t.length > 0 && <span className="text-[11px] faint">({s.t.join(', ')}) </span>}
                                <span style={{ color: 'var(--text-2)' }}>{s.g}</span>
                                {more && s.e?.map((x, k) => (
                                    <span key={k} className="block mt-0.5 text-[12px]">
                                        <span className="serif italic">{x.x}</span>
                                        {x.tr && <span className="faint"> {x.tr}</span>}
                                    </span>
                                ))}
                                {s.y && s.y.length > 0 && <span className="block text-[11.5px] faint mt-0.5">≈ {s.y.join(', ')}</span>}
                            </li>
                        ))}
                    </ol>
                    {e.synonyms && e.synonyms.length > 0 && <p className="text-[11.5px] faint mt-1">Synonyms: {e.synonyms.join(', ')}</p>}
                    {e.antonyms && e.antonyms.length > 0 && <p className="text-[11.5px] faint mt-0.5">Opposite: {e.antonyms.join(', ')}</p>}
                </div>
            ))}
            {!more && (hidden > 0 || state.entries.some(e => e.senses.some(s => s.e?.length))) && (
                <button className="mt-1.5 text-[12px] flex items-center gap-0.5" style={{ color: 'var(--accent)' }} onClick={() => setMore(true)}>
                    More{hidden > 0 ? ` (${hidden})` : ''} and examples <ChevronDown size={12} />
                </button>
            )}
            {more && <p className="text-[10.5px] faint mt-2">From Wiktionary, CC BY-SA 4.0.</p>}
        </div>
    );
}
