/** Owned concern: Preserve finite completion/cleanup failures and their coexisting evidence; local expected-failure constant. */
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
const {
  ChromiumDiagnosticsError,
  finalizeChromiumCapture,
} = require('../../apps/web/cypress/node/chromiumNetworkEvidence.ts');

const missingRootFailure = Object.freeze({
  phase: 'capture-projection',
  code: 'failed',
  detail: 'captureSyntax',
  syntaxReason: 'rootMissing',
});

for (const [scenario, failures] of [
  ['malformed', [missingRootFailure]],
  ['log-shape', [{ phase: 'capture-projection', code: 'failed', detail: 'logShape' }]],
  ['event-shape', [{ phase: 'capture-projection', code: 'failed', detail: 'eventShape' }]],
  ['missing', [{ phase: 'capture-read', code: 'missing' }]],
  ['stop-rejection', [{ phase: 'observer-stop', code: 'failed' }]],
  [
    'combined',
    [
      { phase: 'native-operation', code: 'failed' },
      { phase: 'observer-stop', code: 'failed' },
      missingRootFailure,
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
        assert.deepEqual(error.failures[0], missingRootFailure);
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
