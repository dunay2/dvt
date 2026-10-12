const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { spawnLiveProofProcess, terminateLiveProofProcess } = require('./live-proof-process.cjs');

test('live processes own POSIX groups, observe spawn failures and retain their exit result', async () => {
  const child = new EventEmitter();
  child.pid = 123;
  let options;
  const handle = spawnLiveProofProcess(
    'test',
    'node',
    ['proof'],
    { env: { TOKEN: 'private' } },
    {
      platform: 'linux',
      spawn: (_command, _args, value) => {
        options = value;
        return child;
      },
    }
  );
  assert.equal(options.detached, true);
  assert.equal(options.windowsHide, true);
  child.emit('exit', 0, null);
  assert.deepEqual(await handle.completion, { code: 0, signal: null });
  const failed = new EventEmitter();
  const failure = spawnLiveProofProcess('missing', 'missing', [], {}, { spawn: () => failed });
  failed.emit('error', new Error('spawn failure'));
  await assert.rejects(failure.completion, /spawn failure/);
  await terminateLiveProofProcess(failure);
});

test('POSIX teardown waits for descendants after the leader exits and escalates the whole group', async () => {
  const signals = [];
  let alive = true;
  const handle = { name: 'tree', child: { pid: 123, exitCode: 0, signalCode: null } };
  await terminateLiveProofProcess(handle, {
    platform: 'linux',
    gracefulTimeoutMs: 0,
    forceTimeoutMs: 20,
    kill: (pid, signal) => {
      assert.equal(pid, -123);
      signals.push(signal);
      if (!alive) throw Object.assign(new Error('gone'), { code: 'ESRCH' });
      if (signal === 'SIGKILL') alive = false;
    },
  });
  assert.ok(signals.includes('SIGTERM'));
  assert.ok(signals.includes('SIGKILL'));
  assert.equal(alive, false);
});

test('POSIX teardown fails explicitly when permission or forced-exit bounds cannot be satisfied', async () => {
  const handle = { name: 'tree', child: { pid: 123, exitCode: null, signalCode: null } };
  await assert.rejects(
    terminateLiveProofProcess(handle, {
      platform: 'linux',
      kill: () => {
        throw Object.assign(new Error('denied'), { code: 'EPERM' });
      },
    }),
    /denied/
  );
  await assert.rejects(
    terminateLiveProofProcess(handle, {
      platform: 'linux',
      gracefulTimeoutMs: 0,
      forceTimeoutMs: 0,
      kill: () => true,
    }),
    /did not exit/
  );
});

test('Windows teardown uses taskkill tree ownership and does not swallow command failures', async () => {
  const child = { pid: 456, exitCode: null, signalCode: null };
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    const killer = new EventEmitter();
    queueMicrotask(() => {
      child.exitCode = 0;
      killer.emit('exit', 0, null);
    });
    return killer;
  };
  await terminateLiveProofProcess({ name: 'windows', child }, { platform: 'win32', spawn });
  assert.equal(calls[0].command, 'taskkill');
  assert.deepEqual(calls[0].args, ['/pid', '456', '/t', '/f']);
  assert.equal(calls[0].options.windowsHide, true);
  child.exitCode = null;
  for (const event of ['error', 'exit']) {
    await assert.rejects(
      terminateLiveProofProcess(
        { name: 'windows', child },
        {
          platform: 'win32',
          spawn: () => {
            const killer = new EventEmitter();
            queueMicrotask(() =>
              event === 'error'
                ? killer.emit('error', new Error('taskkill unavailable'))
                : killer.emit('exit', 5, null)
            );
            return killer;
          },
        }
      ),
      /taskkill/
    );
  }
});
