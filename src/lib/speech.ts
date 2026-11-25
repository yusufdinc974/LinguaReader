// Pronunciation: reads a word or sentence aloud with the computer's own
// voices (Web Speech API), or with a downloaded natural Piper voice when the
// user installed one for that language (see electron/tts.ts).

const NO_LANG = new Set(['', 'auto', 'und', 'null', 'undefined']);

/** "fr-FR", "FR", "fr_FR" → "fr"; "auto" and the like → null. */
export function langFamily(code: string | null | undefined): string | null {
    const c = (code ?? '').trim().toLowerCase();
    if (NO_LANG.has(c)) return null;
    const m = /^([a-z]{2,3})(?:[-_].*)?$/.exec(c);
    return m ? m[1] : null;
}

/** A best guess from the alphabet alone, for scripts used by one main language. */
export function guessFromScript(text: string): string | null {
    if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return 'ja';
    if (/\p{Script=Hangul}/u.test(text)) return 'ko';
    if (/\p{Script=Han}/u.test(text)) return 'zh';
    if (/\p{Script=Greek}/u.test(text)) return 'el';
    if (/\p{Script=Hebrew}/u.test(text)) return 'he';
    if (/\p{Script=Thai}/u.test(text)) return 'th';
    if (/\p{Script=Arabic}/u.test(text)) return 'ar';
    if (/\p{Script=Devanagari}/u.test(text)) return 'hi';
    if (/\p{Script=Georgian}/u.test(text)) return 'ka';
    if (/\p{Script=Armenian}/u.test(text)) return 'hy';
    return null;
}

const LEARN_KEY = 'learnLang';
/** The language the user is learning (Settings), used when nothing else says. */
export const getLearnLang = () => localStorage.getItem(LEARN_KEY) || '';
export const setLearnLang = (l: string) => (l ? localStorage.setItem(LEARN_KEY, l) : localStorage.removeItem(LEARN_KEY));

/**
 * The language to speak `text` in: what the translation service or the book
 * says, then the alphabet, then the language the user is learning.
 */
export function speechLang(text: string, ...hints: (string | null | undefined)[]): string | null {
    const script = guessFromScript(text);
    for (const h of hints) {
        const f = langFamily(h);
        // A Latin-script hint can't be right for Japanese text, and so on
        if (f && (!script || f === script || (script === 'zh' && f === 'ja'))) return f;
    }
    return script ?? langFamily(getLearnLang());
}

// ---------------------------------------------------------------- voices

/** Saved choice per language: "system:<voiceURI>" or "piper:<key>". */
const prefKey = (lang: string) => `voice:${lang}`;
export const getVoicePref = (lang: string) => localStorage.getItem(prefKey(lang)) || '';
export const setVoicePref = (lang: string, v: string) => (v ? localStorage.setItem(prefKey(lang), v) : localStorage.removeItem(prefKey(lang)));

export function systemVoices(lang?: string): SpeechSynthesisVoice[] {
    if (typeof speechSynthesis === 'undefined') return [];
    const all = speechSynthesis.getVoices();
    return lang ? all.filter(v => langFamily(v.lang) === lang) : all;
}

/** Voices load asynchronously in Chromium; resolves once they're known. */
export function voicesReady(): Promise<void> {
    if (typeof speechSynthesis === 'undefined' || speechSynthesis.getVoices().length > 0) return Promise.resolve();
    return new Promise(resolve => {
        const done = () => {
            speechSynthesis.removeEventListener('voiceschanged', done);
            resolve();
        };
        speechSynthesis.addEventListener('voiceschanged', done);
        setTimeout(done, 1500);
    });
}

let piperVoices: string[] | null = null;
/** Installed Piper voice keys (cached; call refreshPiperVoices after changes). */
export async function installedPiperVoices(): Promise<string[]> {
    if (piperVoices) return piperVoices;
    let keys: string[] = [];
    try {
        keys = (await window.electronAPI.ttsStatus()).voices;
    } catch { /* none */ }
    piperVoices = keys;
    return keys;
}
export function setPiperVoices(keys: string[]) {
    piperVoices = keys;
}

/** Piper voice key → language family ("fr_FR-siwis-medium" → "fr"). */
export const piperFamily = (key: string) => key.split(/[_-]/)[0];

export type Voice = { kind: 'system'; voice: SpeechSynthesisVoice } | { kind: 'piper'; key: string };

/** The voice that will read `lang`: the user's choice, else a natural voice, else the best system one. */
export async function pickVoice(lang: string): Promise<Voice | null> {
    await voicesReady();
    const piper = (await installedPiperVoices()).filter(k => piperFamily(k) === lang);
    const system = systemVoices(lang);
    const pref = getVoicePref(lang);
    if (pref.startsWith('piper:') && piper.includes(pref.slice(6))) return { kind: 'piper', key: pref.slice(6) };
    if (pref.startsWith('system:')) {
        const v = system.find(s => s.voiceURI === pref.slice(7));
        if (v) return { kind: 'system', voice: v };
    }
    if (piper.length > 0) return { kind: 'piper', key: piper[0] };
    if (system.length === 0) return null;
    // Prefer the OS's newer neural/"natural" voices, then local ones
    const score = (v: SpeechSynthesisVoice) => (/natural|neural|premium|enhanced/i.test(v.name) ? 4 : 0) + (v.localService ? 2 : 0) + (v.default ? 1 : 0);
    return { kind: 'system', voice: [...system].sort((a, b) => score(b) - score(a))[0] };
}

// ---------------------------------------------------------------- speaking

let audioCtx: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;

export function stopSpeaking() {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    try {
        playing?.stop();
    } catch { /* already stopped */ }
    playing = null;
}

export type SpeakResult = { ok: true } | { ok: false; reason: 'no-lang' | 'no-voice' | 'failed'; lang?: string; message?: string };

/** Reads `text` aloud in `lang` (a family code like "fr"). */
export async function speak(text: string, lang: string | null, rate = 0.9): Promise<SpeakResult> {
    const t = text.trim();
    if (!t) return { ok: false, reason: 'failed' };
    if (!lang) return { ok: false, reason: 'no-lang' };
    const voice = await pickVoice(lang);
    if (!voice) return { ok: false, reason: 'no-voice', lang };
    stopSpeaking();
    try {
        if (voice.kind === 'piper') {
            const bytes = await window.electronAPI.ttsSpeak(voice.key, t);
            audioCtx ??= new AudioContext();
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            // decodeAudioData needs its own copy of the bytes
            const buf = await audioCtx.decodeAudioData(bytes.slice().buffer);
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            src.playbackRate.value = Math.max(0.7, Math.min(1.2, rate + 0.1));
            src.connect(audioCtx.destination);
            src.start();
            playing = src;
            return { ok: true };
        }
        const u = new SpeechSynthesisUtterance(t);
        u.voice = voice.voice;
        u.lang = voice.voice.lang;
        u.rate = rate;
        speechSynthesis.speak(u);
        return { ok: true };
    } catch (err) {
        console.error('Speaking failed:', err);
        return { ok: false, reason: 'failed', lang, message: String((err as Error)?.message ?? err) };
    }
}

/** Language names for the UI, in English ("fr" → "French"). */
export function languageName(code: string) {
    try {
        return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
    } catch {
        return code;
    }
}

/** Languages offered for "the language you're learning". */
export const LEARN_LANGUAGES = [
    'ar', 'bg', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'fa', 'fi', 'fr', 'he', 'hi', 'hu', 'id', 'is', 'it', 'ja', 'ka', 'kk', 'ko',
    'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk', 'sr', 'sv', 'sw', 'th', 'tr', 'uk', 'vi', 'zh',
];
