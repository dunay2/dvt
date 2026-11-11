/**
 * Owned concern: prove opt-in capture ownership, export, rejection and exact raw-file cleanup.
 * Why: passing assertions must not conceal completion failure or disclose private diagnostics.
 * Corner: unknown exceptions and hostile getters stay private while cleanup remains exact.
 */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createChromiumNetworkDiagnostics,
  withChromiumNetworkDiagnostics,
  configureChromiumNetworkDiagnostics,
} = require('../apps/web/cypress/node/chromiumNetworkDiagnostics.ts');
const {
  ChromiumDiagnosticsError,
  classifyChromiumFailure,
  finalizeChromiumCapture,
  publishChromiumLifecycleFailures,
} = require('../apps/web/cypress/node/chromiumNetworkEvidence.ts');
const {
  ChromiumProjectionError,
} = require('../apps/web/cypress/node/chromiumNetworkProjection.ts');
const cypressConfig = require('../apps/web/cypress.config.ts').default;

test('desktop launch profile preserves unrelated flags and leaves other browser families alone', () => {
  // Linux headless device defaults must not silently select the touch-only presentation branch.
  const hooks = new Map();
  cypressConfig.e2e.setupNodeEvents((event, handler) => hooks.set(event, handler), {});
  const launch = {
    args: [
      '--existing',
      '--blink-settings=foo=true,primaryPointerType=2',
      '--blink-settings=bar=false',
    ],
  };
  const prepare = hooks.get('before:browser:launch');
  assert.equal(typeof prepare, 'function');
  assert.equal(prepare({ family: 'firefox' }, launch), launch);
  assert.equal(launch.args.length, 3);
  assert.equal(prepare({ family: 'chromium' }, launch), launch);
  assert.ok(launch.args.includes('--existing'));
  const settings = launch.args.filter((argument) => argument.startsWith('--blink-settings='));
  assert.equal(settings.length, 1);
  assert.deepEqual(
    Object.fromEntries(
      settings[0]
        .slice('--blink-settings='.length)
        .split(',')
        .map((setting) => setting.split('='))
    ),
    {
      foo: 'true',
      bar: 'false',
      primaryHoverType: '2',
      availableHoverTypes: '2',
      primaryPointerType: '4',
      availablePointerTypes: '4',
    }
  );
  prepare({ family: 'chromium' }, launch);
  assert.equal(launch.args.length, 2, 'launch composition is idempotent');
});

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
      withChromiumNetworkDiagnostics(
        'unused',
        async () => assert.fail('must not execute'),
        async () => null
      ),
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

test('native completion owns finalization and restores scoped process environment', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-parent-test-'));
  const previousFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  const previousCapture = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
  process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
  process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = 'outer-owned-context';
  let directory;
  try {
    const result = await withChromiumNetworkDiagnostics(
      workspaceRoot,
      async () => {
        directory = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
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
        return 'completed';
      },
      async () => null
    );
    assert.equal(result, 'completed');
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

test('failed-spec snapshot survives raw overwrite without snapshotting successful or interactive specs', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-snapshot-test-'));
  const previousFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
  const evidence = path.join(workspaceRoot, '.dvt/evidence/chromium-network');
  const spec = { relative: 'cypress/e2e/canvas/example.cy.ts' };
  try {
    await withChromiumNetworkDiagnostics(
      workspaceRoot,
      async () => {
        const hooks = new Map();
        cypressConfig.e2e.setupNodeEvents(
          (event, handler) => {
            assert.equal(hooks.has(event), false, 'profile and capture share one launch hook');
            hooks.set(event, handler);
          },
          { projectRoot: path.join(workspaceRoot, 'apps/web') }
        );
        const launch = hooks.get('before:browser:launch')({ family: 'chromium' }, { args: [] });
        assert.ok(launch.args.some((argument) => argument.includes('primaryPointerType=4')));
        const raw = launch.args
          .find((argument) => argument.startsWith('--log-net-log='))
          .slice('--log-net-log='.length);
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
          events: [
            { type: 1, source: { id: 3 }, params: { headers: ['private'], body: 'private' } },
          ],
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
      },
      async () => null
    );
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
    await withChromiumNetworkDiagnostics(
      workspaceRoot,
      async () => {
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
      },
      async () => null
    );
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
      const completion = withChromiumNetworkDiagnostics(
        workspaceRoot,
        async () => {
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
        },
        async () => null
      );
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

test('native publication waits for the actual observer retirement promise', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-retirement-order-test-'));
  const previousFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  const previousCapture = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
  process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
  process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = 'outer-owned-context';
  let releaseStop;
  let operationStarted;
  let stopStarted;
  let admitted = false;
  let settled = false;
  let captureRoot;
  const operationAcknowledgement = new Promise((resolve) => {
    operationStarted = resolve;
  });
  const stopAcknowledgement = new Promise((resolve) => {
    stopStarted = resolve;
  });
  const retirement = new Promise((resolve) => {
    releaseStop = resolve;
  });
  const completion = withChromiumNetworkDiagnostics(
    workspaceRoot,
    async () => {
      captureRoot = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
      const capture = fs.mkdtempSync(path.join(captureRoot, 'chrome-'));
      fs.writeFileSync(
        path.join(capture, 'netlog.json'),
        JSON.stringify({
          constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
          events: [{ type: 1, source: { id: 3 } }],
        })
      );
      operationStarted();
      return 'completed';
    },
    async () => {
      admitted = true;
      return {
        stop: async () => {
          stopStarted();
          await retirement;
        },
      };
    }
  );
  void completion.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    }
  );
  try {
    await operationAcknowledgement;
    assert.equal(admitted, true);
    await Promise.race([
      stopAcknowledgement,
      completion.then(() => assert.fail('native completion bypassed observer retirement')),
    ]);
    assert.equal(settled, false);
    assert.equal(fs.existsSync(captureRoot), true);
    assert.equal(fs.existsSync(path.join(workspaceRoot, '.dvt/evidence/chromium-network')), false);
    releaseStop();
    assert.equal(await completion, 'completed');
    assert.equal(fs.existsSync(captureRoot), false);
    assert.equal(process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT, 'outer-owned-context');
  } finally {
    releaseStop();
    await completion.catch(() => undefined);
    if (previousFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = previousFlag;
    if (previousCapture === undefined) delete process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
    else process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = previousCapture;
    assert.ok(path.resolve(workspaceRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(workspaceRoot, { recursive: true });
  }
});

for (const scenario of ['denied', 'ready-and-stop', 'operation-and-stop-fail']) {
  test('Linux observer admission boundary: ' + scenario, async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-observer-admission-test-'));
    const oldFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    const oldCapture = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
    process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
    process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = 'outer-owned-context';
    const calls = [];
    let ownedRoot;
    let failure;
    try {
      try {
        const result = await withChromiumNetworkDiagnostics(
          workspaceRoot,
          async () => {
            calls.push('operation');
            ownedRoot = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
            const capture = fs.mkdtempSync(path.join(ownedRoot, 'chrome-'));
            fs.writeFileSync(
              path.join(capture, 'netlog.json'),
              JSON.stringify({
                constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
                events: [{ type: 1, source: { id: 3 }, params: { net_error: -2 } }],
              })
            );
            if (scenario === 'operation-and-stop-fail') throw new Error('owned operation failed');
            return 'completed';
          },
          async (options) => {
            calls.push('admit');
            ownedRoot = options.captureRoot;
            assert.equal(options.workspaceRoot, workspaceRoot);
            assert.equal(process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT, ownedRoot);
            if (scenario === 'denied') throw new Error('owned capability denied');
            return {
              async stop() {
                calls.push('stop');
                assert.equal(fs.existsSync(ownedRoot), true);
                assert.equal(
                  fs.existsSync(path.join(workspaceRoot, '.dvt/evidence/chromium-network')),
                  false
                );
                if (scenario === 'operation-and-stop-fail')
                  throw new Error('owned observer stop failed');
              },
            };
          }
        );
        assert.equal(result, 'completed');
      } catch (error) {
        failure = error;
      }
      assert.equal(calls[0], 'admit', 'observer capability must admit before browser operation');
      assert.equal(process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT, 'outer-owned-context');
      if (scenario === 'denied') {
        assert.deepEqual(calls, ['admit']);
        const errors = failure instanceof AggregateError ? failure.errors : [failure];
        assert.ok(errors.some((error) => error?.message === 'owned capability denied'));
      } else {
        assert.deepEqual(calls, ['admit', 'operation', 'stop']);
        if (scenario === 'operation-and-stop-fail') {
          assert.ok(failure instanceof AggregateError);
          assert.deepEqual(
            failure.errors.map((error) => error.message),
            ['owned operation failed', 'owned observer stop failed']
          );
        } else assert.equal(failure, undefined);
      }
      assert.equal(fs.existsSync(ownedRoot), false);
    } finally {
      if (oldFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
      else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = oldFlag;
      if (oldCapture === undefined) delete process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
      else process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = oldCapture;
      assert.ok(path.resolve(workspaceRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
      fs.rmSync(workspaceRoot, { recursive: true });
    }
  });
}

for (const [scenario, failures] of [
  ['malformed', [{ phase: 'capture-projection', code: 'failed', detail: 'captureSyntax' }]],
  ['log-shape', [{ phase: 'capture-projection', code: 'failed', detail: 'logShape' }]],
  ['event-shape', [{ phase: 'capture-projection', code: 'failed', detail: 'eventShape' }]],
  ['missing', [{ phase: 'capture-read', code: 'missing' }]],
  ['stop-rejection', [{ phase: 'observer-stop', code: 'failed' }]],
  [
    'combined',
    [
      { phase: 'native-operation', code: 'failed' },
      { phase: 'observer-stop', code: 'failed' },
      { phase: 'capture-projection', code: 'failed', detail: 'captureSyntax' },
    ],
  ],
]) {
  test(`failed native completion retains only safe lifecycle evidence: ${scenario}`, async () => {
    const { projectRoot } = fixture(false);
    const oldFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    const oldCapture = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
    process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
    process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = 'outer-owned-context';
    const privateDetail = 'https://private.example/?api_key=secret-token private-output';
    let ownedRoot;
    let completed = false;
    try {
      await assert.rejects(
        withChromiumNetworkDiagnostics(
          projectRoot,
          async () => {
            ownedRoot = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
            const capture = fs.mkdtempSync(path.join(ownedRoot, 'chrome-'));
            fs.writeFileSync(path.join(capture, 'process.log'), privateDetail);
            if (scenario !== 'missing') {
              fs.writeFileSync(
                path.join(capture, 'netlog.json'),
                scenario === 'malformed' || scenario === 'combined'
                  ? privateDetail
                  : JSON.stringify({
                      constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
                      events:
                        scenario === 'log-shape'
                          ? []
                          : [
                              {
                                type: 1,
                                source: { id: scenario === 'event-shape' ? privateDetail : 3 },
                                params: { body: privateDetail },
                              },
                            ],
                    })
              );
            }
            completed = true;
            if (scenario === 'combined') {
              throw Object.defineProperty(new Error(privateDetail), 'code', {
                get: () => assert.fail('private error getters must never execute'),
              });
            }
            return { output: privateDetail };
          },
          async () => ({
            async stop() {
              if (scenario === 'stop-rejection' || scenario === 'combined') {
                throw Object.assign(new Error(privateDetail), {
                  code: 'PRIVATE_CODE',
                  cause: { apiKey: privateDetail },
                });
              }
            },
          })
        )
      );
      assert.equal(completed, true);
      assert.equal(fs.existsSync(ownedRoot), false);
      assert.equal(process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT, 'outer-owned-context');
      const evidence = path.join(projectRoot, '.dvt/evidence/chromium-network');
      const receipts = fs.readdirSync(evidence).filter((name) => name.startsWith('lifecycle-'));
      assert.equal(receipts.length, 1);
      assert.match(receipts[0], /^lifecycle-[0-9a-f-]{36}\.json$/u);
      const text = fs.readFileSync(path.join(evidence, receipts[0]), 'utf8');
      assert.deepEqual(JSON.parse(text), { schemaVersion: 1, failures });
      assert.doesNotMatch(text, /private|apiKey|api_key|secret-token|output|stack|cause/iu);
    } finally {
      if (oldFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
      else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = oldFlag;
      if (oldCapture === undefined) delete process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
      else process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = oldCapture;
      assert.ok(path.resolve(projectRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
      fs.rmSync(projectRoot, { recursive: true });
    }
  });
}

test('capture projection and cleanup failures both survive while other owned files are removed', (t) => {
  const { projectRoot } = fixture(false);
  const capture = fs.mkdtempSync(path.join(projectRoot, 'chrome-'));
  const raw = path.join(capture, 'netlog.json');
  const processLog = path.join(capture, 'process.log');
  fs.writeFileSync(raw, 'private malformed capture');
  fs.writeFileSync(processLog, 'private process output');
  const unlink = fs.unlinkSync;
  t.mock.method(fs, 'unlinkSync', (file) => {
    if (file === raw) throw Object.assign(new Error('private denied path'), { code: 'EACCES' });
    return unlink(file);
  });
  try {
    assert.throws(
      () => finalizeChromiumCapture(capture, projectRoot),
      (error) => {
        assert.ok(error instanceof ChromiumDiagnosticsError);
        assert.deepEqual(error.failures[0], {
          phase: 'capture-projection',
          code: 'failed',
          detail: 'captureSyntax',
        });
        assert.ok(
          error.failures.some(({ phase, code }) => phase === 'capture-cleanup' && code === 'denied')
        );
        assert.doesNotMatch(JSON.stringify(error.failures), /private|path|output/iu);
        return true;
      }
    );
    assert.equal(fs.existsSync(processLog), false, 'one failed removal must not skip another file');
    assert.equal(fs.existsSync(raw), true);
  } finally {
    t.mock.restoreAll();
    assert.ok(path.resolve(projectRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(projectRoot, { recursive: true });
  }
});

test('receipt publication failure retains the original rejection after private capture cleanup', async () => {
  const { projectRoot } = fixture(false);
  const oldFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  const oldCapture = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
  process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
  const obstruction = path.join(projectRoot, '.dvt');
  fs.writeFileSync(obstruction, 'unrelated sentinel');
  const original = new Error('private native failure with secret-token');
  let ownedRoot;
  try {
    await assert.rejects(
      withChromiumNetworkDiagnostics(
        projectRoot,
        async () => {
          ownedRoot = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
          const capture = fs.mkdtempSync(path.join(ownedRoot, 'chrome-'));
          fs.writeFileSync(
            path.join(capture, 'netlog.json'),
            JSON.stringify({
              constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
              events: [{ type: 1, source: { id: 3 } }],
            })
          );
          throw original;
        },
        async () => null
      ),
      (error) => {
        assert.ok(error instanceof AggregateError);
        assert.equal(
          error.errors[0],
          original,
          'publication must not replace the original failure'
        );
        const later = error.errors.slice(1);
        assert.equal(later.length, 2, 'both capture and receipt publication failed');
        for (const failure of later) {
          assert.ok(failure instanceof ChromiumDiagnosticsError);
          assert.deepEqual(failure.failures, [{ phase: 'capture-publication', code: 'failed' }]);
        }
        return true;
      }
    );
    assert.equal(fs.existsSync(ownedRoot), false);
    assert.equal(process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT, oldCapture);
    assert.equal(fs.readFileSync(obstruction, 'utf8'), 'unrelated sentinel');
  } finally {
    if (oldFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = oldFlag;
    assert.ok(path.resolve(projectRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(projectRoot, { recursive: true });
  }
});

test('lifecycle publication bounds records and reconstructs only validated phase and code', () => {
  const { projectRoot } = fixture(false);
  const evidence = path.join(projectRoot, '.dvt/evidence/chromium-network');
  const failure = {
    phase: 'capture-read',
    code: 'missing',
    token: 'private',
    url: 'https://private.example',
  };
  try {
    publishChromiumLifecycleFailures(
      projectRoot,
      Array.from({ length: 17 }, () => failure)
    );
    const receipts = fs.readdirSync(evidence);
    assert.equal(receipts.length, 1);
    const text = fs.readFileSync(path.join(evidence, receipts[0]), 'utf8');
    assert.deepEqual(JSON.parse(text), {
      schemaVersion: 1,
      failures: Array.from({ length: 16 }, () => ({ phase: 'capture-read', code: 'missing' })),
    });
    assert.doesNotMatch(text, /private|token|url/iu);
    for (const invalid of [
      { phase: 'private unknown phase', code: 'failed' },
      { phase: 'capture-read', code: 'private unknown reason' },
      { phase: 'capture-projection', code: 'failed', detail: 'https://private.invalid/secret' },
      { phase: 'capture-read', code: 'failed', detail: 'RangeError' },
      Object.defineProperty({ phase: 'capture-projection', code: 'failed' }, 'detail', {
        get: () => assert.fail('publication must not invoke a detail getter'),
      }),
      Object.defineProperty({ code: 'failed' }, 'phase', {
        get: () => assert.fail('publication must not invoke a phase getter'),
      }),
      Object.defineProperty({ phase: 'capture-projection' }, 'code', {
        get: () => assert.fail('publication must not invoke a code getter'),
      }),
    ]) {
      assert.throws(
        () => publishChromiumLifecycleFailures(projectRoot, [invalid]),
        /Invalid Chromium lifecycle failure/
      );
    }
    assert.deepEqual(
      fs.readdirSync(evidence),
      receipts,
      'invalid classifications must not publish'
    );
  } finally {
    assert.ok(path.resolve(projectRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(projectRoot, { recursive: true });
  }
});

test('projection exception detail observes only finite classes and never private getters', () => {
  const { projectRoot } = fixture(false);
  const privateDetail = 'https://private.invalid/?token=secret raw exception';
  const failures = [];
  try {
    for (const [detail, error] of [
      ['RangeError', new RangeError(privateDetail)],
      ['TypeError', new TypeError(privateDetail)],
      ['SyntaxError', new SyntaxError(privateDetail)],
      ['ReferenceError', new ReferenceError(privateDetail)],
      ['URIError', new URIError(privateDetail)],
      ['EvalError', new EvalError(privateDetail)],
      ['AggregateError', new AggregateError([], privateDetail)],
      ['Error', new Error(privateDetail)],
      ['Error', new ChromiumProjectionError('captureSyntax')],
      ['unknown', {}],
      ['unknown', privateDetail],
      ['unknown', null],
    ]) {
      if (error !== null && typeof error === 'object') {
        for (const key of ['name', 'message', 'stack', 'cause', 'code', 'reason', 'detail']) {
          Object.defineProperty(error, key, {
            get: () => assert.fail(`classification must not invoke ${key}`),
          });
        }
      }
      const code = error instanceof SyntaxError ? 'invalid' : 'failed';
      const classified = classifyChromiumFailure('capture-projection', error);
      assert.deepEqual(classified, [{ phase: 'capture-projection', code, detail }]);
      assert.deepEqual(classifyChromiumFailure('native-operation', error), [
        { phase: 'native-operation', code },
      ]);
      failures.push(...classified);
    }
    publishChromiumLifecycleFailures(projectRoot, failures);
    const evidence = path.join(projectRoot, '.dvt/evidence/chromium-network');
    const receipts = fs.readdirSync(evidence);
    assert.equal(receipts.length, 1);
    const text = fs.readFileSync(path.join(evidence, receipts[0]), 'utf8');
    assert.deepEqual(JSON.parse(text), { schemaVersion: 1, failures });
    assert.doesNotMatch(text, /private|secret|token|https|message|stack|cause/iu);
  } finally {
    assert.ok(path.resolve(projectRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(projectRoot, { recursive: true });
  }
});

test('an inherent projection exception retains its class and the same exact cleanup', async (t) => {
  const { projectRoot } = fixture(false);
  const oldFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  const privateDetail = 'private process log https://private.invalid/?token=secret';
  const sentinel = path.join(projectRoot, 'keep.txt');
  fs.writeFileSync(sentinel, 'unrelated sentinel');
  const originalSplit = String.prototype.split;
  t.mock.method(String.prototype, 'split', function (separator, limit) {
    'use strict';
    if (this === privateDetail) throw new RangeError(privateDetail);
    return Reflect.apply(originalSplit, this, [separator, limit]);
  });
  let ownedRoot;
  process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
  try {
    await assert.rejects(
      withChromiumNetworkDiagnostics(
        projectRoot,
        async () => {
          ownedRoot = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
          const capture = fs.mkdtempSync(path.join(ownedRoot, 'chrome-'));
          fs.writeFileSync(
            path.join(capture, 'netlog.json'),
            JSON.stringify({
              constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
              events: [{ type: 1, source: { id: 3 } }],
            })
          );
          fs.writeFileSync(path.join(capture, 'process.log'), privateDetail);
          return { passed: true };
        },
        async () => null
      ),
      (error) => {
        assert.ok(error instanceof ChromiumDiagnosticsError);
        assert.deepEqual(error.failures, [
          { phase: 'capture-projection', code: 'failed', detail: 'RangeError' },
        ]);
        return true;
      }
    );
    assert.equal(fs.existsSync(ownedRoot), false);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'unrelated sentinel');
    const evidence = path.join(projectRoot, '.dvt/evidence/chromium-network');
    const receipts = fs.readdirSync(evidence);
    assert.equal(receipts.length, 1, 'no network report may publish after projection fails');
    const text = fs.readFileSync(path.join(evidence, receipts[0]), 'utf8');
    assert.deepEqual(JSON.parse(text), {
      schemaVersion: 1,
      failures: [{ phase: 'capture-projection', code: 'failed', detail: 'RangeError' }],
    });
    assert.doesNotMatch(text, /private|secret|token|https|message|stack|cause/iu);
  } finally {
    t.mock.restoreAll();
    if (oldFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = oldFlag;
    assert.ok(path.resolve(projectRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(projectRoot, { recursive: true });
  }
});

test('unknown capture entries remain untouched while valid owned captures are finalized', () => {
  const { projectRoot, binding } = fixture();
  const launch = binding.beforeBrowserLaunch({ family: 'chromium' }, { args: [] });
  const raw = launch.args[0].slice('--log-net-log='.length);
  const sentinel = path.join(binding.directory, 'unrelated.txt');
  fs.writeFileSync(sentinel, 'keep unrelated content');
  fs.writeFileSync(
    raw,
    JSON.stringify({
      constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
      events: [{ type: 1, source: { id: 3 }, params: { body: 'private capture content' } }],
    })
  );
  try {
    assert.throws(
      () => binding.afterRun(),
      (error) => {
        assert.ok(error instanceof ChromiumDiagnosticsError);
        assert.ok(
          error.failures.some(
            ({ phase, code }) => phase === 'capture-enumeration' && code === 'invalid'
          )
        );
        return true;
      }
    );
    assert.equal(fs.existsSync(path.dirname(raw)), false);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep unrelated content');
    const evidence = path.join(projectRoot, '.dvt/evidence/chromium-network');
    const reports = fs.readdirSync(evidence);
    assert.equal(reports.length, 1);
    const text = fs.readFileSync(path.join(evidence, reports[0]), 'utf8');
    const report = JSON.parse(text);
    assert.equal(report.captureState, 'complete');
    assert.equal(report.observationBoundary, 'native-completion');
    assert.equal(report.events[0].sourceId, 3);
    assert.doesNotMatch(text, /private capture content|body/iu);
  } finally {
    fs.unlinkSync(sentinel);
    fs.rmdirSync(binding.directory);
    assert.ok(path.resolve(projectRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(projectRoot, { recursive: true });
  }
});
