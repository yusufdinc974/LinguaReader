import { useMemo, useState } from 'react';
import type { WordList } from '../types';
import type { AnkiOpenResult, FieldMap } from '../../electron/ankiTypes';
import Dialog from './Dialog';
import { LEARN_LANGUAGES, getLearnLang, guessFromScript, languageName } from '../lib/speech';

type Deck = NonNullable<AnkiOpenResult['decks']>[number];
type NoteType = NonNullable<AnkiOpenResult['noteTypes']>[number];

interface Props {
    deck: AnkiOpenResult;
    lists: WordList[];
    onClose: () => void;
    onDone: (listId: number, message: string) => void;
}

/** The last part of an Anki deck name ("Japanese::Core 2k" → "Core 2k"). */
const shortName = (name: string) => name.split('::').pop() || name;

export default function AnkiImportDialog({ deck, lists, onClose, onDone }: Props) {
    const decks = deck.decks ?? [];
    const types = deck.noteTypes ?? [];
    const [deckId, setDeckId] = useState<number | 'all'>(decks.length === 1 ? decks[0].id : 'all');
    const [maps, setMaps] = useState<Record<number, FieldMap>>(() => Object.fromEntries(types.map(t => [t.id, t.guess])));
    const [target, setTarget] = useState<number | 'new'>('new');
    const chosen: Deck | undefined = decks.find(d => d.id === deckId);
    const [listName, setListName] = useState(() => (decks.length === 1 ? shortName(decks[0].name) : deck.fileName || 'Anki'));
    const [lang, setLang] = useState(() => {
        const t = types[0];
        const sample = t?.samples[0]?.[t.guess.word] ?? '';
        const script = guessFromScript(sample);
        if (script && LEARN_LANGUAGES.includes(script)) return script;
        return getLearnLang();
    });
    const [keep, setKeep] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pickDeck = (v: string) => {
        const id = v === 'all' ? 'all' : Number(v);
        setDeckId(id);
        const d = decks.find(x => x.id === id);
        setListName(d ? shortName(d.name) : deck.fileName || 'Anki');
    };

    const total = chosen ? chosen.notes : types.reduce((n, t) => n + t.notes, 0);
    // Several note types: only show the ones with notes worth mapping
    const shown: NoteType[] = useMemo(() => types.filter(t => t.fields.length > 0), [types]);

    const setField = (id: number, key: keyof FieldMap, v: number) => setMaps(m => ({ ...m, [id]: { ...m[id], [key]: v } }));

    const run = async () => {
        setBusy(true);
        setError(null);
        const r = await window.electronAPI.ankiImport({
            decks: deckId === 'all' ? null : [deckId],
            maps,
            listId: target === 'new' ? null : target,
            listName: listName.trim() || 'Anki',
            lang: lang || 'auto',
            keepProgress: keep,
        });
        setBusy(false);
        if (!r.success || !r.listId) {
            setError(r.error || 'Could not import the deck.');
            return;
        }
        const parts = [`Imported ${r.added} new ${r.added === 1 ? 'word' : 'words'}`];
        if (r.existing) parts.push(`${r.existing} already saved`);
        onDone(r.listId, `${parts.join(', ')}.`);
    };

    const fieldSelect = (t: NoteType, key: keyof FieldMap, label: string, optional = false) => (
        <label className="block">
            <span className="text-[12px] muted block mb-1">{label}</span>
            <select className="field" value={maps[t.id]?.[key] ?? -1} onChange={e => setField(t.id, key, Number(e.target.value))}>
                {optional && <option value={-1}>None</option>}
                {t.fields.map((f, i) => <option key={i} value={i}>{f}</option>)}
            </select>
        </label>
    );

    return (
        <Dialog
            title="Import an Anki deck"
            width={520}
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" disabled={busy || (target === 'new' && !listName.trim())} onClick={run}>
                        {busy ? 'Importing…' : `Import ${total} ${total === 1 ? 'card' : 'cards'}`}
                    </button>
                </>
            }
        >
            <div className="grid gap-4 max-h-[62vh] overflow-auto -mx-1 px-1">
                {decks.length > 1 && (
                    <label className="block">
                        <span className="label block mb-1.5">Deck</span>
                        <select className="field" value={String(deckId)} onChange={e => pickDeck(e.target.value)}>
                            <option value="all">All decks ({types.reduce((n, t) => n + t.notes, 0)})</option>
                            {decks.map(d => <option key={d.id} value={d.id}>{d.name} ({d.notes})</option>)}
                        </select>
                    </label>
                )}

                {shown.map(t => {
                    const m = maps[t.id];
                    const sample = t.samples[0];
                    return (
                        <div key={t.id}>
                            <p className="label mb-1.5">{shown.length > 1 ? `Fields of “${t.name}” (${t.notes})` : 'Fields'}</p>
                            <div className="grid grid-cols-3 gap-2">
                                {fieldSelect(t, 'word', 'Word')}
                                {fieldSelect(t, 'translation', 'Translation')}
                                {fieldSelect(t, 'sentence', 'Example sentence', true)}
                            </div>
                            {sample && m && (
                                <div className="mt-2 rounded-md px-3 py-2 text-[13px]" style={{ background: 'var(--surface-2)' }}>
                                    <span className="serif text-[15px]">{sample[m.word] || <span className="faint">(empty)</span>}</span>
                                    <span className="muted"> — {sample[m.translation] || '(empty)'}</span>
                                    {m.sentence >= 0 && sample[m.sentence] && <p className="serif italic text-[12.5px] faint mt-0.5 line-clamp-2">{sample[m.sentence]}</p>}
                                </div>
                            )}
                        </div>
                    );
                })}

                <label className="block">
                    <span className="label block mb-1.5">Language of the words</span>
                    <select className="field" value={lang} onChange={e => setLang(e.target.value)}>
                        <option value="">Detect from the text</option>
                        {LEARN_LANGUAGES.map(l => <option key={l} value={l}>{languageName(l)}</option>)}
                    </select>
                </label>

                <div>
                    <span className="label block mb-1.5">Add to</span>
                    <select className="field" value={String(target)} onChange={e => setTarget(e.target.value === 'new' ? 'new' : Number(e.target.value))}>
                        <option value="new">A new list</option>
                        {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    {target === 'new' && (
                        <input className="field mt-2" value={listName} onChange={e => setListName(e.target.value)} placeholder="List name" aria-label="New list name" />
                    )}
                </div>

                {(deck.studied ?? 0) > 0 && (
                    <label className="flex items-start gap-2 text-[13px] cursor-pointer">
                        <input type="checkbox" className="mt-0.5" checked={keep} onChange={e => setKeep(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                        <span>
                            Keep my Anki progress
                            <span className="block text-[12px] faint mt-0.5">
                                {deck.studied} {deck.studied === 1 ? 'card was' : 'cards were'} studied in Anki. They keep their next review day here. Words you already saved keep their progress in LinguaReader.
                            </span>
                        </span>
                    </label>
                )}

                {error && <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>
        </Dialog>
    );
}
