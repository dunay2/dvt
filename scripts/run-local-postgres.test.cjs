'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const test = require('node:test');

const {
  composeDown,
  resetComposeCommandCache,
  resolveComposeCommand,
} = require('./run-local-postgres.cjs');

test('uses Docker Compose v2 when available', (t) => {
  resetComposeCommandCache();
  t.after(resetComposeCommandCache);
  const calls = [];
  t.mock.method(childProcess, 'spawnSync', (command, args) => {
    calls.push({ command, args });
    return { status: 0 };
  });

  const command = resolveComposeCommand();

  assert.deepEqual(command, { command: 'docker', prefixArgs: ['compose'], shell: false });
  assert.deepEqual(calls, [{ command: 'docker', args: ['compose', 'version'] }]);
});

test('propagates destructive teardown failures', (t) => {
  resetComposeCommandCache();
  t.after(resetComposeCommandCache);
  let callCount = 0;
  t.mock.method(childProcess, 'spawnSync', (command, args) => {
    callCount += 1;
    if (callCount === 1) return { status: 0 };
    assert.equal(command, 'docker');
    assert.deepEqual(args.slice(-2), ['down', '-v']);
    return { status: 1 };
  });

  assert.throws(() => composeDown(), /failed with exit code 1/);
});
