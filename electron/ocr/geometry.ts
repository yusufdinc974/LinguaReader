// Pixel geometry for the text detector's output: connected regions,
// their tightest rotated rectangle, and sampling a rotated crop.

export interface Pt {
    x: number;
    y: number;
}

export interface Region {
    /** Pixel indices (y * width + x) of the region. */
    pixels: Int32Array;
    /** Mean probability over the region. */
    score: number;
}

/** 8-connected regions of `mask`; `prob` gives each region's mean score. */
export function regions(mask: Uint8Array, prob: Float32Array, width: number, height: number, minPixels = 4): Region[] {
    const label = new Int32Array(width * height);
    const stack = new Int32Array(width * height);
    const out: Region[] = [];
    let next = 1;
    for (let start = 0; start < mask.length; start++) {
        if (!mask[start] || label[start]) continue;
        let sp = 0;
        let count = 0;
        let sum = 0;
        stack[sp++] = start;
        label[start] = next;
        const members: number[] = [];
        while (sp > 0) {
            const p = stack[--sp];
            members.push(p);
            count++;
            sum += prob[p];
            const x = p % width;
            const y = (p - x) / width;
            for (let dy = -1; dy <= 1; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    if ((dx === 0 && dy === 0) || nx < 0 || nx >= width) continue;
                    const q = ny * width + nx;
                    if (mask[q] && !label[q]) {
                        label[q] = next;
                        stack[sp++] = q;
                    }
                }
            }
        }
        next++;
        if (count >= minPixels) out.push({ pixels: Int32Array.from(members), score: sum / count });
    }
    return out;
}

/** Convex hull (monotone chain) of a region's pixel corners. */
export function hull(pixels: Int32Array, width: number): Pt[] {
    // Only the leftmost and rightmost pixel of each row can be on the hull.
    const rows = new Map<number, [number, number]>();
    for (let i = 0; i < pixels.length; i++) {
        const x = pixels[i] % width;
        const y = (pixels[i] - x) / width;
        const r = rows.get(y);
        if (!r) rows.set(y, [x, x]);
        else {
            if (x < r[0]) r[0] = x;
            if (x > r[1]) r[1] = x;
        }
    }
    const pts: Pt[] = [];
    for (const [y, [x0, x1]] of rows) {
        pts.push({ x: x0, y }, { x: x0, y: y + 1 }, { x: x1 + 1, y }, { x: x1 + 1, y: y + 1 });
    }
    pts.sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: Pt[] = [];
    for (const p of pts) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper: Pt[] = [];
    for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

export interface RotRect {
    cx: number;
    cy: number;
    /** Extent along `angle` and across it. */
    w: number;
    h: number;
    /** Direction of the `w` side, radians, normalised to (-π/4, π/4]. */
    angle: number;
}

/** Smallest-area rectangle around a convex polygon (rotating calipers over hull edges). */
export function minAreaRect(poly: Pt[]): RotRect {
    let best: RotRect | null = null;
    let bestArea = Infinity;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % n];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len === 0) continue;
        const ux = (b.x - a.x) / len;
        const uy = (b.y - a.y) / len;
        let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
        for (const p of poly) {
            const u = p.x * ux + p.y * uy;
            const v = -p.x * uy + p.y * ux;
            if (u < minU) minU = u;
            if (u > maxU) maxU = u;
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
        }
        const area = (maxU - minU) * (maxV - minV);
        if (area < bestArea) {
            bestArea = area;
            const cu = (minU + maxU) / 2;
            const cv = (minV + maxV) / 2;
            best = { cx: cu * ux - cv * uy, cy: cu * uy + cv * ux, w: maxU - minU, h: maxV - minV, angle: Math.atan2(uy, ux) };
        }
    }
    if (!best) {
        const p = poly[0] ?? { x: 0, y: 0 };
        return { cx: p.x, cy: p.y, w: 1, h: 1, angle: 0 };
    }
    return normaliseAngle(best);
}

/** Same rectangle, described with the side closest to horizontal as `w`. */
export function normaliseAngle(r: RotRect): RotRect {
    let { w, h, angle } = r;
    while (angle > Math.PI / 4) {
        angle -= Math.PI / 2;
        [w, h] = [h, w];
    }
    while (angle <= -Math.PI / 4) {
        angle += Math.PI / 2;
        [w, h] = [h, w];
    }
    return { cx: r.cx, cy: r.cy, w, h, angle };
}

/**
 * Samples a rotated crop into a BGR float tensor slice, already resized to
 * outW × outH and normalised as the recogniser expects ((x/255 − 0.5) / 0.5).
 * `origin` is where reading starts, `dirU` the reading direction (length =
 * crop length in px), `dirV` the across direction (length = crop thickness).
 */
export function sampleCrop(
    img: { data: ArrayLike<number>; width: number; height: number },
    origin: Pt, dirU: Pt, dirV: Pt,
    outW: number, outH: number,
    dst: Float32Array, dstOffset: number, dstStride: number,
) {
    const { data, width, height } = img;
    const plane = outH * dstStride;
    for (let v = 0; v < outH; v++) {
        const fv = (v + 0.5) / outH;
        for (let u = 0; u < outW; u++) {
            const fu = (u + 0.5) / outW;
            let x = origin.x + dirU.x * fu + dirV.x * fv - 0.5;
            let y = origin.y + dirU.y * fu + dirV.y * fv - 0.5;
            if (x < 0) x = 0;
            if (y < 0) y = 0;
            if (x > width - 1) x = width - 1;
            if (y > height - 1) y = height - 1;
            const x0 = Math.floor(x), y0 = Math.floor(y);
            const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
            const ax = x - x0, ay = y - y0;
            const i00 = (y0 * width + x0) * 4, i10 = (y0 * width + x1) * 4;
            const i01 = (y1 * width + x0) * 4, i11 = (y1 * width + x1) * 4;
            const o = dstOffset + v * dstStride + u;
            for (let c = 0; c < 3; c++) {
                const s = 2 - c; // BGR
                const top = data[i00 + s] * (1 - ax) + data[i10 + s] * ax;
                const bot = data[i01 + s] * (1 - ax) + data[i11 + s] * ax;
                dst[o + c * plane] = (top * (1 - ay) + bot * ay) / 127.5 - 1;
            }
        }
    }
}
