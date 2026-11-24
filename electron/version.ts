/** Whether version `a` is newer than `b` ("1.10.0" > "1.9.2"; pre-releases ignored). */
export function isNewerVersion(a: string, b: string): boolean {
    const parse = (v: string) => v.replace(/^v/, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
    const x = parse(a);
    const y = parse(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
        const d = (x[i] ?? 0) - (y[i] ?? 0);
        if (d !== 0) return d > 0;
    }
    return false;
}
