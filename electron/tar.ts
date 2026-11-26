// A small tar reader for the voice engine and voice archives. No Electron
// here, so it also runs in the voice worker (see ttsWorker.ts).

import fs from 'node:fs';
import path from 'node:path';

/** Path inside `dir` for an archive entry, or null if it would land outside. */
export function safeJoin(dir: string, name: string) {
    const clean = name.replace(/\\/g, '/');
    if (!clean || clean.startsWith('/') || /^[a-zA-Z]:/.test(clean) || clean.split('/').includes('..')) return null;
    const full = path.join(dir, clean);
    return full.startsWith(dir + path.sep) ? full : null;
}

/**
 * Unpacks regular files, folders and symlinks (the engine's .so links).
 * `strip` drops that many leading folders from each name ("package/x" → "x").
 */
export function untar(data: Buffer, dir: string, strip = 0) {
    let off = 0;
    let longName: string | null = null;
    const links: [string, string][] = [];
    while (off + 512 <= data.length) {
        const header = data.subarray(off, off + 512);
        if (header.every(b => b === 0)) break;
        const str = (a: number, n: number) => header.subarray(a, a + n).toString('utf8').replace(/\0.*$/s, '');
        let name = str(0, 100);
        const prefix = str(345, 155);
        if (prefix) name = `${prefix}/${name}`;
        const size = parseInt(str(124, 12).trim() || '0', 8);
        const type = String.fromCharCode(header[156] || 48);
        const mode = parseInt(str(100, 8).trim() || '644', 8);
        off += 512;
        const body = data.subarray(off, off + size);
        off += Math.ceil(size / 512) * 512;
        // GNU long names and pax headers
        if (type === 'L') {
            longName = body.toString('utf8').replace(/\0.*$/s, '');
            continue;
        }
        if (type === 'x' || type === 'g') {
            const m = /\d+ path=([^\n]*)\n/.exec(body.toString('utf8'));
            if (m && type === 'x') longName = m[1];
            continue;
        }
        if (longName) {
            name = longName;
            longName = null;
        }
        const parts = name.replace(/\\/g, '/').split('/').filter(Boolean);
        if (parts.length <= strip) continue;
        const target = safeJoin(dir, parts.slice(strip).join('/'));
        if (!target) continue;
        if (type === '5') fs.mkdirSync(target, { recursive: true });
        else if (type === '0' || type === '\0' || type === '7') {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, body, { mode: (mode & 0o755) | 0o600 });
        } else if (type === '2') {
            const linkTo = str(157, 100);
            // Only links to a file next to it (libfoo.so -> libfoo.so.1)
            if (/^[\w.+-]+$/.test(linkTo)) links.push([target, linkTo]);
        }
    }
    for (const [at, to] of links) {
        try {
            fs.rmSync(at, { force: true });
            fs.symlinkSync(to, at);
        } catch {
            const src = path.join(path.dirname(at), to);
            if (fs.existsSync(src)) fs.copyFileSync(src, at);
        }
    }
}
