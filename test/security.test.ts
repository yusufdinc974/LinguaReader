// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup } from '../electron/backup.ts';
import { isNewerVersion } from '../electron/version.ts';
import { SyncServer, lanAddress, tokensMatch } from '../electron/sync_server.ts';

test('backup: rejects files that are not backups', () => {
    for (const bad of [null, 'x', [], {}, { version: 1, words: [] }, { version: 1, wordLists: [], words: 'x' }]) {
        assert.throws(() => parseBackup(bad), /Invalid backup/);
    }
    assert.throws(() => parseBackup({ version: 1, wordLists: [], words: [], wordListItems: 'x' }), /not a list/);
});

test('backup: drops malformed rows and fields', () => {
    const b = parseBackup({
        version: 1,
        wordLists: [{ id: 1, name: 'A', color: '0xFF112233' }, { id: 'x', name: 'B' }, { id: 2, name: '' }, { id: 3, name: 'C', color: 'javascript:alert(1)' }],
        words: [{ id: 1, word: 'merhaba', translation: 'hello' }, { id: 2, word: { $gt: '' }, translation: 'x' }],
        wordListItems: [{ word_list_id: 1, word_id: 1 }, { word_list_id: '1', word_id: 1 }],
        wordFamiliarity: [{ word_lower: 'merhaba', familiarity_level: 99, easiness_factor: 'x', interval: -5, next_review_date: 'soon' }],
        userSettings: [{ key: 'theme', value: 'light' }, { key: 'x', value: 5 }],
    });
    assert.deepEqual(b.wordLists.map(l => [l.id, l.name, l.color]), [[1, 'A', '#112233'], [3, 'C', null]]);
    assert.deepEqual(b.words.map(w => w.word), ['merhaba']);
    assert.equal(b.words[0].source_language, '');
    assert.equal(b.wordListItems.length, 1);
    assert.deepEqual(
        [b.wordFamiliarity[0].familiarity_level, b.wordFamiliarity[0].easiness_factor, b.wordFamiliarity[0].interval, b.wordFamiliarity[0].next_review_date],
        [5, 2.5, 0, null],
    );
    assert.deepEqual(b.userSettings, [{ key: 'theme', value: 'light' }]);
});

test('update check compares versions as numbers', () => {
    assert.equal(isNewerVersion('1.10.0', '1.9.0'), true);
    assert.equal(isNewerVersion('v1.1.3', '1.1.2'), true);
    assert.equal(isNewerVersion('1.1.2', '1.1.2'), false);
    assert.equal(isNewerVersion('1.0.9', '1.1.0'), false); // no downgrades
});

test('sync: token comparison', () => {
    assert.equal(tokensMatch('abc', 'abc'), true);
    assert.equal(tokensMatch('abd', 'abc'), false);
    assert.equal(tokensMatch('ab', 'abc'), false);
    assert.equal(tokensMatch(undefined, 'abc'), false);
    assert.equal(tokensMatch('', ''), false);
});

test('sync: picks a private LAN address', () => {
    const nic = (address: string, internal = false) => ({ address, family: 'IPv4', internal, netmask: '', mac: '', cidr: null }) as any;
    assert.equal(lanAddress({ lo: [nic('127.0.0.1', true)], docker: [nic('169.254.1.2')], wlan: [nic('192.168.1.20')] }), '192.168.1.20');
    assert.equal(lanAddress({ lo: [nic('127.0.0.1', true)] }), '127.0.0.1');
});

test('sync server: random token, lockout, one sync, no secrets', async () => {
    const sent: string[] = [];
    const win = { isDestroyed: () => false, webContents: { send: (_: string, s: { status: string }) => sent.push(s.status) } } as any;
    const server = new SyncServer(win, '127.0.0.1');
    let stopped = false;
    server.onStopped = () => { stopped = true; };
    server.onImportData = async data => ({ success: true, got: (data as { version: number }).version });
    server.onGetExportData = async () => ({ version: 1, words: [] });
    const info = await server.start();
    try {
        assert.equal(Buffer.from(info.pin, 'base64url').length, 16);
        const base = `http://127.0.0.1:${info.port}`;
        const call = (p: string, pin: string, init: RequestInit = {}) =>
            fetch(base + p, { ...init, headers: { 'x-auth-pin': pin, ...(init.headers ?? {}) } });

        assert.equal((await call('/sync/handshake', info.pin)).status, 200);
        assert.equal((await call('/sync/nope', info.pin)).status, 404);
        assert.equal((await call('/sync/upload', info.pin, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' })).status, 415);
        assert.equal((await call('/sync/upload', info.pin, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status, 400);

        const up = await call('/sync/upload', info.pin, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: 1 }) });
        assert.deepEqual(await up.json(), { success: true, got: 1 });
        const down = await call('/sync/download', info.pin);
        assert.deepEqual(await down.json(), { version: 1, words: [] });
        await new Promise(r => setTimeout(r, 1300));
        assert.equal(stopped, true, 'stops after a complete sync');
        assert.ok(sent.includes('completed'));
        await assert.rejects(call('/sync/handshake', info.pin));
    } finally {
        server.stop();
    }

    // Wrong tokens: locked out after 5, even with the right token afterwards
    const s2 = new SyncServer(win, '127.0.0.1');
    const i2 = await s2.start();
    try {
        const codes = [];
        for (let i = 0; i < 6; i++) codes.push((await fetch(`http://127.0.0.1:${i2.port}/sync/handshake`, { headers: { 'x-auth-pin': '1234' } })).status);
        assert.deepEqual(codes, [401, 401, 401, 401, 401, 429]);
        assert.equal((await fetch(`http://127.0.0.1:${i2.port}/sync/handshake`, { headers: { 'x-auth-pin': i2.pin } })).status, 429);
    } finally {
        s2.stop();
    }
});
