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

test('POSIX teardown awaits an asynchronous signal receipt before probing retirement', async () => {
  const calls = [];
  let alive = true;
  let acknowledge;
  const receipt = new Promise((resolve) => {
    acknowledge = resolve;
  });
  const cleanup = terminateLiveProofProcess(
    { name: 'async-tree', child: { pid: 123, exitCode: null, signalCode: null } },
    {
      platform: 'linux',
      kill: (pid, signal) => {
        assert.equal(pid, -123);
        calls.push(signal);
        if (!alive) throw Object.assign(new Error('gone'), { code: 'ESRCH' });
        if (signal === 'SIGTERM') {
          return receipt.then(() => {
            alive = false;
          });
        }
      },
    }
  );
  try {
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, [0, 'SIGTERM']);
  } finally {
    acknowledge();
    await cleanup;
  }
  assert.equal(alive, false);
});

test('an asynchronous group probe consumes the original deadline and aborts on timeout', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const calls = [];
  const cleanup = terminateLiveProofProcess(
    { name: 'bounded', child: { pid: 123 } },
    {
      platform: 'linux',
      gracefulTimeoutMs: 10,
      forceTimeoutMs: 10,
      kill: (_pid, signal, budget) => {
        calls.push({ signal, budget });
        return new Promise(() => {});
      },
    }
  );
  assert.equal(calls[0].budget.deadline, 1010);
  context.mock.timers.tick(10);
  await assert.rejects(cleanup, { code: 'PROCESS_SIGNAL_TIMEOUT' });
  assert.equal(calls[0].budget.signal.aborted, true);
  assert.deepEqual(
    calls.map((call) => call.signal),
    [0]
  );
  context.mock.timers.tick(1000);
  assert.equal(calls.length, 1);
});

test('the caller absolute deadline caps async probes and both termination phases', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const deadlines = [];
  let alive = true;
  await terminateLiveProofProcess(
    { name: 'capped', child: { pid: 123 } },
    {
      platform: 'linux',
      gracefulTimeoutMs: 0,
      forceTimeoutMs: 5000,
      deadline: 1010,
      kill: async (_pid, signal, budget) => {
        deadlines.push(budget.deadline);
        if (!alive) throw Object.assign(new Error('gone'), { code: 'ESRCH' });
        if (signal === 'SIGKILL') alive = false;
      },
    }
  );
  assert.equal(alive, false);
  assert.ok(deadlines.length >= 4);
  assert.deepEqual(deadlines, [1000, 1000, 1010, 1010]);
});

test('an async TERM-phase probe timeout still attempts bounded KILL and retains the failure', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  let alive = true;
  let probes = 0;
  const calls = [];
  const cleanup = terminateLiveProofProcess(
    { name: 'late-probe', child: { pid: 123 } },
    {
      platform: 'linux',
      gracefulTimeoutMs: 10,
      forceTimeoutMs: 10,
      kill: (_pid, signal, budget) => {
        calls.push({ signal, deadline: budget.deadline });
        if (!alive) throw Object.assign(new Error('gone'), { code: 'ESRCH' });
        if (signal === 'SIGKILL') alive = false;
        if (signal === 0 && ++probes === 2) return new Promise(() => {});
      },
    }
  );
  await new Promise((resolve) => setImmediate(resolve));
  context.mock.timers.tick(10);
  await assert.rejects(cleanup, { code: 'PROCESS_SIGNAL_TIMEOUT' });
  assert.equal(alive, false);
  assert.ok(calls.some((call) => call.signal === 'SIGKILL' && call.deadline === 1020));
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
