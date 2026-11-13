/** Owned concern: workflow scope wiring.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';
import { EXECUTABLE_CI_TOOL_TESTS } from '../ci-tool-test-catalog.mjs';
import { WORKFLOW_SCOPE_PATTERNS } from '../scope-config.mjs';
import { assertWorkflowContains, assertWorkflowExcludes } from './assertions.mjs';

const workflowScopePolicyPath = 'tools/ci/policy/workflow-scope.json';

const workflowScopePolicy = JSON.parse(readFileSync(workflowScopePolicyPath, 'utf8'));

test('workflow scope policy stays wired into ci and pr quality workflows', () => {
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assertWorkflowContains(ciWorkflow, 'name: CI tool contracts');
  assertWorkflowContains(ciWorkflow, 'node tools/ci/ci-tool-test-suite.mjs static');
  assertWorkflowContains(ciWorkflow, 'name: CI tool executable contracts');
  assertWorkflowContains(ciWorkflow, 'pnpm test:ci-tools:executable');
  assertWorkflowContains(
    ciWorkflow,
    'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
  );
  assertWorkflowContains(ciWorkflow, 'node tools/ci/emit-scope.mjs');
  assertWorkflowContains(ciWorkflow, 'steps.scope.outputs.workspace_matrix');
  assert.doesNotMatch(
    ciWorkflow,
    /changed_file_validation_relevant:\s*\$\{\{\s*steps\.scope\.outputs/u
  );
  assertWorkflowContains(
    ciWorkflow,
    'fromJSON(steps.scope.outputs.workflow_scope).security_analysis_relevant'
  );
  assertWorkflowContains(ciWorkflow, 'ci_tool_executable_contracts_relevant:');
  assertWorkflowContains(
    ciWorkflow,
    'fromJSON(steps.scope.outputs.workflow_scope).ci_tool_executable_contracts_relevant'
  );
  assertWorkflowContains(
    ciWorkflow,
    "needs.detect-affected.outputs.ci_tool_executable_contracts_relevant == 'true'"
  );
  assert.doesNotMatch(
    ciWorkflow,
    /needs\.detect-affected\.outputs\.changed_file_validation_relevant/u
  );
  const lintStep = yaml
    .load(prQualityGate)
    .jobs['pr-checks'].steps.find((step) => step.run?.includes('node scripts/check-changed.cjs'));
  assert.ok(
    lintStep.if.includes(
      'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).changed_file_validation_relevant == true'
    )
  );
  assert.ok(
    lintStep.if.includes(
      'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).docs_changed == true'
    )
  );
  assertWorkflowContains(prQualityGate, 'run: pnpm lint:md:changed');
  assertWorkflowContains(prQualityGate, 'run: pnpm verify:changed --committed-tests');
  assertWorkflowExcludes(prQualityGate, 'run: pnpm verify:changed -- --committed-tests');
  assertWorkflowContains(
    prQualityGate,
    'run: node scripts/planning-db/knowledge-intake-retirement-guard.cjs --committed'
  );
  // The parsed condition is stable across the formatter's YAML line folding.
  const inventoryStep = yaml
    .load(prQualityGate)
    .jobs['pr-checks'].steps.find(
      (step) => step.name === 'Validate Planning DB inventory for committed changes'
    );
  assertWorkflowContains(
    inventoryStep.if,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).planning_db_inventory_relevant == true'
  );
  assertWorkflowContains(prQualityGate, 'run: pnpm planning:db:inventory:check');
  assertWorkflowContains(prQualityGate, 'run: pnpm planning:db:integrity:check --bootstrap');
  assertWorkflowExcludes(prQualityGate, 'run: pnpm planning:db:integrity:check -- --bootstrap');

  const preparePlanningDb = prQualityGate.indexOf(
    '- name: Prepare planning DB for DB-backed validation'
  );
  const planningInventory = prQualityGate.indexOf(
    '- name: Validate Planning DB inventory for committed changes'
  );
  const planningIntegrity = prQualityGate.indexOf(
    '- name: Validate Planning DB integrity for committed changes'
  );
  assert.ok(preparePlanningDb >= 0);
  assert.ok(preparePlanningDb < planningInventory);
  assert.ok(planningInventory < planningIntegrity);

  const integrityStep = yaml
    .load(prQualityGate)
    .jobs['pr-checks'].steps.find(
      (step) => step.name === 'Validate Planning DB integrity for committed changes'
    );
  assert.deepEqual(integrityStep.env, {
    GIT_BASE: '${{ github.event.pull_request.base.sha }}',
    GIT_HEAD: '${{ github.sha }}',
  });

  assertWorkflowContains(
    prQualityGate,
    'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
  );
  assertWorkflowContains(prQualityGate, 'node tools/ci/emit-scope.mjs');
  assertWorkflowContains(prQualityGate, 'run_temporal_transformation_integration');
  assertWorkflowContains(prQualityGate, 'temporal_transformation_changed');

  assert.deepEqual(WORKFLOW_SCOPE_PATTERNS, {
    any_code: workflowScopePolicy.any_code,
    docs_changed: workflowScopePolicy.docs_changed,
    docs_structure_changed: workflowScopePolicy.docs_structure_changed,
    generated_status_relevant: workflowScopePolicy.generated_status_relevant,
    generated_capability_relevant: workflowScopePolicy.generated_capability_relevant,
    changed_file_validation_relevant: workflowScopePolicy.changed_file_validation_relevant,
    security_analysis_relevant: workflowScopePolicy.security_analysis_relevant,
    ci_tool_executable_contracts_relevant: [
      ...workflowScopePolicy.ci_tool_executable_contracts_relevant,
      ...EXECUTABLE_CI_TOOL_TESTS,
    ],
  });
});

test('contracts and test workflows consume semantic scope outputs instead of inline filters', () => {
  const contractsWorkflow = readFileSync('.github/workflows/contracts.yml', 'utf8');
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

  assertWorkflowContains(contractsWorkflow, 'node tools/ci/emit-scope.mjs');
  assertWorkflowContains(testWorkflow, 'node tools/ci/emit-scope.mjs');
  assertWorkflowContains(testWorkflow, 'steps.scope.outputs.test_matrix');
  assertWorkflowContains(testWorkflow, 'name: Package Tests (${{ matrix.name }})');
  assertWorkflowContains(
    testWorkflow,
    'matrix: ${{ fromJSON(needs.detect_test_matrix.outputs.matrix) }}'
  );
  assertWorkflowContains(testWorkflow, 'run: ${{ matrix.command }}');
  assertWorkflowContains(testWorkflow, 'name: Adapter Temporal Tests');
  assertWorkflowContains(testWorkflow, 'fromJSON(steps.scope.outputs.test_scope).adapter_temporal');
  assertWorkflowContains(
    testWorkflow,
    'fromJSON(steps.scope.outputs.test_scope).coverage_relevant'
  );
  assertWorkflowContains(
    testWorkflow,
    'fromJSON(steps.scope.outputs.test_scope).root_build_sensitive'
  );

  assert.doesNotMatch(contractsWorkflow, /dorny\/paths-filter/u);
  assert.doesNotMatch(testWorkflow, /dorny\/paths-filter/u);
  assert.doesNotMatch(testWorkflow, /steps\.det_changes\.outputs/u);
  assert.doesNotMatch(testWorkflow, /steps\.cov_changes\.outputs/u);
});
