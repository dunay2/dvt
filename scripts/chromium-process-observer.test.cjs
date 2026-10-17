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

function fixture(startRecords, code = 0, tail = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-process-observer-test-'));
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  const send = (record) => child.stdout.write(`${JSON.stringify(record)}\n`);
  child.stdin.once('finish', () => {
    send({ kind: 'complete', incomplete: false });
    if (tail) child.stdout.write(tail);
    child.emit('close', code, null);
  });
  const port = {
    platform: 'linux',
    pid: 10,
    start(command, args, options) {
      assert.equal(command, 'sudo');
      assert.deepEqual(args.slice(0, 5), ['-n', '--', '/usr/bin/python3', '-I', '-B']);
      assert.deepEqual(options.env, { PATH: '/usr/bin:/bin' });
      assert.equal(options.shell, false);
      queueMicrotask(() => startRecords.forEach(send));
      return child;
    },
  };
  return {
    root,
    child,
    port,
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
