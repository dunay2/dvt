/** @ownedConcern Project the shared CI policy into one complete workflow output read model. */
import {
  SCOPE_MODES,
  WORKSPACE_ENTRIES,
  computeWorkflowModeScopeOutputs,
  computeWorkspaceMatrix,
} from './scope-config.mjs';
import {
  buildNonPullRequestTestMatrixOutputs,
  buildTestMatrixOutputs,
} from './package-test-matrix.mjs';

export function buildCiScopeOutputs(changedFiles, scopeContext = {}, { full = false } = {}) {
  const outputs = {};
  for (const mode of Object.keys(SCOPE_MODES)) {
    const scope = computeWorkflowModeScopeOutputs(mode, changedFiles, scopeContext);
    outputs[`${mode.replaceAll('-', '_')}_scope`] = JSON.stringify(
      full ? Object.fromEntries(Object.keys(scope).map((key) => [key, true])) : scope
    );
  }
  const workspaces = full
    ? { anyChanged: true, include: WORKSPACE_ENTRIES.map(({ name, pkg }) => ({ name, pkg })) }
    : computeWorkspaceMatrix(changedFiles, scopeContext);
  const tests = full
    ? buildNonPullRequestTestMatrixOutputs()
    : buildTestMatrixOutputs(changedFiles, scopeContext);
  return {
    ...outputs,
    any_changed: workspaces.anyChanged,
    workspace_matrix: JSON.stringify({ include: workspaces.include }),
    any_tests: tests.anyTests,
    test_matrix: JSON.stringify({ include: tests.include }),
  };
}
