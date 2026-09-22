/** Owned concern: prove executable CI test identity has one routing authority. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { EXECUTABLE_CI_TOOL_TESTS } from './ci-tool-test-suite.mjs';
import { computeWorkflowModeScopeOutputs } from './scope-config.mjs';

for (const file of EXECUTABLE_CI_TOOL_TESTS) {
  test('executable contract selects its lane: ' + file, () => {
    assert.equal(
      computeWorkflowModeScopeOutputs('workflow', [file]).ci_tool_executable_contracts_relevant,
      true
    );
  });
}

for (const file of [
  'tools/ci/ci-tool-routing.test.mjs',
  'apps/web/src/app/components/example.tsx',
]) {
  test('unrelated input does not select executable CI contracts: ' + file, () => {
    assert.equal(
      computeWorkflowModeScopeOutputs('workflow', [file]).ci_tool_executable_contracts_relevant,
      false
    );
  });
}

test('the policy does not maintain another executable test identity list', () => {
  const policy = JSON.parse(readFileSync('tools/ci/policy/workflow-scope.json', 'utf8'));
  assert.deepEqual(
    policy.ci_tool_executable_contracts_relevant.filter((path) =>
      EXECUTABLE_CI_TOOL_TESTS.includes(path)
    ),
    []
  );
});
