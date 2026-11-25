// Run with: npm test. The parts of src/lib/epub.ts that need a DOM are
// covered by test/e2e/epub-smoke.mjs in the real app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePath } from '../src/lib/epub.ts';

test('resolves chapter-relative paths inside the zip', () => {
    assert.deepEqual(resolvePath('OEBPS/text/ch1.xhtml', '../images/a.png'), { path: 'OEBPS/images/a.png', fragment: undefined });
    assert.deepEqual(resolvePath('OEBPS/text/ch1.xhtml', 'ch2.xhtml#fin'), { path: 'OEBPS/text/ch2.xhtml', fragment: 'fin' });
    assert.deepEqual(resolvePath('OEBPS/content.opf', 'Text/My%20Chapter.xhtml'), { path: 'OEBPS/Text/My Chapter.xhtml', fragment: undefined });
    assert.deepEqual(resolvePath('content.opf', './a.xhtml'), { path: 'a.xhtml', fragment: undefined });
});

test('never climbs out of the zip root', () => {
    assert.equal(resolvePath('OEBPS/a.xhtml', '../../../../etc/passwd').path, 'etc/passwd');
});
