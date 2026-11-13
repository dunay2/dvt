/** Owned concern: Publication waits for delayed records and the actual observer retirement promise. */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  withChromiumNetworkDiagnostics,
  configureChromiumNetworkDiagnostics,
} = require('../../apps/web/cypress/node/chromiumNetworkDiagnostics.ts');

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
