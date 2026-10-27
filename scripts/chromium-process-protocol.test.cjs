/** Owned concern: run the Python protocol contract in the existing Node test-tool gate. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

for (const file of [
  'chromium-process-protocol.test.py',
  'chromium-signal-trace.test.py',
  'chromium-oom-journal.test.py',
]) {
  test(`Linux observer contract: ${file}`, () => {
    const result = spawnSync(
      process.env.PYTHON || (process.platform === 'win32' ? 'python.exe' : 'python3'),
      ['-I', '-B', path.join(__dirname, file)],
      { encoding: 'utf8', timeout: 30_000, maxBuffer: 1_048_576, windowsHide: true }
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr);
  });
}
