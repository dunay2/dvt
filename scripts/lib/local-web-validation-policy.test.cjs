/** Owned concern: retain host-specific proof while admitting ordinary push-readiness work. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFocusedChangedTestPlan } = require('./changed-test-selection.cjs');

const source = 'apps/web/src/app/views/CodeView.tsx';
function webArgs(files, options = {}) {
  return buildFocusedChangedTestPlan(files, { includeWeb: true, ...options }).find(
    (step) => step.id === 'test-web-changed'
  )?.args;
}

test('ordinary product readiness retains the same Web query and native-host admission phase', () => {
  for (const platform of ['win32', 'linux']) {
    for (const files of [[source], [source, 'docs/guides/pr-preflight-and-ci-triage.md']]) {
      assert.deepEqual(webArgs(files, { pushReadiness: true, platform }), [
        'test:web:changed',
        '--phase=push-readiness',
      ]);
      assert.deepEqual(
        webArgs([...files].reverse(), { pushReadiness: true, platform }),
        webArgs(files, { pushReadiness: true, platform })
      );
    }
  }
  assert.deepEqual(webArgs([source]), ['test:web:changed']);
  assert.deepEqual(webArgs([source], { iteration: true }), ['test:web:changed', '--phase=vitest']);
});

test('native, root and unclassified companions retain complete local execution', () => {
  for (const companion of [
    'tools/ci/run-web-cypress-native.mjs',
    'scripts/live-proof-process.cjs',
    'apps/web/cypress.config.ts',
    'apps/web/cypress/node/chromiumProcessObserver.ts',
    'apps/web/scripts/run-vitest-changed-suites.ts',
    'apps/web/package.json',
    'package.json',
    '.dependency-cruiser.cjs',
    'scripts/new-python.py',
    '.github/workflows/unclassified.yml',
  ]) {
    assert.deepEqual(
      webArgs([source, companion], { pushReadiness: true, platform: 'win32' }),
      ['test:web:changed'],
      companion
    );
  }
  for (const platform of ['darwin', 'freebsd']) {
    assert.deepEqual(webArgs([source], { pushReadiness: true, platform }), ['test:web:changed']);
  }
});

test('readiness does not acquire unrelated Web proof or change the existing hosted-only route', () => {
  assert.equal(
    webArgs(['docs/guides/pr-preflight-and-ci-triage.md'], { pushReadiness: true }),
    undefined
  );
  assert.deepEqual(webArgs(['.github/workflows/test.yml'], { pushReadiness: true }), [
    'test:web:changed',
    '--phase=vitest',
  ]);
});

test('a hosted adapter companion cannot conceal a native executor or cleanup obligation', () => {
  for (const native of [
    'scripts/lib/local-validation-executor.cjs',
    'scripts/live-proof-process.cjs',
  ]) {
    assert.deepEqual(webArgs(['.github/workflows/test.yml', native], { pushReadiness: true }), [
      'test:web:changed',
    ]);
  }
});
