/** Owned concern: Bounded public lifecycle receipt, exact failure propagation and finite own syntax classification. */
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
  classifyChromiumFailure,
  publishChromiumLifecycleFailures,
} = require('../../apps/web/cypress/node/chromiumNetworkEvidence.ts');
const {
  ChromiumProjectionError,
} = require('../../apps/web/cypress/node/chromiumNetworkProjection.ts');

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
      {
        phase: 'capture-projection',
        code: 'failed',
        detail: 'captureSyntax',
        syntaxReason: 'private-token',
      },
      {
        phase: 'capture-projection',
        code: 'failed',
        detail: 'captureSyntax',
        syntaxReason: undefined,
      },
      { phase: 'capture-read', code: 'failed', syntaxReason: 'rootMissing' },
      {
        phase: 'capture-projection',
        code: 'failed',
        detail: 'RangeError',
        syntaxReason: 'rootMissing',
      },
      { phase: 'capture-projection', code: 'failed', syntaxReason: 'rootMissing' },
      Object.defineProperty(
        { phase: 'capture-projection', code: 'failed', detail: 'captureSyntax' },
        'syntaxReason',
        {
          get: () => assert.fail('publication must not invoke a syntax reason getter'),
        }
      ),
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

test('capture syntax classification publishes only a validated own condition', () => {
  const { projectRoot } = fixture(false);
  const base = { phase: 'capture-projection', code: 'failed', detail: 'captureSyntax' };
  try {
    const failures = ['rootMissing', 'suffixNotAdmitted'].map((syntaxReason) => {
      const error = new ChromiumProjectionError('captureSyntax', syntaxReason);
      const classified = classifyChromiumFailure('capture-projection', error);
      assert.deepEqual(classified, [{ ...base, syntaxReason }]);
      assert.deepEqual(classifyChromiumFailure('capture-read', error), [
        { phase: 'capture-read', code: 'failed' },
      ]);
      return classified[0];
    });
    for (const descriptor of [
      { value: 'https://private.invalid/?token=secret' },
      { get: () => assert.fail('classification must not invoke a syntax reason getter') },
    ]) {
      const error = new ChromiumProjectionError('captureSyntax');
      Object.defineProperty(error, 'syntaxReason', descriptor);
      assert.deepEqual(classifyChromiumFailure('capture-projection', error), [base]);
    }
    publishChromiumLifecycleFailures(projectRoot, failures);
    const evidence = path.join(projectRoot, '.dvt/evidence/chromium-network');
    const [receipt] = fs.readdirSync(evidence);
    const text = fs.readFileSync(path.join(evidence, receipt), 'utf8');
    assert.deepEqual(JSON.parse(text), { schemaVersion: 1, failures });
    assert.doesNotMatch(text, /private|secret|token|https|stack|cause/iu);
  } finally {
    assert.ok(path.resolve(projectRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(projectRoot, { recursive: true });
  }
});
