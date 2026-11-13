/** Owned concern: Private exception/property handling, inherent projection failure and protection of unknown unowned entries. */
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
        for (const key of [
          'name',
          'message',
          'stack',
          'cause',
          'code',
          'reason',
          'detail',
          'syntaxReason',
        ]) {
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
