/** Owned concern: workflow scheduling checkout.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';
import {
  assertWorkflowContains,
  assertWorkflowExcludes,
  countWorkflowCommand,
} from './assertions.mjs';

const DRAFT_AWARE_PR_TYPES =
  'types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]';

test('Turbo cache uses a fresh writer key and a stable per-producer restore prefix', () => {
  const action = yaml.load(readFileSync('.github/actions/setup-node-pnpm/action.yml', 'utf8'));
  const cache = action.runs.steps.find((step) => step.name === 'Cache Turbo');
  const pnpmCache = action.runs.steps.find((step) => step.name === 'Cache pnpm store');
  assert.ok(cache);
  assert.ok(pnpmCache);
  assert.equal(cache.with.path, '.turbo');
  assert.equal(cache.if, undefined);
  assert.equal(pnpmCache.with.path, '${{ env.STORE_PATH }}');

  const key = cache.with.key;
  const restoreKeys = cache.with['restore-keys'];
  for (const identity of [
    'runner.os',
    'github.workflow',
    'github.job',
    'inputs.turbo-cache-variant',
    'github.run_id',
    'github.run_attempt',
  ]) {
    assert.ok(key.includes(identity), `Turbo writer key must contain ${identity}`);
  }
  assert.ok(key.includes('hashFiles('));
  assert.ok(restoreKeys.includes('inputs.turbo-cache-variant'));
  assert.ok(restoreKeys.includes('hashFiles('));
  assert.ok(!restoreKeys.includes('github.run_id'));
  assert.ok(!restoreKeys.includes('github.run_attempt'));
  const writeSuffix = '${{ github.run_id }}-${{ github.run_attempt }}';
  assert.ok(key.endsWith(writeSuffix));
  assert.equal(key.slice(0, -writeSuffix.length).replaceAll(/\s+/gu, ' '), restoreKeys.trim());
  assert.match(key, /turbo-v2-/u);
  assert.match(restoreKeys, /turbo-v2-/u);

  const testWorkflow = yaml.load(readFileSync('.github/workflows/test.yml', 'utf8'));
  const packageSetup = testWorkflow.jobs['package-tests'].steps.find(
    (step) => step.uses === './.github/actions/setup-node-pnpm'
  );
  assert.equal(packageSetup.with['turbo-cache-variant'], '${{ matrix.name }}');
  const packageBuild = testWorkflow.jobs['package-tests'].steps.find(
    (step) => step.name === 'Build package dependency graph'
  );
  assert.ok(packageBuild);
  assert.equal(packageBuild.if, undefined);
});

test('Test Suite heavy PR lanes are gated at job level by one detector', () => {
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

  assertWorkflowContains(testWorkflow, DRAFT_AWARE_PR_TYPES);
  assertWorkflowContains(testWorkflow, 'github.event.pull_request.draft');
  assert.equal(countWorkflowCommand(testWorkflow, 'node tools/ci/emit-scope.mjs'), 1);
  assert.equal(
    countWorkflowCommand(
      testWorkflow,
      'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
    ),
    1
  );

  const outputs = yaml.load(testWorkflow).jobs.detect_test_matrix.outputs;
  for (const output of [
    'adapter_temporal',
    'web',
    'root_build_sensitive',
    'coverage_relevant',
    'postgres_capability_changed',
  ]) {
    assert.equal(outputs[output], '${{ fromJSON(steps.scope.outputs.test_scope).' + output + ' }}');
  }

  for (const predicate of [
    "needs.detect_test_matrix.outputs.adapter_temporal == 'true'",
    "needs.detect_test_matrix.outputs.web == 'true'",
    "needs.detect_test_matrix.outputs.coverage_relevant == 'true'",
    "needs.detect_test_matrix.outputs.postgres_capability_changed == 'true'",
  ]) {
    assertWorkflowContains(testWorkflow, predicate);
  }
});

test('draft-skipped PR workflows re-evaluate gates when reviewability changes', () => {
  const contractsWorkflow = readFileSync('.github/workflows/contracts.yml', 'utf8');
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const codeql = readFileSync('.github/workflows/codeql.yml', 'utf8');
  const dependencyReview = readFileSync('.github/workflows/dependency-review.yml', 'utf8');

  for (const workflow of [contractsWorkflow, prQualityGate, codeql, dependencyReview]) {
    assertWorkflowContains(workflow, DRAFT_AWARE_PR_TYPES);
    assertWorkflowContains(workflow, 'github.event.pull_request.draft');
  }

  assertWorkflowContains(contractsWorkflow, 'name: Detect contracts/determinism scope');
});

test('test and contract workflows expose stable merge-blocking outcomes', () => {
  const testWorkflow = yaml.load(readFileSync('.github/workflows/test.yml', 'utf8'));
  const contractsWorkflow = yaml.load(readFileSync('.github/workflows/contracts.yml', 'utf8'));
  const testAggregator = testWorkflow.jobs['test-suite-required'];
  const contractsAggregator = contractsWorkflow.jobs['contracts-required'];

  assert.equal(testAggregator.name, 'Test Suite Required for Merge');
  assert.deepEqual(testAggregator.needs, [
    'detect_test_matrix',
    'package-tests',
    'adapter-temporal',
    'web-frontend-tests',
    'adapter-postgres',
    'coverage',
  ]);
  assert.equal(contractsAggregator.name, 'Contracts Required for Merge');
  assert.deepEqual(contractsAggregator.needs, [
    'detect-changes',
    'validate-json-schemas',
    'determinism-checks',
    'contract-validate',
    'contract-hashes',
  ]);

  for (const aggregator of [testAggregator, contractsAggregator]) {
    assert.equal(aggregator.if, 'always()');
  }
  assert.match(contractsAggregator.steps[0].with.script, /\['failure', 'cancelled'\]/u);
});

test('scope diff consumers use shallow checkout instead of full PR history', () => {
  const fetchScopeBaseAction = readFileSync('.github/actions/fetch-scope-base/action.yml', 'utf8');
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const contractsWorkflow = readFileSync('.github/workflows/contracts.yml', 'utf8');
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');
  const workflowBundle = [ciWorkflow, contractsWorkflow, prQualityGate, testWorkflow].join('\n');

  assertWorkflowContains(fetchScopeBaseAction, 'git fetch --no-tags --depth=1 origin');
  assertWorkflowContains(fetchScopeBaseAction, 'BASE_REF: ${{ inputs.base-ref }}');
  assertWorkflowContains(
    fetchScopeBaseAction,
    '+refs/heads/${BASE_REF}:refs/remotes/origin/${BASE_REF}'
  );

  for (const workflow of [ciWorkflow, contractsWorkflow, testWorkflow]) {
    assertWorkflowContains(workflow, 'uses: ./.github/actions/fetch-scope-base');
  }

  assert.doesNotMatch(prQualityGate, /uses: \.\/\.github\/actions\/fetch-scope-base/u);
  assertWorkflowContains(prQualityGate, 'fetch-depth: 2');
  assertWorkflowContains(prQualityGate, 'github.event.pull_request.base.sha');
  assertWorkflowExcludes(prQualityGate, 'name: Checkout reviewed-commit evidence history');
  assertWorkflowExcludes(prQualityGate, 'path: .git-evidence');
  assert.equal((prQualityGate.match(/fetch-depth:\s*0/gu) ?? []).length, 0);

  assertWorkflowContains(workflowBundle, 'fetch-depth: 1');
  assert.doesNotMatch(
    [ciWorkflow, contractsWorkflow, testWorkflow].join('\n'),
    /fetch-depth:\s*0/u
  );
  assert.doesNotMatch(
    workflowBundle,
    /fetch-depth:\s*\$\{\{\s*github\.event_name == 'pull_request' && '0' \|\| '1'\s*\}\}/u
  );
});
