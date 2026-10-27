/** Owned concern: privileged observer lifecycle, scoped inputs and safe artifact publication. */
require('tsx/cjs');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const test = require('node:test');
const {
  startChromiumProcessObserver,
} = require('../apps/web/cypress/node/chromiumProcessObserver.ts');

function fixture(startRecords, code = 0, tail = '', settings = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-process-observer-test-'));
  let current;
  const sessions = [];
  const send = (record) => current.handle.child.stdout.write(`${JSON.stringify(record)}\n`);
  const port = {
    platform: 'linux',
    pid: 10,
    async open(options, purpose) {
      const child = Object.assign(new EventEmitter(), {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
      });
      const generation = 'unit-owned-' + purpose;
      let finish;
      const closed = new Promise((resolve) => {
        finish = resolve;
      });
      const descriptor = sessions.length + 9;
      const item = {
        workspaceRoot: root,
        handle: { child, completion: Promise.resolve({ code: 0, signal: null }) },
        closed,
        ended: false,
        released: false,
        descriptor,
        lease: {
          version: 1,
          purpose,
          generation,
          controller: { pid: 10, birthtimeTicks: '1' },
          leader: { pid: 20, birthtimeTicks: '2', processGroupId: 20, sessionId: 20 },
          leaderProcReference: { ownerFd: descriptor, device: '1', inode: String(descriptor) },
          capture: { path: options.captureRoot, device: '3', inode: '4' },
        },
        release() {
          item.released = true;
        },
        close(exitCode, signal) {
          if (!item.ended) {
            item.ended = true;
            finish({ code: exitCode, signal });
          }
        },
      };
      current = item;
      sessions.push(item);
      const write = (record) => child.stdout.write(JSON.stringify(record) + '\n');
      child.stdin.on('data', (chunk) => {
        const input = JSON.parse(String(chunk));
        if (input.version === 1) write({ kind: 'ownership', generation });
        else {
          assert.deepEqual(input, { action: 'admit', generation });
          for (const [index, name] of (purpose === 'canary'
            ? []
            : [generation, ...(purpose === 'probe' ? [generation + '-canary'] : [])]
          ).entries()) {
            write({ kind: 'trace-allocation', generation: name });
            if (!settings.omitAcquisition)
              write({
                kind: 'trace-acquired',
                generation: name,
                rootKind: 'tracefs',
                name: 'dvt-signal-' + name,
                device: '1',
                inode: String(index + 100),
              });
          }
          (purpose === 'probe'
            ? [{ kind: 'probe-ready' }]
            : purpose === 'canary'
              ? [{ kind: 'canary-ready' }]
              : startRecords
          ).forEach(write);
        }
      });
      child.stdin.once('finish', () => {
        if (purpose === 'observe' && settings.holdEOF) return;
        if (purpose === 'observe') {
          write({ kind: 'complete', incomplete: false });
          if (tail) child.stdout.write(tail);
        }
        item.close(code, null);
      });
      return item;
    },
    async control(item, action) {
      if (item.lease.leaderProcReference.ownerFd !== item.descriptor)
        throw new Error('Foreign pinned descriptor denied');
      if ('signal' in action) {
        if (action.signal === 9) item.close(null, 'SIGKILL');
        return action.signal === 0 && item.ended ? 'gone' : 'alive';
      }
      const expected = action.trace.generation.endsWith('-canary') ? '101' : '100';
      if (action.trace.inode !== expected) throw new Error('Foreign trace canary denied');
      return 'removed';
    },
    async terminate(item) {
      const signalled = !item.ended;
      item.close(null, 'SIGTERM');
      return signalled;
    },
  };
  return {
    root,
    get child() {
      return current.handle.child;
    },
    port,
    sessions,
    send,
    options: {
      workspaceRoot: root,
      captureRoot: path.join(os.tmpdir(), 'dvt-chromium-network-owned'),
    },
    report() {
      const directory = path.join(root, '.dvt/evidence/chromium-network');
      return JSON.parse(
        fs.readFileSync(path.join(directory, fs.readdirSync(directory)[0]), 'utf8')
      );
    },
    cleanup() {
      assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
      fs.rmSync(root, { recursive: true });
    },
  };
}

test('non-Linux does not start an observer or create evidence', async () => {
  assert.equal(
    await startChromiumProcessObserver(
      { workspaceRoot: 'unused', captureRoot: 'unused' },
      {
        platform: 'win32',
        pid: 10,
        start: () => assert.fail('must not launch'),
      }
    ),
    null
  );
});

test('readiness precedes use, EOF owns cleanup and only projected records publish', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    assert.equal(fs.readdirSync(item.root).length, 0);
    item.send({
      kind: 'process-exit',
      pid: 23,
      tid: 23,
      browserPid: 21,
      role: 'network-service',
      birthtimeTicks: 42,
      timestampNs: '123',
      parentNotification: 17,
      signal: 9,
      coreDumped: false,
      argv: ['private secret'],
      environment: { TOKEN: 'private secret' },
    });
    item.child.stderr.write('private stderr');
    item.send({
      kind: 'kernel-oom-victim',
      victimPid: 23,
      timestampNs: '124',
      clock: 'kernel-log',
      correlation: 'pid-only',
      role: 'network-service',
      browserPid: 21,
    });
    await binding.stop();
    const report = item.report();
    const filenames = fs.readdirSync(path.join(item.root, '.dvt/evidence/chromium-network'));
    assert.doesNotMatch(JSON.stringify(filenames), /owned|unit-|dvt-chromium-network/);
    assert.equal(report.state, 'complete');
    assert.equal(report.records[1].signal, 9);
    assert.deepEqual(report.records[2], {
      kind: 'kernel-oom-victim',
      victimPid: 23,
      timestampNs: '124',
      clock: 'kernel-log',
      correlation: 'pid-only',
    });
    assert.doesNotMatch(JSON.stringify(report), /private|argv|environment|TOKEN/);
  } finally {
    item.cleanup();
  }
});

test('unavailable process capability is explicit and never admits the browser', async () => {
  const item = fixture([{ kind: 'unavailable', source: 'process-events' }], 1);
  try {
    await assert.rejects(
      startChromiumProcessObserver(item.options, item.port),
      /diagnostics unavailable/
    );
    assert.equal(item.report().state, 'unavailable');
  } finally {
    item.cleanup();
  }
});

test('wrong readiness identity rejects without recording arbitrary data', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 99 }]);
  try {
    await assert.rejects(
      startChromiumProcessObserver(item.options, item.port),
      /diagnostics unavailable/
    );
    assert.equal(item.report().state, 'unavailable');
  } finally {
    item.cleanup();
  }
});

test('lost records and nonzero exit cannot be reported as complete evidence', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }], 1);
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    item.send({ kind: 'coverage-gap', source: 'process-events', reason: 'records-lost' });
    await assert.rejects(binding.stop(), /diagnostics incomplete/);
    assert.equal(item.report().state, 'incomplete');
  } finally {
    item.cleanup();
  }
});

test('an unterminated final record makes evidence incomplete', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }], 0, '{"private":');
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    await assert.rejects(binding.stop(), /diagnostics incomplete/);
    assert.equal(item.report().state, 'incomplete');
    assert.doesNotMatch(JSON.stringify(item.report()), /private/);
  } finally {
    item.cleanup();
  }
});

test('missing network identity remains an explicit coverage gap in the artifact', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    const gap = {
      kind: 'coverage-gap',
      source: 'process-events',
      reason: 'network-service-not-observed',
    };
    item.send(gap);
    await assert.rejects(binding.stop(), /diagnostics incomplete/);
    assert.equal(item.report().state, 'incomplete');
    assert.deepEqual(item.report().records[1], gap);
  } finally {
    item.cleanup();
  }
});

test('an exit cannot report both a terminating signal and a normal exit code', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    item.send({
      kind: 'process-exit',
      pid: 23,
      tid: 23,
      browserPid: 21,
      role: 'network-service',
      birthtimeTicks: 42,
      timestampNs: '123',
      parentNotification: 17,
      exitCode: 0,
      signal: 9,
      coreDumped: false,
    });
    await assert.rejects(binding.stop(), /diagnostics incomplete/);
    assert.equal(item.report().state, 'incomplete');
  } finally {
    item.cleanup();
  }
});

test('signal generation and OOM reports retain uncertainty and drop raw data', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    item.send({
      kind: 'signal-generation',
      targetTid: 23,
      targetProcessCandidatePid: 23,
      generatorTid: 21,
      timestampNs: '123000',
      precisionNs: 1000,
      signal: 9,
      signalCode: 0,
      signalErrno: 0,
      group: true,
      result: 0,
      correlation: 'pid-only',
      generatorCategory: 'chromium',
      generatorCorrelation: 'pid-only-after-event',
      generatorSnapshotPid: 20,
      generatorSnapshotBirthtimeTicks: 5,
      raw: 'secret args',
    });
    item.send({
      kind: 'userspace-oom-report',
      daemon: 'systemd-oomd',
      daemonPid: 12,
      timestampNs: '124000',
      action: 'cgroup-kill-report',
      correlation: 'runner-interval-only',
      MESSAGE: 'secret cgroup',
    });
    item.send({
      kind: 'userspace-oom-coverage',
      entriesRead: 1,
      reportsRetained: 1,
      scope: 'systemd-oomd-and-earlyoom',
      startedNs: '100000',
      endedNs: '200000',
    });
    await binding.stop();
    const report = item.report();
    assert.equal(report.state, 'complete');
    assert.equal(report.records[1].generatorCorrelation, 'pid-only-after-event');
    assert.equal(report.records[2].correlation, 'runner-interval-only');
    assert.doesNotMatch(JSON.stringify(report), /secret|MESSAGE|raw/);
  } finally {
    item.cleanup();
  }
});

test('contradictory OOM attribution cannot become successful evidence', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    item.send({
      kind: 'userspace-oom-report',
      daemon: 'systemd-oomd',
      daemonPid: 12,
      timestampNs: '124000',
      action: 'signal-attempt',
      correlation: 'pid-only',
      victimPid: 23,
      signal: 9,
    });
    await assert.rejects(binding.stop(), /incomplete/);
    assert.equal(item.report().state, 'incomplete');
  } finally {
    item.cleanup();
  }
});

test('publication and descriptor release wait for the actual group retirement receipt', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  let acknowledge;
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    item.port.terminate = () =>
      new Promise((resolve) => {
        acknowledge = () => resolve(false);
      });
    const stopping = binding.stop();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(fs.readdirSync(item.root).length, 0);
    assert.equal(item.sessions.at(-1).released, false);
    acknowledge();
    await stopping;
    assert.equal(item.sessions.at(-1).released, true);
    assert.equal(item.report().state, 'complete');
  } finally {
    acknowledge?.();
    item.cleanup();
  }
});

test('denied descriptor capability rejects before allocating traces or admitting observation', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  const actions = [];
  item.port.control = async (_owned, action) => {
    actions.push(action);
    throw new Error('Descriptor permission denied');
  };
  try {
    await assert.rejects(startChromiumProcessObserver(item.options, item.port), /unavailable/);
    assert.equal(item.sessions.length, 1);
    assert.ok(actions.every((action) => action.signal === 0));
    assert.equal(fs.readdirSync(item.root).length, 0);
  } finally {
    item.cleanup();
  }
});

test('an unprotected foreign trace canary fails native admission before observation', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  const original = item.port.control;
  item.port.control = async (owned, action, budget) => {
    if ('trace' in action) return 'absent';
    return original(owned, action, budget);
  };
  try {
    await assert.rejects(startChromiumProcessObserver(item.options, item.port), /unavailable/);
    assert.equal(item.sessions.length, 2);
    assert.equal(fs.readdirSync(item.root).length, 0);
  } finally {
    item.cleanup();
  }
});

test('a foreign process descriptor must be denied while its separate canary remains alive', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  const original = item.port.control;
  let rejectionObserved = false;
  let survivorObserved = false;
  item.port.control = async (owned, action, budget) => {
    if (owned.lease.leaderProcReference.ownerFd !== owned.descriptor) {
      rejectionObserved = true;
      await assert.rejects(original(owned, action, budget), /Foreign pinned/);
      throw new Error('Foreign pinned descriptor denied');
    }
    if (
      rejectionObserved &&
      owned.lease.purpose === 'canary' &&
      action.signal === 0 &&
      !owned.ended
    )
      survivorObserved = true;
    return original(owned, action, budget);
  };
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    assert.equal(rejectionObserved, true);
    assert.equal(survivorObserved, true);
    assert.ok(item.sessions.slice(0, 2).every((owned) => owned.ended && owned.released));
    await binding.stop();
  } finally {
    item.cleanup();
  }
});

test('a failed leader-exit probe never admits observation and still closes the separate canary', async () => {
  const item = fixture([{ kind: 'ready', rootPid: 10 }]);
  const open = item.port.open;
  item.port.open = async (...args) => {
    const owned = await open(...args);
    if (args[1] === 'probe') owned.handle.completion = Promise.resolve({ code: 1, signal: null });
    return owned;
  };
  try {
    await assert.rejects(startChromiumProcessObserver(item.options, item.port), /unavailable/);
    assert.equal(item.sessions.length, 2);
    assert.equal(item.sessions[0].ended, true);
    assert.equal(item.sessions[0].released, true);
    assert.equal(fs.readdirSync(item.root).length, 0);
  } finally {
    item.cleanup();
  }
});

test('a missing acquisition receipt is unknown cleanup and never guessed disposal', async () => {
  const item = fixture([], 0, '', { omitAcquisition: true });
  const actions = [];
  const original = item.port.control;
  item.port.control = async (...args) => {
    actions.push(args[1]);
    return original(...args);
  };
  try {
    await assert.rejects(startChromiumProcessObserver(item.options, item.port), (error) => {
      assert.match(String(error.errors[0]?.errors[1]?.errors[0]), /acquisition receipt missing/);
      return true;
    });
    assert.ok(actions.every((action) => !('trace' in action)));
    assert.equal(item.sessions.length, 2);
  } finally {
    item.cleanup();
  }
});

test('readiness has one twenty-second budget and cleans up without admitting Cypress', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const item = fixture([]);
  try {
    const starting = startChromiumProcessObserver(item.options, item.port);
    await new Promise((resolve) => setImmediate(resolve));
    context.mock.timers.tick(20_000);
    await assert.rejects(starting, /unavailable/);
    assert.equal(item.report().state, 'unavailable');
    assert.equal(item.sessions.at(-1).released, true);
  } finally {
    item.cleanup();
  }
});

test('EOF has ten seconds before one bounded shared termination and remains incomplete', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const item = fixture([{ kind: 'ready', rootPid: 10 }], 0, '', { holdEOF: true });
  try {
    const binding = await startChromiumProcessObserver(item.options, item.port);
    let terminations = 0;
    const original = item.port.terminate;
    item.port.terminate = async (owned, budget) => {
      terminations++;
      assert.equal(budget.deadline, 21_000);
      return original(owned);
    };
    const stopping = binding.stop();
    context.mock.timers.tick(9999);
    await Promise.resolve();
    assert.equal(terminations, 0);
    assert.equal(fs.readdirSync(item.root).length, 0);
    context.mock.timers.tick(1);
    await assert.rejects(stopping, /incomplete/);
    assert.equal(terminations, 1);
    assert.equal(item.sessions.at(-1).released, true);
    assert.equal(item.report().state, 'incomplete');
  } finally {
    item.cleanup();
  }
});
