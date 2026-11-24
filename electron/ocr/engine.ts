// PaddleOCR pipeline (PP-OCRv6 / PP-OCRv5 ONNX models) in plain TypeScript:
//   1. detect: a probability map of "text here", split into regions, each
//      fitted with its tightest rotated rectangle;
//   2. recognise: every region is cropped upright (vertical CJK columns are
//      turned on their side, as the models were trained), read with CTC, and
//      each character's position along the line is kept for the text layer.
// Runs anywhere onnxruntime does (the app's worker, Node for tests).

import { hull, minAreaRect, regions, sampleCrop, type Pt, type RotRect } from './geometry.ts';
import { arrangeLines } from './layout.ts';
import type { OcrLine, OcrPage, RgbaImage, ScriptId } from './types.ts';

/** The parts of onnxruntime used here (onnxruntime-web and -node both fit). */
export interface Ort {
    InferenceSession: { create(model: Uint8Array, options?: object): Promise<Session> };
    Tensor: new (type: 'float32', data: Float32Array, dims: number[]) => unknown;
}
interface Session {
    inputNames: readonly string[];
    outputNames: readonly string[];
    run(feeds: Record<string, unknown>): Promise<Record<string, { data: unknown; dims: readonly number[] }>>;
}

export type LoadAsset = (name: string) => Promise<Uint8Array>;

const DET_MAX_SIDE = 1536;
const DET_THRESH = 0.2;
const BOX_THRESH = 0.45;
const UNCLIP = 1.4;
const REC_H = 48;
const REC_BATCH = 8;
const MIN_CONF = 0.5;

const SCRIPT_ORDER: ScriptId[] = ['v6', 'cyrillic', 'korean', 'arabic', 'greek', 'thai', 'devanagari', 'tamil', 'telugu'];
const NATIVE: Record<ScriptId, RegExp> = {
    v6: /[\p{Script=Latin}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
    cyrillic: /\p{Script=Cyrillic}/u,
    korean: /[\p{Script=Hangul}\p{Script=Han}]/u,
    arabic: /\p{Script=Arabic}/u,
    greek: /\p{Script=Greek}/u,
    thai: /\p{Script=Thai}/u,
    devanagari: /\p{Script=Devanagari}/u,
    tamil: /\p{Script=Tamil}/u,
    telugu: /\p{Script=Telugu}/u,
};
// Letters that belong to one script (not ー, 々 and other shared marks)
const LETTER = /^(?![\p{Script=Common}\p{Script=Inherited}])\p{L}$/u;

/** Share of letters in `script`'s own alphabet, counting letters in mixed-script words as foreign. */
export function plausibility(text: string, script: ScriptId): number {
    let letters = 0;
    let native = 0;
    for (const word of text.split(/\s+/)) {
        const ls = Array.from(word).filter(ch => LETTER.test(ch));
        if (ls.length === 0) continue;
        const n = ls.filter(ch => NATIVE[script].test(ch)).length;
        letters += ls.length;
        // "Bсе" (Latin B + Cyrillic) is a misread, not a word
        if (n === ls.length) native += n;
    }
    return letters === 0 ? 0 : native / letters;
}

interface Recogniser {
    session: Session;
    chars: string[]; // index 0 = CTC blank
    reverse: boolean;
}

interface Box {
    rect: RotRect;
    vertical: boolean;
    origin: Pt;
    dirU: Pt; // reading direction, length = len
    dirV: Pt; // across, length = thick
    len: number;
    thick: number;
}

interface Read {
    text: string;
    conf: number;
    cuts: number[];
}

export class OcrEngine {
    private det: Promise<Session> | null = null;
    private recs = new Map<ScriptId, Promise<Recogniser>>();

    private ort: Ort;
    private loadAsset: LoadAsset;
    private sessionOptions: object;

    constructor(ort: Ort, loadAsset: LoadAsset, sessionOptions: object = {}) {
        this.ort = ort;
        this.loadAsset = loadAsset;
        this.sessionOptions = sessionOptions;
    }

    /**
     * Reads all text in `img`. With script 'auto' the best model is chosen from a
     * sample of lines, trying `hint` (the script of the book so far) first.
     */
    async recognize(img: RgbaImage, script: ScriptId | 'auto' = 'v6', hint: ScriptId = 'v6'): Promise<OcrPage> {
        const boxes = await this.detect(img);
        let chosen: ScriptId = script === 'auto' ? hint : script;
        if (script === 'auto' && boxes.length > 0) chosen = await this.pickScript(img, boxes, hint);
        const reads = await this.read(img, boxes, chosen);
        const lines: OcrLine[] = [];
        boxes.forEach((b, i) => {
            const r = reads[i];
            if (!r.text.trim() || r.conf < MIN_CONF) return;
            lines.push({
                text: r.text, conf: round(r.conf, 3), vertical: b.vertical,
                cx: round(b.rect.cx, 1), cy: round(b.rect.cy, 1), len: round(b.len, 1), thick: round(b.thick, 1),
                angle: round(Math.atan2(b.dirU.y, b.dirU.x) - (b.vertical ? Math.PI / 2 : 0), 4),
                cuts: r.cuts.map(c => round(c, 4)), block: 0,
                ...(chosen === 'arabic' ? { rtl: true } : {}),
            });
        });
        return { width: img.width, height: img.height, script: chosen, lines: arrangeLines(lines) };
    }

    /**
     * Which model reads this page best. Confidence alone can't tell: every model
     * is confident about something. A model counts only as far as what it read
     * is written in its own script, without words that mix scripts.
     */
    private async pickScript(img: RgbaImage, boxes: Box[], first: ScriptId): Promise<ScriptId> {
        const sample = [...boxes].sort((a, b) => b.len * b.thick - a.len * a.thick).slice(0, 12);
        const score = async (s: ScriptId) => {
            const reads = (await this.read(img, sample, s)).filter(r => r.text.trim());
            const chars = reads.reduce((a, r) => a + r.text.length, 0);
            if (chars === 0) return 0;
            const conf = reads.reduce((a, r) => a + r.conf * r.text.length, 0) / chars;
            const v = conf * plausibility(reads.map(r => r.text).join(' '), s);
            if ((globalThis as { OCR_DEBUG?: boolean }).OCR_DEBUG) console.log('script', s, conf.toFixed(3), v.toFixed(3), reads.map(r => r.text).join(' | ').slice(0, 80));
            return v;
        };
        const base = await score(first);
        if (base >= 0.95) return first;
        let best: ScriptId = first;
        let bestScore = base;
        for (const s of SCRIPT_ORDER.filter(x => x !== first)) {
            const v = await score(s);
            if (v > bestScore + 0.02) {
                best = s;
                bestScore = v;
            }
        }
        return best;
    }

    // ------------------------------------------------------------ detection
    private detSession() {
        this.det ??= this.loadAsset('det.onnx').then(m => this.ort.InferenceSession.create(m, this.sessionOptions));
        return this.det;
    }

    async detect(img: RgbaImage): Promise<Box[]> {
        // Tall pages (webtoon strips) are detected in overlapping tiles.
        const tileH = Math.round(img.width * 1.5);
        if (img.height <= tileH * 1.4) return (await this.detectTile(img, 0, img.height)).map(r => toBox(r));
        const overlap = Math.round(img.width * 0.3);
        const out: Box[] = [];
        for (let y = 0; y < img.height; y += tileH - overlap) {
            const y1 = Math.min(img.height, y + tileH);
            const rects = await this.detectTile(img, y, y1);
            // Keep a box in the tile whose core contains its centre; the overlap belongs half to each.
            const lo = y === 0 ? -Infinity : y + overlap / 2;
            const hi = y1 >= img.height ? Infinity : y1 - overlap / 2;
            for (const r of rects) if (r.cy >= lo && r.cy < hi) out.push(toBox(r));
            if (y1 >= img.height) break;
        }
        return out;
    }

    private async detectTile(img: RgbaImage, top: number, bottom: number): Promise<RotRect[]> {
        const session = await this.detSession();
        const srcH = bottom - top;
        const k = Math.min(1, DET_MAX_SIDE / Math.max(img.width, srcH));
        const w = Math.max(32, Math.round((img.width * k) / 32) * 32);
        const h = Math.max(32, Math.round((srcH * k) / 32) * 32);
        const input = new Float32Array(3 * w * h);
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];
        const sx = img.width / w;
        const sy = srcH / h;
        const { data } = img;
        for (let y = 0; y < h; y++) {
            const fy = Math.min(srcH - 1, Math.max(0, (y + 0.5) * sy - 0.5));
            const y0 = Math.floor(fy), y1 = Math.min(y0 + 1, srcH - 1), ay = fy - y0;
            for (let x = 0; x < w; x++) {
                const fx = Math.min(img.width - 1, Math.max(0, (x + 0.5) * sx - 0.5));
                const x0 = Math.floor(fx), x1 = Math.min(x0 + 1, img.width - 1), ax = fx - x0;
                const i00 = ((top + y0) * img.width + x0) * 4, i10 = ((top + y0) * img.width + x1) * 4;
                const i01 = ((top + y1) * img.width + x0) * 4, i11 = ((top + y1) * img.width + x1) * 4;
                for (let c = 0; c < 3; c++) {
                    const s = 2 - c; // the models expect BGR
                    const v = (data[i00 + s] * (1 - ax) + data[i10 + s] * ax) * (1 - ay) + (data[i01 + s] * (1 - ax) + data[i11 + s] * ax) * ay;
                    input[c * w * h + y * w + x] = (v / 255 - mean[c]) / std[c];
                }
            }
        }
        const out = await session.run({ [session.inputNames[0]]: new this.ort.Tensor('float32', input, [1, 3, h, w]) });
        const res = out[session.outputNames[0]];
        const prob = res.data as Float32Array;
        const ph = res.dims[2], pw = res.dims[3];
        const mask = new Uint8Array(pw * ph);
        for (let i = 0; i < mask.length; i++) mask[i] = prob[i] > DET_THRESH ? 1 : 0;

        const rects: RotRect[] = [];
        const toX = img.width / pw, toY = srcH / ph;
        for (const reg of regions(mask, prob, pw, ph)) {
            if (reg.score < BOX_THRESH) continue;
            const r = minAreaRect(hull(reg.pixels, pw));
            if (Math.min(r.w, r.h) < 3) continue;
            // DB "unclip": the map marks a shrunk text kernel; grow it back.
            const d = (r.w * r.h * UNCLIP) / (2 * (r.w + r.h));
            const rw = r.w + 2 * d, rh = r.h + 2 * d;
            if (Math.min(rw, rh) < 5) continue;
            // Back to image pixels (axes may scale differently by a hair; use the rotated axes).
            const c = Math.cos(r.angle), s = Math.sin(r.angle);
            const wx = rw * c * toX, wy = rw * s * toY;
            const hx = -rh * s * toX, hy = rh * c * toY;
            rects.push({ cx: r.cx * toX, cy: r.cy * toY + top, w: Math.hypot(wx, wy), h: Math.hypot(hx, hy), angle: Math.atan2(wy, wx) });
        }
        return rects;
    }

    // ---------------------------------------------------------- recognition
    private recogniser(script: ScriptId): Promise<Recogniser> {
        let r = this.recs.get(script);
        if (!r) {
            r = (async () => {
                const [model, dict] = await Promise.all([this.loadAsset(`rec-${script}.onnx`), this.loadAsset(`rec-${script}.txt`)]);
                const session = await this.ort.InferenceSession.create(model, this.sessionOptions);
                // Dictionary file: a leading empty line (the CTC blank), one character per line,
                // and the class after the last character is a space.
                const lines = new TextDecoder().decode(dict).replace(/\r/g, '').split('\n');
                if (lines[lines.length - 1] === '') lines.pop();
                if (lines[0] !== '') lines.unshift('');
                const chars = [...lines, ' '];
                return { session, chars, reverse: script === 'arabic' };
            })();
            r.catch(() => this.recs.delete(script));
            this.recs.set(script, r);
        }
        return r;
    }

    private async read(img: RgbaImage, boxes: Box[], script: ScriptId): Promise<Read[]> {
        const rec = await this.recogniser(script);
        const order = boxes.map((b, i) => i).sort((a, b) => boxes[a].len / boxes[a].thick - boxes[b].len / boxes[b].thick);
        const out: Read[] = new Array(boxes.length);
        for (let s = 0; s < order.length; s += REC_BATCH) {
            const idx = order.slice(s, s + REC_BATCH);
            const ratios = idx.map(i => Math.max(0.5, boxes[i].len / Math.max(1, boxes[i].thick)));
            const maxRatio = Math.max(320 / REC_H, ...ratios);
            const W = Math.min(REC_H * 80, Math.ceil(REC_H * maxRatio / 8) * 8);
            const input = new Float32Array(idx.length * 3 * REC_H * W);
            const widths = idx.map((i, n) => {
                const b = boxes[i];
                const w = Math.max(8, Math.min(W, Math.ceil(REC_H * ratios[n])));
                sampleCrop(img, b.origin, b.dirU, b.dirV, w, REC_H, input, n * 3 * REC_H * W, W);
                return w;
            });
            const res = await rec.session.run({ [rec.session.inputNames[0]]: new this.ort.Tensor('float32', input, [idx.length, 3, REC_H, W]) });
            const o = res[rec.session.outputNames[0]];
            const [, T, C] = o.dims;
            const probs = o.data as Float32Array;
            if (C !== rec.chars.length) throw new Error(`rec-${script}: model has ${C} classes, dictionary ${rec.chars.length}`);
            idx.forEach((boxIndex, n) => {
                out[boxIndex] = decode(probs, n * T * C, T, C, rec.chars, widths[n] / W, rec.reverse);
            });
        }
        return out;
    }
}

/** Greedy CTC decode, with each character's position along the crop. */
function decode(p: Float32Array, off: number, T: number, C: number, chars: string[], used: number, reverse: boolean): Read {
    const picked: { ch: string; t: number; p: number }[] = [];
    let prev = 0;
    for (let t = 0; t < T; t++) {
        let best = 0;
        let bp = -1;
        const base = off + t * C;
        for (let c = 0; c < C; c++) {
            const v = p[base + c];
            if (v > bp) {
                bp = v;
                best = c;
            }
        }
        if (best !== 0 && best !== prev) picked.push({ ch: chars[best], t, p: bp });
        prev = best;
    }
    // Trim spaces at the ends
    while (picked.length && picked[0].ch === ' ') picked.shift();
    while (picked.length && picked[picked.length - 1].ch === ' ') picked.pop();
    if (picked.length === 0) return { text: '', conf: 0, cuts: [] };

    // Positions as fractions of the crop (the used part of the padded input)
    const centres = picked.map(q => Math.min(1, ((q.t + 0.5) / T) / used));
    const conf = picked.reduce((a, q) => a + q.p, 0) / picked.length;

    // A "character" may be several code points; spread each over its slot.
    const pieces: { cp: string; c: number }[] = [];
    picked.forEach((q, i) => {
        const cps = Array.from(q.ch);
        cps.forEach(cp => pieces.push({ cp, c: centres[i] }));
    });
    let seq = pieces;
    if (reverse) seq = reverseRtl(pieces);
    const cuts = cutsFrom(seq.map(s => s.c), reverse);
    return { text: seq.map(s => s.cp).join(''), conf, cuts };
}

/** Boundaries between characters, from their centre positions. */
function cutsFrom(centres: number[], rtl: boolean): number[] {
    const n = centres.length;
    const c = rtl ? centres.map(x => 1 - x) : centres;
    const gaps: number[] = [];
    for (let i = 1; i < n; i++) gaps.push(Math.abs(c[i] - c[i - 1]));
    const typical = gaps.length ? gaps.slice().sort((a, b) => a - b)[gaps.length >> 1] : 0.5;
    const cuts = [Math.max(0, c[0] - typical / 2)];
    for (let i = 1; i < n; i++) cuts.push((c[i - 1] + c[i]) / 2);
    cuts.push(Math.min(1, c[n - 1] + typical / 2));
    // Monotonic, in [0, 1]
    for (let i = 1; i < cuts.length; i++) cuts[i] = Math.max(cuts[i], cuts[i - 1]);
    return cuts;
}

/**
 * Arabic is read right to left but the model emits visual (left-to-right) order:
 * reverse it, keeping runs of digits and Latin in their own order (as PaddleOCR does).
 */
function reverseRtl<T extends { cp: string }>(seq: T[]): T[] {
    const keep = /[A-Za-z0-9:*./%+\-]/;
    const rev = [...seq].reverse();
    const out: T[] = [];
    let i = 0;
    while (i < rev.length) {
        if (!keep.test(rev[i].cp)) {
            out.push(rev[i++]);
            continue;
        }
        let j = i;
        while (j < rev.length && keep.test(rev[j].cp)) j++;
        out.push(...rev.slice(i, j).reverse());
        i = j;
    }
    return out;
}

function toBox(r: RotRect): Box {
    const c = Math.cos(r.angle), s = Math.sin(r.angle);
    const ax: Pt = { x: c, y: s }; // along w (closest to horizontal), left → right
    const ay: Pt = { x: -s, y: c }; // along h, top → bottom
    const vertical = r.h / Math.max(1, r.w) >= 1.5;
    const tl: Pt = { x: r.cx - (ax.x * r.w) / 2 - (ay.x * r.h) / 2, y: r.cy - (ax.y * r.w) / 2 - (ay.y * r.h) / 2 };
    if (!vertical) {
        return { rect: r, vertical, origin: tl, dirU: scale(ax, r.w), dirV: scale(ay, r.h), len: r.w, thick: r.h };
    }
    // A column: read top → bottom; the crop's rows run from the right edge leftwards
    // (the upright crop turned 90° counter-clockwise, as the models were trained).
    const tr: Pt = { x: tl.x + ax.x * r.w, y: tl.y + ax.y * r.w };
    return { rect: r, vertical, origin: tr, dirU: scale(ay, r.h), dirV: scale(ax, -r.w), len: r.h, thick: r.w };
}

const scale = (p: Pt, k: number): Pt => ({ x: p.x * k, y: p.y * k });
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
