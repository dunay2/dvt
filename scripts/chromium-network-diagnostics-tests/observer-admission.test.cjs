/** Owned concern: Observer capability acquisition/stop boundary across three scenarios; distinct from later projection/publication errors. */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  withChromiumNetworkDiagnostics,
} = require('../../apps/web/cypress/node/chromiumNetworkDiagnostics.ts');

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
