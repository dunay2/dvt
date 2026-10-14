import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderBulletList } = require('../../scripts/sync-docs.cjs');

test('index links normalize display whitespace without mutating documentary titles', () => {
  const rows = Object.freeze([
    Object.freeze({ label: '  Risk title\n  across\tlines  ', link: 'quality/a record.md#risk' }),
    Object.freeze({ label: 'Single title', link: 'single.md' }),
  ]);
  assert.deepEqual(renderBulletList(rows), [
    '- [Risk title across lines](quality/a%20record.md#risk)',
    '- [Single title](single.md)',
  ]);
  assert.equal(rows[0].label, '  Risk title\n  across\tlines  ');
});
