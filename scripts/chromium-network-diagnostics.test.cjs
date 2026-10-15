/** Owned concern: prove opt-in capture ownership, export, rejection and exact raw-file cleanup. */
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
    const raw = options.args[1].slice('--log-net-log='.length);
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
  try {
    item.binding.afterRun();
    assert.equal(fs.existsSync(raw), false);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
    const evidence = path.join(item.projectRoot, '.dvt/evidence/chromium-network');
    const report = fs.readFileSync(path.join(evidence, fs.readdirSync(evidence)[0]), 'utf8');
    assert.doesNotMatch(report, /private|body/);
    assert.equal(JSON.parse(report).events[0].netError, -2);
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
  try {
    assert.throws(() => item.binding.afterRun(), /^Error: Chromium network diagnostics failed$/);
    assert.equal(fs.existsSync(raw), false);
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
    const result = await withChromiumNetworkDiagnostics(workspaceRoot, async () => {
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
    });
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
