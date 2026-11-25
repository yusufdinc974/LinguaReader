// End-to-end check of EPUB reading and saved-word sentences, in the real app.
//
//   node test/e2e/epub-smoke.mjs <LinguaReader executable> [output dir]
//   E2E_APP_DIR=. node test/e2e/epub-smoke.mjs node_modules/electron/dist/electron   (unpackaged, with `npx vite` running)
//
// Opens test/fixtures/book.epub, checks that the book's script, event handler
// and outside image were thrown away, follows the table of contents and a link
// between chapters, selects a word, saves it and checks that its sentence is
// kept and shown in a review. Drives the app over the Chrome DevTools Protocol.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [exe, outDir = 'e2e-out'] = process.argv.slice(2);
if (!exe) throw new Error('usage: epub-smoke.mjs <exe> [outDir]');
const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
fs.mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = 9334;

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'lr-epub-'));
const args = [`--remote-debugging-port=${PORT}`, `--user-data-dir=${userData}`];
if (process.env.E2E_APP_DIR) args.unshift(process.env.E2E_APP_DIR);
if (process.platform === 'linux' && process.getuid?.() === 0) args.push('--no-sandbox');
args.push(path.join(fixtures, 'book.epub'));
const proc = spawn(exe, args, { stdio: ['ignore', 'pipe', 'pipe'] });
proc.stdout.on('data', d => process.stdout.write('[main] ' + d));
proc.stderr.on('data', d => process.stdout.write('[main] ' + d));

let target;
for (let i = 0; i < 120 && !target; i++) {
    try {
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
        target = list.find(t => t.type === 'page' && /^(file:|http:\/\/localhost)/.test(t.url));
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
    if (m.method === 'Runtime.exceptionThrown') console.log('[exception]', JSON.stringify(m.params.exceptionDetails).slice(0, 800));
});
const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    waiting.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
});
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1300, height: 860, deviceScaleFactor: 1, mobile: false });
const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
};
const shot = async name => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(r.data, 'base64'));
};
const waitFor = async (expr, ms = 15000) => {
    const t = Date.now();
    while (Date.now() - t < ms) {
        if (await evaluate(expr).catch(() => false)) return;
        await sleep(200);
    }
    throw new Error('timed out waiting for ' + expr);
};
const click = text => evaluate(`(() => {
    const el = [...document.querySelectorAll('button, a, [role=button], .menu-item')].find(e => e.textContent.trim().includes(${JSON.stringify(text)}) && e.offsetParent !== null);
    if (!el) throw new Error('no button with ' + ${JSON.stringify(text)});
    el.click();
    return true;
})()`);
const check = (cond, msg) => {
    if (!cond) throw new Error(msg);
    console.log('ok  ', msg);
};

let failed = false;
try {
    await waitFor('!!window.electronAPI', 30000);
    await sleep(1500);
    await click('book');
    await waitFor(`!!document.querySelector('.epub-chapter img')`);
    check(await evaluate(`document.querySelector('.epub-chapter img').src.startsWith('blob:')`), 'cover (an <svg><image>) is shown as a book image');
    await shot('epub-1-cover.png');

    // Contents → "Au marché" (chapter 2, at #marche)
    await evaluate(`document.querySelector('[aria-label=Contents]').click()`);
    await sleep(200);
    await click('Au marché');
    await waitFor(`!!document.querySelector('#epub-marche')`);
    check(await evaluate(`document.querySelector('[aria-label=Chapter]').value`) === '2', 'contents opens chapter 2');
    await sleep(500);

    const safety = await evaluate(`(() => {
        const ch = document.querySelector('.epub-chapter');
        return {
            pwned: window.pwned === 1,
            scripts: ch.querySelectorAll('script, style, iframe').length,
            handlers: [...ch.querySelectorAll('*')].filter(e => [...e.attributes].some(a => a.name.startsWith('on'))).length,
            outside: [...ch.querySelectorAll('img')].filter(i => !i.src.startsWith('blob:')).length,
            images: ch.querySelectorAll('img').length,
            hrefs: ch.querySelectorAll('[href]').length,
            unknownText: ch.textContent.includes('Texte dans une balise inconnue.'),
        };
    })()`);
    check(!safety.pwned && safety.scripts === 0, 'the book’s <script> and <style> are dropped');
    check(safety.handlers === 0, 'event handler attributes are dropped');
    check(safety.outside === 0 && safety.images === 1, 'only the book’s own image is kept, not the outside one');
    check(safety.hrefs === 0, 'no element keeps an href');
    check(safety.unknownText, 'text inside unknown elements is kept');

    // Select "étals" and save it: the card should carry its sentence
    const lists = await evaluate('window.electronAPI.getWordLists()');
    if (!lists.length) await evaluate(`window.electronAPI.createWordList('Test list', '')`);
    // The reader reloads lists when it opens; reopen the chapter so it sees the new one
    await click('Library');
    await sleep(500);
    await click('book');
    await waitFor(`!!document.querySelector('.epub-chapter h1')`);
    await evaluate(`(() => {
        const walker = document.createTreeWalker(document.querySelector('.epub-chapter'), NodeFilter.SHOW_TEXT);
        let n; while ((n = walker.nextNode()) && !n.data.includes('étals'));
        const i = n.data.indexOf('étals');
        const r = document.createRange();
        r.setStart(n, i); r.setEnd(n, i + 'étals'.length);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        n.parentElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        return true;
    })()`);
    // Saving needs a translation (MyMemory, online). Without one, the sentence
    // checks are skipped rather than failed: the rest still runs.
    const translated = await waitFor(`[...document.querySelectorAll('button')].some(b => /Save to/.test(b.textContent) && !b.disabled)`, 20000).then(() => true, async () => {
        await shot('epub-translation-failed.png');
        console.log('SKIP the translation did not arrive (offline?): saved-sentence checks skipped');
        await evaluate(`getSelection().removeAllRanges(), true`);
        return false;
    });
    if (translated) {
        await shot('epub-2-word-card.png');
        await click('Save to list');
        await sleep(200);
        await click(lists[0]?.name ?? 'Test list');
        await sleep(800);
        const word = (await evaluate('window.electronAPI.getAllWords()')).find(w => w.word === 'étals');
        check(word?.sentence_context === 'Les étals du marché étaient vides, et les marchands rangeaient leurs caisses sous les auvents.', `sentence saved with the word: "${word?.sentence_context}"`);
        check(await evaluate(`!!document.querySelector('.epub-chapter mark')`), 'the saved word is highlighted in the chapter');
        await shot('epub-3-highlighted.png');
    }

    // A link to another chapter's #fin
    await evaluate(`[...document.querySelectorAll('.epub-chapter [data-chapter]')].find(e => e.textContent.includes('dernier chapitre')).click()`);
    await waitFor(`document.querySelector('[aria-label=Chapter]').value === '3'`);
    await sleep(500);
    const top = await evaluate(`(() => { const box = document.querySelector('.epub-chapter').closest('.overflow-auto'); const el = document.querySelector('#epub-fin'); return { scroll: box.scrollTop, inView: el.getBoundingClientRect().top < innerHeight && el.getBoundingClientRect().bottom > 0 }; })()`);
    check(top.scroll > 0 && top.inView, 'a link to another chapter lands on its target');

    // Reading position inside a chapter survives leaving the book
    await evaluate(`(() => { const box = document.querySelector('.epub-chapter').closest('.overflow-auto'); box.scrollTop = (box.scrollHeight - box.clientHeight) / 2; box.dispatchEvent(new Event('scroll')); return true; })()`);
    await sleep(800);
    await click('Library');
    await sleep(600);
    check(await evaluate(`document.body.textContent.includes('Chapter 3 of 3')`), 'library shows chapter progress');
    await shot('epub-4-library.png');
    await click('book');
    await waitFor(`document.querySelector('[aria-label=Chapter]')?.value === '3'`);
    await sleep(700);
    const ratio = await evaluate(`(() => { const box = document.querySelector('.epub-chapter').closest('.overflow-auto'); return box.scrollTop / (box.scrollHeight - box.clientHeight); })()`);
    check(ratio > 0.35 && ratio < 0.65, `reopens at the same place in the chapter (${ratio.toFixed(2)})`);

    // Review shows the sentence
    if (translated) {
        await click('Words');
        await sleep(700);
        check(await evaluate(`document.body.textContent.includes('Les étals du marché')`), 'the Words page shows the sentence');
        await shot('epub-5-words.png');
        await click('Review');
        await sleep(300);
        await click('Reverse');
        await click('All (').catch(() => { }); // only offered when some words aren't due
        await click('Start');
        await waitFor(`location.hash.includes('review') || location.pathname.includes('review')`);
        await sleep(600);
        const rev = await evaluate(`(() => ({ text: document.body.textContent, blank: !!document.querySelector('[aria-label="hidden word"]') }))()`);
        check(rev.blank && rev.text.includes('du marché étaient vides') && !rev.text.includes('Les étals'), 'Reverse review shows the sentence with the word blanked out');
        await shot('epub-6-review-reverse.png');
    }
} catch (e) {
    failed = true;
    console.log('FAIL', e.message);
    await shot('epub-failure.png').catch(() => { });
} finally {
    ws.close();
    proc.kill();
    await sleep(1000);
    fs.rmSync(userData, { recursive: true, force: true, maxRetries: 5 });
}
process.exit(failed ? 1 : 0);
