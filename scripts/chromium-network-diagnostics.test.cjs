/** Owned concern: prove opt-in capture ownership, export, rejection and exact raw-file cleanup. */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createChromiumNetworkDiagnostics,
  withChromiumNetworkDiagnostics: withObservedChromiumNetworkDiagnostics,
  configureChromiumNetworkDiagnostics,
} = require('../apps/web/cypress/node/chromiumNetworkDiagnostics.ts');

// This suite owns the capture lifecycle; the process observer has its own port tests.
const withChromiumNetworkDiagnostics = (root, operation) =>
  withObservedChromiumNetworkDiagnostics(root, operation, async () => null);

function fixture(enabled = true) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-test-'));
  return {
    projectRoot,
    binding: createChromiumNetworkDiagnostics({ enabled, workspaceRoot: projectRoot }),
  };
}

test('disabled diagnostics have no binding or filesystem effects', () => {
  const item = fixture(false);
  try {
    assert.equal(item.binding, null);
    assert.deepEqual(fs.readdirSync(item.projectRoot), []);
  } finally {
    fs.rmdirSync(item.projectRoot);
  }
});

test('plugin admission is explicit and disabled diagnostics register no hooks', async () => {
  const previous = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  const capture = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
  const noHook = () => assert.fail('must not register a launch hook');
  const config = {};
  try {
    delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    assert.equal(configureChromiumNetworkDiagnostics(noHook, config), config);
    process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = 'true';
    assert.throws(() => configureChromiumNetworkDiagnostics(noHook, config), /Invalid.*flag/);
    await assert.rejects(
      withChromiumNetworkDiagnostics('unused', async () => assert.fail('must not execute')),
      /Invalid.*flag/
    );
    process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
    delete process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
    assert.throws(
      () => configureChromiumNetworkDiagnostics(noHook, config),
      /Missing owned.*lease/
    );
  } finally {
    if (previous === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = previous;
    if (capture === undefined) delete process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
    else process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = capture;
  }
});

test('capture is scoped to Chromium and does not replace existing launch options', () => {
  const item = fixture();
  const options = { args: ['--existing'], preferences: {}, extensions: [], env: {} };
  try {
    assert.equal(item.binding.beforeBrowserLaunch({ family: 'firefox' }, options), options);
    assert.deepEqual(options.args, ['--existing']);
    assert.equal(item.binding.beforeBrowserLaunch({ family: 'chromium' }, options), options);
    assert.equal(options.args[0], '--existing');
    assert.equal(options.args[2], '--net-log-capture-mode=Default');
    assert.equal(options.args[3], '--enable-logging');
    const raw = options.args[1].slice('--log-net-log='.length);
    assert.equal(options.args[4], `--log-file=${path.join(path.dirname(raw), 'process.log')}`);
    assert.equal(path.basename(raw), 'netlog.json');
    assert.throws(() => item.binding.afterRun(), /Chromium network diagnostics failed/);
    assert.equal(fs.existsSync(path.dirname(raw)), false);
  } finally {
    fs.rmdirSync(item.projectRoot);
  }
});

test('exports projected evidence and removes only its own capture', () => {
  const item = fixture();
  const options = { args: [], preferences: {}, extensions: [], env: {} };
  const sentinel = path.join(item.projectRoot, 'keep.txt');
  fs.writeFileSync(sentinel, 'keep');
  item.binding.beforeBrowserLaunch({ family: 'chromium' }, options);
  const raw = options.args[0].slice('--log-net-log='.length);
  fs.writeFileSync(
    raw,
    JSON.stringify({
      constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
      events: [{ type: 1, source: { id: 3 }, params: { net_error: -2, body: 'private' } }],
    })
  );
  const processLog = path.join(path.dirname(raw), 'process.log');
  fs.writeFileSync(
    processLog,
    '[21:34:1017/093012.123456:ERROR:validation_errors.cc(125)] Invalid message: VALIDATION_ERROR_UNKNOWN_ENUM_VALUE (Authorization: Bearer private)\n'
  );
  try {
    item.binding.afterRun();
    assert.equal(fs.existsSync(raw), false);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
    const evidence = path.join(item.projectRoot, '.dvt/evidence/chromium-network');
    const report = fs.readFileSync(path.join(evidence, fs.readdirSync(evidence)[0]), 'utf8');
    assert.doesNotMatch(report, /private|body/);
    assert.equal(JSON.parse(report).events[0].netError, -2);
    assert.deepEqual(JSON.parse(report).processLog.validationErrors, [
      {
        processId: 21,
        threadId: 34,
        time: '1017/093012.123456',
        code: 'VALIDATION_ERROR_UNKNOWN_ENUM_VALUE',
      },
    ]);
    assert.equal(fs.existsSync(processLog), false);
  } finally {
    assert.ok(path.resolve(item.projectRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(item.projectRoot, { recursive: true });
  }
});

test('malformed capture remains a failure and its raw file is removed', () => {
  const item = fixture();
  const options = { args: [], preferences: {}, extensions: [], env: {} };
  item.binding.beforeBrowserLaunch({ family: 'chromium' }, options);
  const raw = options.args[0].slice('--log-net-log='.length);
  fs.writeFileSync(raw, 'private malformed');
  const processLog = path.join(path.dirname(raw), 'process.log');
  fs.writeFileSync(processLog, 'private process detail');
  fs.writeFileSync(path.join(path.dirname(raw), 'failure-1.json'), 'private observation');
  try {
    assert.throws(() => item.binding.afterRun(), /^Error: Chromium network diagnostics failed$/);
    assert.equal(fs.existsSync(raw), false);
    assert.equal(fs.existsSync(processLog), false);
    assert.equal(fs.existsSync(item.binding.directory), false);
  } finally {
    fs.rmdirSync(item.projectRoot);
  }
});

for (const scenario of [
  'success',
  'operation-failure',
  'observer-unavailable',
  'observer-stop-failure',
  'both-fail',
]) {
  test(`native completion finalizes and restores scoped environment: ${scenario}`, async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-parent-test-'));
    const previousFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    const previousCapture = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
    process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
    process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = 'outer-owned-context';
    let directory;
    const operationError = new Error('Operation failed');
    const observerError = new Error('Observer failed');
    const events = [];
    try {
      const result = withObservedChromiumNetworkDiagnostics(
        workspaceRoot,
        async () => {
          events.push('operation');
          assert.notEqual(directory, 'outer-owned-context');
          const browser = fs.mkdtempSync(path.join(directory, 'chrome-'));
          fs.writeFileSync(
            path.join(browser, 'netlog.json'),
            JSON.stringify({
              constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
              events: [{ type: 1, source: { id: 3 }, params: { net_error: -2 } }],
            })
          );
          assert.equal(fs.existsSync(browser), true);
          if (scenario === 'operation-failure' || scenario === 'both-fail') throw operationError;
          return 'completed';
        },
        async ({ captureRoot }) => {
          directory = captureRoot;
          events.push('start');
          if (scenario === 'observer-unavailable') throw observerError;
          return {
            async stop() {
              events.push('stop');
              if (scenario === 'observer-stop-failure' || scenario === 'both-fail')
                throw observerError;
            },
          };
        }
      );
      if (scenario === 'success') assert.equal(await result, 'completed');
      else
        await assert.rejects(result, (error) => {
          if (scenario === 'both-fail')
            return (
              error instanceof AggregateError &&
              error.errors.length === 2 &&
              error.errors[0] === operationError &&
              error.errors[1] === observerError
            );
          if (scenario === 'observer-unavailable')
            return (
              error instanceof AggregateError &&
              error.errors.length === 2 &&
              error.errors[0] === observerError &&
              error.errors[1].message === 'Chromium network diagnostics failed'
            );
          return error === (scenario === 'operation-failure' ? operationError : observerError);
        });
      assert.deepEqual(
        events,
        scenario === 'observer-unavailable' ? ['start'] : ['start', 'operation', 'stop']
      );
      assert.equal(fs.existsSync(directory), false);
      assert.equal(process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT, 'outer-owned-context');
    } finally {
      if (previousFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
      else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = previousFlag;
      if (previousCapture === undefined) delete process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
      else process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = previousCapture;
      assert.ok(path.resolve(workspaceRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
      fs.rmSync(workspaceRoot, { recursive: true });
    }
  });
}

test('failed-spec snapshot survives raw overwrite without snapshotting successful or interactive specs', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-snapshot-test-'));
  const previousFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
  const evidence = path.join(workspaceRoot, '.dvt/evidence/chromium-network');
  const spec = { relative: 'cypress/e2e/canvas/example.cy.ts' };
  try {
    await withChromiumNetworkDiagnostics(workspaceRoot, async () => {
      const hooks = new Map();
      configureChromiumNetworkDiagnostics((event, handler) => hooks.set(event, handler), {
        projectRoot: path.join(workspaceRoot, 'apps/web'),
      });
      const launch = hooks.get('before:browser:launch')({ family: 'chromium' }, { args: [] });
      const raw = launch.args[0].slice('--log-net-log='.length);
      const afterSpec = hooks.get('after:spec');
      assert.equal(typeof afterSpec, 'function');
      afterSpec(spec, undefined);
      afterSpec(spec, { stats: { failures: 0 } });
      assert.equal(fs.existsSync(evidence), false);
      const failed = { stats: { failures: 1 }, error: 'private failure' };
      assert.throws(() => afterSpec(spec, failed), /^Error: Chromium network snapshot failed$/);
      fs.writeFileSync(raw, 'private malformed capture');
      assert.throws(() => afterSpec(spec, failed), /^Error: Chromium network snapshot failed$/);
      const capture = {
        constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
        events: [{ type: 1, source: { id: 3 }, params: { headers: ['private'], body: 'private' } }],
      };
      fs.writeFileSync(raw, JSON.stringify(capture));
      assert.throws(
        () => afterSpec({ relative: '../private' }, failed),
        /^Error: Chromium network snapshot failed$/
      );
      afterSpec(spec, failed);
      assert.equal(fs.existsSync(raw), true);
      assert.equal(fs.existsSync(evidence), false, 'open writer observations stay private');
      capture.events[0].source.id = 9;
      fs.writeFileSync(raw, JSON.stringify(capture));
    });
    const reports = fs.readdirSync(evidence);
    assert.equal(reports.length, 2);
    const read = (name) => JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8'));
    const snapshot = read(reports.find((name) => name.includes('-failure-')));
    const final = read(reports.find((name) => !name.includes('-failure-')));
    assert.equal(snapshot.spec, spec.relative);
    assert.ok(Number.isFinite(Date.parse(snapshot.observedAt)));
    assert.equal(snapshot.events[0].sourceId, 3);
    assert.equal(snapshot.continuity, 'replaced');
    assert.equal(snapshot.observationBoundary, 'after:spec');
    assert.equal(final.events[0].sourceId, 9);
    assert.doesNotMatch(JSON.stringify(snapshot), /private|error|headers|body/);
  } finally {
    if (previousFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = previousFlag;
    assert.ok(path.resolve(workspaceRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(workspaceRoot, { recursive: true });
  }
});

test('failed specs bind only to the current Chromium launch, never earlier captures', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-launch-test-'));
  const previousFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
  try {
    await withChromiumNetworkDiagnostics(workspaceRoot, async () => {
      const hooks = new Map();
      configureChromiumNetworkDiagnostics((event, handler) => hooks.set(event, handler), {});
      const failed = { stats: { failures: 1 } };
      const afterSpec = hooks.get('after:spec');
      assert.throws(
        () => afterSpec({ relative: 'cypress/e2e/first.cy.ts' }, failed),
        /snapshot failed/
      );
      for (const [id, spec] of [
        [3, 'first'],
        [9, 'second'],
      ]) {
        const launch = hooks.get('before:browser:launch')({ family: 'chromium' }, { args: [] });
        fs.writeFileSync(
          launch.args[0].slice('--log-net-log='.length),
          JSON.stringify({
            constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
            events: [{ type: 1, source: { id } }],
          })
        );
        afterSpec({ relative: `cypress/e2e/${spec}.cy.ts` }, failed);
      }
      hooks.get('before:browser:launch')({ family: 'firefox' }, { args: [] });
      assert.throws(
        () => afterSpec({ relative: 'cypress/e2e/third.cy.ts' }, failed),
        /snapshot failed/
      );
    });
    const evidence = path.join(workspaceRoot, '.dvt/evidence/chromium-network');
    const reports = fs
      .readdirSync(evidence)
      .filter((name) => name.includes('-failure-'))
      .map((name) => JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8')));
    assert.deepEqual(reports.map((report) => [report.spec, report.events[0].sourceId]).sort(), [
      ['cypress/e2e/first.cy.ts', 3],
      ['cypress/e2e/second.cy.ts', 9],
    ]);
  } finally {
    if (previousFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = previousFlag;
    assert.ok(path.resolve(workspaceRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(workspaceRoot, { recursive: true });
  }
});

for (const closed of [true, false])
  test(`native completion includes delayed records (closed document: ${closed})`, async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-delayed-test-'));
    const previousFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
    const evidence = path.join(workspaceRoot, '.dvt/evidence/chromium-network');
    let directory;
    let finishWriter;
    const writer = new Promise((resolve) => {
      finishWriter = resolve;
    });
    let observed;
    const observation = new Promise((resolve) => {
      observed = resolve;
    });
    try {
      const completion = withChromiumNetworkDiagnostics(workspaceRoot, async () => {
        directory = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
        const hooks = new Map();
        configureChromiumNetworkDiagnostics((event, handler) => hooks.set(event, handler), {
          projectRoot: path.join(workspaceRoot, 'apps/web'),
        });
        const launch = hooks.get('before:browser:launch')({ family: 'chromium' }, { args: [] });
        const raw = launch.args[0].slice('--log-net-log='.length);
        fs.writeFileSync(
          raw,
          '{"constants":{"logEventTypes":{"URL_REQUEST_START_JOB":1}},"events":[{"type":1,"source":{"id":3}}'
        );
        hooks.get('after:spec')(
          { relative: 'cypress/e2e/canvas/example.cy.ts' },
          { stats: { failures: 1 } }
        );
        observed();
        await writer;
        fs.appendFileSync(
          raw,
          ',{"type":1,"source":{"id":9},"params":{"net_error":-2,"body":"private"}}' +
            (closed ? ']}' : '')
        );
        return 'failed browser result';
      });
      await observation;
      const prematurelyPublished = fs.existsSync(evidence);
      finishWriter();
      assert.equal(await completion, 'failed browser result');
      assert.equal(prematurelyPublished, false);
      const name = fs.readdirSync(evidence).find((file) => file.includes('-failure-'));
      const report = JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8'));
      assert.deepEqual(
        report.events.map((event) => event.sourceId),
        [3, 9]
      );
      assert.equal(report.continuity, 'retained');
      assert.equal(report.observationBoundary, 'native-completion');
      assert.equal(report.captureState, closed ? 'complete' : 'terminated');
      assert.equal(fs.existsSync(directory), false);
      assert.doesNotMatch(JSON.stringify(report), /private|body/);
    } finally {
      finishWriter();
      if (previousFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
      else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = previousFlag;
      assert.ok(path.resolve(workspaceRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
      fs.rmSync(workspaceRoot, { recursive: true });
    }
  });
