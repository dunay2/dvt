/** Owned concern: One owned capture lifecycle, exact cleanup and scoped environment restoration. */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fixture } = require('./helpers.cjs');
const {
  withChromiumNetworkDiagnostics,
} = require('../../apps/web/cypress/node/chromiumNetworkDiagnostics.ts');

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
