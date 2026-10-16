/** Owned concern: run the Python protocol contract in the existing Node test-tool gate. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

test('Linux process protocol and privacy contracts', () => {
  const result = spawnSync(
    process.platform === 'win32' ? 'python' : 'python3',
    ['-I', '-B', path.join(__dirname, 'chromium-process-protocol.test.py')],
    { encoding: 'utf8' }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
});
