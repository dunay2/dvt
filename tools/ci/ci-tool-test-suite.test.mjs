import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXECUTABLE_CI_TOOL_TESTS,
  assertCiToolTestPartition,
  buildCiToolTestList,
  discoverCiToolTests,
  findPackageBackedCiToolTests,
  parseCiToolTestMode,
  isToolingCryptoContractInput,
} from './ci-tool-test-suite.mjs';

test('tooling crypto inputs preserve the governed roots and normalize Git paths', () => {
  for (const source of [
    'scripts/new-helper.cjs',
    './tools/docs/check.ts',
    'tools\\ci\\check.mjs',
    'packages/@dvt/cli/src/new-helper.ts',
    'packages/@dvt/engine/test/contracts/run-golden-paths.hash.test.ts',
    'package.json',
    'packages/@dvt/cli/package.json',
  ]) {
    assert.equal(isToolingCryptoContractInput(source), true, source);
  }
  for (const source of [
    'scripts/readme.md',
    'tools/ci/policy.json',
    'tools-other/test.mjs',
    'packages/@dvt/crypto/src/sha256.ts',
    'apps/api/src/main.ts',
  ]) {
    assert.equal(isToolingCryptoContractInput(source), false, source);
  }
});

test('CI tool test partitions cover every discovered contract test exactly once', () => {
  const allTests = discoverCiToolTests();
  const staticTests = buildCiToolTestList('static', { tests: allTests });
  const executableTests = buildCiToolTestList('executable', { tests: allTests });

  assert.notEqual(staticTests.length, 0);
  assert.deepEqual(executableTests, EXECUTABLE_CI_TOOL_TESTS);
  assert.deepEqual(
    [...staticTests, ...executableTests].sort((left, right) => left.localeCompare(right)),
    allTests
  );
  assert.deepEqual(
    staticTests.filter((filePath) => executableTests.includes(filePath)),
    []
  );
});

test('CI tool static partition excludes tests that import package dependencies', () => {
  const allTests = discoverCiToolTests();
  const staticTests = buildCiToolTestList('static');
  const packageBackedTests = findPackageBackedCiToolTests({ tests: allTests });

  assert.notEqual(packageBackedTests.length, 0);
  assert.deepEqual(
    packageBackedTests.filter((filePath) => staticTests.includes(filePath)),
    []
  );
  assert.deepEqual(
    packageBackedTests.filter((filePath) => !EXECUTABLE_CI_TOOL_TESTS.includes(filePath)),
    []
  );
});

test('sync docs status policy runs in the executable CI tool partition', () => {
  assert.ok(EXECUTABLE_CI_TOOL_TESTS.includes('tools/ci/sync-docs-status-policy.test.mjs'));
});

test('native proof diagnostics retain the package-backed contract in the executable partition', () => {
  const contract = 'tools/ci/run-web-cypress-native.test.mjs';
  assert.ok(EXECUTABLE_CI_TOOL_TESTS.includes(contract));
  assert.throws(
    () =>
      assertCiToolTestPartition(discoverCiToolTests(), {
        executableTests: EXECUTABLE_CI_TOOL_TESTS.filter((file) => file !== contract),
      }),
    /Package-backed CI tool tests must run in the executable partition: .*run-web-cypress-native\.test\.mjs/
  );
});

test('CI tool test partition fails closed when an executable test path is missing', () => {
  assert.throws(
    () => assertCiToolTestPartition(['tools/ci/workflow-pattern-parity.test.mjs']),
    /Executable CI tool test partition references missing files/
  );
});

test('CI tool test partition fails closed when package-backed tests are left static', () => {
  const allTests = discoverCiToolTests();
  const executableTests = EXECUTABLE_CI_TOOL_TESTS.filter(
    (filePath) => filePath !== 'tools/ci/arc-policy-state-store.test.mjs'
  );

  assert.throws(
    () => assertCiToolTestPartition(allTests, { executableTests }),
    /Package-backed CI tool tests must run in the executable partition: .*arc-policy-state-store\.test\.mjs/
  );
});

test('CI tool test mode parser accepts known modes and rejects unknown modes', () => {
  assert.equal(parseCiToolTestMode([]), 'all');
  assert.equal(parseCiToolTestMode(['static']), 'static');
  assert.equal(parseCiToolTestMode(['executable']), 'executable');
  assert.throws(() => parseCiToolTestMode(['unknown']), /Unsupported CI tool test mode/);
});
