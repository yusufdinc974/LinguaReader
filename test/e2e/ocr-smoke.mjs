// End-to-end check of a built or installed app: opens a scanned PDF and a
// manga (CBZ), waits for text recognition and checks the text it found.
// Used by .github/workflows/installer-test.yml on Windows.
//
//   node test/e2e/ocr-smoke.mjs <path to LinguaReader executable> <output dir>
//
// Drives the app over the Chrome DevTools Protocol (Node 22+ for WebSocket).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [exe, outDir = 'e2e-out'] = process.argv.slice(2);
if (!exe) throw new Error('usage: ocr-smoke.mjs <exe> [outDir]');
const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
fs.mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = 9333;

async function launch() {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'lr-e2e-'));
    const args = [`--remote-debugging-port=${PORT}`, `--user-data-dir=${userData}`];
    if (process.platform === 'linux') args.push('--no-sandbox');
    const proc = spawn(exe, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', d => process.stdout.write('[main] ' + d));
    proc.stderr.on('data', d => process.stdout.write('[main] ' + d));
    let target;
    for (let i = 0; i < 120 && !target; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
            target = list.find(t => t.type === 'page' && t.url.startsWith('file:'));
        } catch { }
        if (!target) await sleep(500);
    }
    if (!target) throw new Error('The app window did not appear');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });
    let id = 0;
    const waiting = new Map();
    ws.addEventListener('message', e => {
        const m = JSON.parse(e.data);
        if (m.id && waiting.has(m.id)) {
            const w = waiting.get(m.id);
            waiting.delete(m.id);
            m.error ? w.rej(new Error(m.error.message)) : w.res(m.result);
        }
        if (m.method === 'Runtime.consoleAPICalled') console.log('[console]', m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 600));
        if (m.method === 'Runtime.exceptionThrown') console.log('[exception]', JSON.stringify(m.params.exceptionDetails).slice(0, 800));
    });
    const send = (method, params = {}) => new Promise((res, rej) => {
        const i = ++id;
        waiting.set(i, { res, rej });
        ws.send(JSON.stringify({ id: i, method, params }));
    });
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    const evaluate = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
        return r.result.value;
    };
    const shot = async name => {
        const r = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(outDir, name), Buffer.from(r.data, 'base64'));
    };
    const waitFor = async (expr, ms) => {
        const t = Date.now();
        while (Date.now() - t < ms) {
            if (await evaluate(expr).catch(() => false)) return Date.now() - t;
            await sleep(300);
        }
        throw new Error('timed out waiting for ' + expr);
    };
    const close = async () => {
        ws.close();
        proc.kill();
        await sleep(1500);
        fs.rmSync(userData, { recursive: true, force: true, maxRetries: 5 });
    };
    return { evaluate, shot, waitFor, close };
}

const SHOW_LAYER = `(() => { const s = document.createElement('style'); s.textContent = '.pdf-text-layer span{color:rgba(220,0,0,.75)!important; outline:1px solid rgba(0,0,255,.35)}'; document.head.appendChild(s); return true })()`;

/** Opens `file` from the library and returns the recognised text of its first page. */
async function readFirstPage(file, shotName) {
    const app = await launch();
    try {
        await app.waitFor('!!window.electronAPI', 30000);
        const ok = await app.evaluate('window.electronAPI.ocrAvailable()');
        if (!ok) throw new Error('OCR models are not installed in this build');
        await app.evaluate(`window.electronAPI.addRecentPdf(${JSON.stringify(file)}, ${JSON.stringify(path.join(fixtures, file))})`);
        await app.evaluate('location.reload(), true');
        await sleep(2500);
        const name = file.replace(/\.[^.]+$/, '');
        await app.evaluate(`(() => { const el = [...document.querySelectorAll('button, a, [role=button]')].find(e => e.textContent.includes(${JSON.stringify(name)})); el.click(); return true })()`);
        const ms = await app.waitFor(`document.querySelectorAll('.ocr-layer span').length > 0 || !!document.querySelector('.ocr-badge')?.textContent.includes("Couldn't")`, 180000);
        const err = await app.evaluate(`document.querySelector('.ocr-badge')?.title || ''`);
        await sleep(800);
        await app.shot(`${shotName}.png`);
        await app.evaluate(SHOW_LAYER);
        await sleep(300);
        await app.shot(`${shotName}-text-layer.png`);
        if (err) throw new Error(`${file}: OCR failed: ${err}`);
        const text = await app.evaluate(`document.querySelector('.ocr-layer').textContent`);
        console.log(`${file}: text after ${ms} ms: ${text.slice(0, 300)}`);
        return text;
    } catch (e) {
        await app.shot(`${shotName}-failure.png`).catch(() => { });
        throw e;
    } finally {
        await app.close();
    }
}

const checks = [
    ['scanned-book.pdf', 'scanned-pdf', /bright\s*cold\s*day/i],
    ['manga.cbz', 'manga', /ちょっと/],
];
let failed = 0;
for (const [file, shotName, expected] of checks) {
    try {
        const text = await readFirstPage(file, shotName);
        if (!expected.test(text)) throw new Error(`${file}: expected ${expected} in the recognised text`);
        console.log(`PASS ${file}`);
    } catch (e) {
        failed++;
        console.log(`FAIL ${e.message}`);
    }
}
process.exit(failed ? 1 : 0);
