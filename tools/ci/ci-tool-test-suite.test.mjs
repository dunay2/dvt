import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXECUTABLE_CI_TOOL_TESTS,
  assertCiToolTestPartition,
  buildCiToolTestList,
  discoverCiToolTests,
  parseCiToolTestMode,
} from './ci-tool-test-suite.mjs';

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

test('CI tool test partition fails closed when an executable test path is missing', () => {
  assert.throws(
    () => assertCiToolTestPartition(['tools/ci/workflow-pattern-parity.test.mjs']),
    /Executable CI tool test partition references missing files/
  );
});

test('CI tool test mode parser accepts known modes and rejects unknown modes', () => {
  assert.equal(parseCiToolTestMode([]), 'all');
  assert.equal(parseCiToolTestMode(['static']), 'static');
  assert.equal(parseCiToolTestMode(['executable']), 'executable');
  assert.throws(() => parseCiToolTestMode(['unknown']), /Unsupported CI tool test mode/);
});
