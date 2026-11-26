// Run with: npm test. The tar reader used for voice downloads (electron/tar.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { safeJoin, untar } from '../electron/tar.ts';

test('unpacks files, strips the top folder and keeps long names', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lr-tar-'));
    try {
        const src = path.join(tmp, 'src', 'package');
        const long = 'd'.repeat(60) + '/' + 'f'.repeat(80) + '.txt';
        fs.mkdirSync(path.join(src, path.dirname(long)), { recursive: true });
        fs.writeFileSync(path.join(src, 'a.txt'), 'hello');
        fs.writeFileSync(path.join(src, long), 'long');
        fs.symlinkSync('a.txt', path.join(src, 'link.txt'));
        const file = path.join(tmp, 'x.tgz');
        execFileSync('tar', ['czf', file, '-C', path.join(tmp, 'src'), 'package']);
        const out = path.join(tmp, 'out');
        untar(zlib.gunzipSync(fs.readFileSync(file)), out, 1);
        assert.equal(fs.readFileSync(path.join(out, 'a.txt'), 'utf8'), 'hello');
        assert.equal(fs.readFileSync(path.join(out, long), 'utf8'), 'long');
        assert.equal(fs.readFileSync(path.join(out, 'link.txt'), 'utf8'), 'hello');
        assert.equal(fs.existsSync(path.join(out, 'package')), false);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test('never writes outside the folder', () => {
    const dir = path.resolve('/tmp/x');
    assert.equal(safeJoin(dir, '../evil'), null);
    assert.equal(safeJoin(dir, '/etc/passwd'), null);
    assert.equal(safeJoin(dir, 'C:/Windows/x'), null);
    assert.equal(safeJoin(dir, 'a/../../b'), null);
    assert.equal(safeJoin(dir, 'ok/file'), path.join(dir, 'ok', 'file'));
});
