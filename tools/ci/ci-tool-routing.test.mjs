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

for (const file of ['docs/guides/example.md', 'apps/web/src/app/components/example.tsx']) {
  test('unrelated input does not select executable CI contracts: ' + file, () => {
    assert.equal(
      computeWorkflowModeScopeOutputs('workflow', [file]).ci_tool_executable_contracts_relevant,
      false
    );
  });
}

for (const file of [
  'scripts/planning-db-schema.cjs',
  'scripts/planning-db/component-source-responsibility-store.cjs',
  'scripts/planning-db/component-source-responsibility.integration.test.cjs',
  'tools/docs/check-filenames.ts',
  'packages/@dvt/cli/src/main.ts',
  'packages/@dvt/engine/test/contracts/run-golden-paths.hash.test.ts',
]) {
  test('tooling crypto source selects pre-merge executable contracts: ' + file, () => {
    assert.equal(
      computeWorkflowModeScopeOutputs('workflow', [file]).ci_tool_executable_contracts_relevant,
      true
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
