// Shared OCR types. Pure data: used by the OCR process, main and the renderer.

/** A recognition model ("script pack"). `v6` is the default multilingual model. */
export type ScriptId =
    | 'v6'
    | 'cyrillic'
    | 'korean'
    | 'arabic'
    | 'greek'
    | 'thai'
    | 'devanagari'
    | 'tamil'
    | 'telugu';

export const SCRIPTS: { id: ScriptId; label: string; languages: string }[] = [
    { id: 'v6', label: 'Latin, Chinese and Japanese', languages: 'English, Turkish, German, French, Spanish, Italian, Portuguese, Polish, Dutch, Swedish, Danish, Norwegian, Finnish, Czech, Romanian, Hungarian, Indonesian, Chinese, Japanese and more' },
    { id: 'cyrillic', label: 'Cyrillic', languages: 'Russian, Ukrainian, Belarusian, Bulgarian, Serbian, Kazakh and more' },
    { id: 'korean', label: 'Korean', languages: 'Korean' },
    { id: 'arabic', label: 'Arabic script', languages: 'Arabic, Persian, Urdu' },
    { id: 'greek', label: 'Greek', languages: 'Greek' },
    { id: 'thai', label: 'Thai', languages: 'Thai' },
    { id: 'devanagari', label: 'Devanagari', languages: 'Hindi, Marathi, Nepali' },
    { id: 'tamil', label: 'Tamil', languages: 'Tamil' },
    { id: 'telugu', label: 'Telugu', languages: 'Telugu' },
];

/** Bumped when models or post-processing change, so old cached results are redone. */
export const OCR_VERSION = 1;

export interface OcrLine {
    text: string;
    /** Mean character confidence, 0–1. */
    conf: number;
    /** Text runs top to bottom (a CJK column). */
    vertical: boolean;
    /** Centre of the line box, in image pixels. */
    cx: number;
    cy: number;
    /** Extent along the reading direction and across it, in image pixels. */
    len: number;
    thick: number;
    /** Rotation of the reading direction in radians (0 = left→right, or top→bottom for vertical). */
    angle: number;
    /** Boundaries of each code point along `len`, as fractions 0–1 (length = code points + 1). */
    cuts: number[];
    /** Right-to-left script: `cuts` are measured from the line's right end. */
    rtl?: boolean;
    /** Index of the block (bubble / paragraph) this line belongs to; lines come in reading order. */
    block: number;
}

export interface OcrPage {
    /** Size of the image the coordinates refer to. */
    width: number;
    height: number;
    script: ScriptId;
    lines: OcrLine[];
}

export interface RgbaImage {
    data: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
}
