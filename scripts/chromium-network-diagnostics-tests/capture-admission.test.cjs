/** Owned concern: Explicit opt-in/plugin and Chromium capture admission without unrelated hook or option mutation. */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('./helpers.cjs');
const {
  withChromiumNetworkDiagnostics,
  configureChromiumNetworkDiagnostics,
} = require('../../apps/web/cypress/node/chromiumNetworkDiagnostics.ts');

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
