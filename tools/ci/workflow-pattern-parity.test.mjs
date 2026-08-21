/**
 * @ownedConcern Guard GitHub workflow wiring against drift from shared CI scope policies.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import yaml from 'js-yaml';

import {
  ADAPTER_POSTGRES_RELEVANT_PATTERNS,
  PR_QUALITY_SCOPE_PATTERNS,
  TEST_SCOPE_PATTERNS,
  WORKFLOW_SCOPE_PATTERNS,
  computeWorkflowModeScopeOutputs,
  matchesAnyPattern,
} from './scope-config.mjs';

const policyPath = 'tools/ci/policy/adapter-postgres-relevance.json';
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
const workflowScopePolicyPath = 'tools/ci/policy/workflow-scope.json';
const workflowScopePolicy = JSON.parse(readFileSync(workflowScopePolicyPath, 'utf8'));
const PR_QUALITY_GOVERNANCE_COMMANDS = [
  'pnpm docs:gov:filenames:changed',
  'pnpm docs:gov:frontmatter:changed',
  'pnpm docs:governance:unit-coverage',
  'pnpm traceability:adr0',
  'pnpm docs:feature-mechanization',
  'pnpm docs:feature-mechanization:implementation',
  'pnpm qa:artifact:check',
  'pnpm arch:deps',
];
const DRAFT_AWARE_PR_TYPES =
  'types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]';

function assertWorkflowContains(workflow, snippet) {
  assert.ok(workflow.includes(snippet), `workflow must include: ${snippet}`);
}

function assertWorkflowExcludes(workflow, snippet) {
  assert.ok(!workflow.includes(snippet), `workflow must exclude: ${snippet}`);
}

function countWorkflowCommand(workflow, command) {
  return workflow.split(command).length - 1;
}

function listYamlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listYamlFiles(entryPath);
    }
    return /\.ya?ml$/u.test(entry.name) ? [entryPath] : [];
  });
}

function namedWorkflowStep(workflow, name) {
  const marker = `      - name: ${name}`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `workflow must contain step: ${name}`);
  const next = workflow.indexOf('\n      - name:', start + marker.length);
  return workflow.slice(start, next === -1 ? workflow.length : next);
}

test('adapter-postgres policy stays wired into the PR quality gate and test workflow', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

  assertWorkflowContains(
    testWorkflow,
    'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
  );
  assertWorkflowContains(testWorkflow, 'node tools/ci/emit-scope.mjs --mode test');
  assertWorkflowContains(
    testWorkflow,
    'postgres_capability_changed: ${{ steps.scope.outputs.postgres_capability_changed }}'
  );
  assertWorkflowContains(prQualityGate, 'node tools/ci/emit-scope.mjs --mode pr-quality');
  assert.doesNotMatch(testWorkflow, /generate-paths-filter\.js/u);

  assert.deepEqual(ADAPTER_POSTGRES_RELEVANT_PATTERNS, policy.adapter_postgres_relevant);
  assert.deepEqual(
    PR_QUALITY_SCOPE_PATTERNS.adapter_postgres_changed,
    policy.adapter_postgres_relevant
  );

  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/adapter-postgres/src/index.ts',
      ADAPTER_POSTGRES_RELEVANT_PATTERNS
    )
  );
  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/adapter-postgres/src/index.ts',
      PR_QUALITY_SCOPE_PATTERNS.temporal_postgres_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts',
      PR_QUALITY_SCOPE_PATTERNS.temporal_postgres_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts',
      PR_QUALITY_SCOPE_PATTERNS.temporal_postgres_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'scripts/build-workspace-runtime-deps.cjs',
      PR_QUALITY_SCOPE_PATTERNS.temporal_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'scripts/build-workspace-runtime-deps.cjs',
      PR_QUALITY_SCOPE_PATTERNS.temporal_postgres_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'scripts/build-workspace-runtime-deps.cjs',
      PR_QUALITY_SCOPE_PATTERNS.temporal_transformation_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts',
      PR_QUALITY_SCOPE_PATTERNS.temporal_transformation_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/adapter-temporal/src/index.ts',
      PR_QUALITY_SCOPE_PATTERNS.temporal_transformation_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts',
      PR_QUALITY_SCOPE_PATTERNS.temporal_transformation_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/adapter-temporal/src/index.ts',
      PR_QUALITY_SCOPE_PATTERNS.temporal_postgres_changed
    )
  );
  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts',
      PR_QUALITY_SCOPE_PATTERNS.temporal_postgres_changed
    )
  );
  assert.ok(matchesAnyPattern('tsconfig.base.json', ADAPTER_POSTGRES_RELEVANT_PATTERNS));
  assert.ok(matchesAnyPattern('tsconfig.json', ADAPTER_POSTGRES_RELEVANT_PATTERNS));
  assert.equal(
    matchesAnyPattern('.github/workflows/pr-quality-gate.yml', ADAPTER_POSTGRES_RELEVANT_PATTERNS),
    false
  );
  assert.ok(
    matchesAnyPattern('apps/outbox-worker/src/server.ts', TEST_SCOPE_PATTERNS.outbox_worker)
  );
  assert.ok(
    matchesAnyPattern(
      'packages/@dvt/delivery/test/OutboxWorker.test.ts',
      TEST_SCOPE_PATTERNS.delivery
    )
  );
  assert.ok(matchesAnyPattern('turbo.json', TEST_SCOPE_PATTERNS.any_test));
  assert.ok(matchesAnyPattern('turbo.json', TEST_SCOPE_PATTERNS.root_config));
  assert.ok(matchesAnyPattern('turbo.json', workflowScopePolicy.any_code));
  assert.ok(matchesAnyPattern('turbo.json', workflowScopePolicy.workspace_global));
  assert.equal(
    computeWorkflowModeScopeOutputs('test', ['tools/ci/emit-scope.mjs']).root_build_sensitive,
    false
  );
  assert.equal(
    computeWorkflowModeScopeOutputs('test', ['scripts/unclassified-runtime.cjs'])
      .root_build_sensitive,
    true
  );
  assert.ok(
    matchesAnyPattern('scripts/skip-prebuild-if-orchestrated.cjs', TEST_SCOPE_PATTERNS.any_test)
  );
  assert.ok(
    matchesAnyPattern('scripts/skip-prebuild-if-orchestrated.cjs', TEST_SCOPE_PATTERNS.root_config)
  );
  assert.ok(
    !matchesAnyPattern(
      'packages/@dvt/adapter-postgresx/src/index.ts',
      ADAPTER_POSTGRES_RELEVANT_PATTERNS
    )
  );
});

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
  assertWorkflowContains(ciWorkflow, 'node tools/ci/emit-scope.mjs --mode workflow');
  assertWorkflowContains(ciWorkflow, 'node tools/ci/emit-workspace-matrix.mjs');
  assert.doesNotMatch(
    ciWorkflow,
    /changed_file_validation_relevant:\s*\$\{\{\s*steps\.scope\.outputs/u
  );
  assertWorkflowContains(ciWorkflow, 'steps.scope.outputs.security_analysis_relevant');
  assertWorkflowContains(ciWorkflow, 'ci_tool_executable_contracts_relevant:');
  assertWorkflowContains(ciWorkflow, 'steps.scope.outputs.ci_tool_executable_contracts_relevant');
  assertWorkflowContains(
    ciWorkflow,
    "needs.detect-affected.outputs.ci_tool_executable_contracts_relevant == 'true'"
  );
  assert.doesNotMatch(
    ciWorkflow,
    /needs\.detect-affected\.outputs\.changed_file_validation_relevant/u
  );
  assert.match(
    prQualityGate,
    /steps\.scope\.outputs\.changed_file_validation_relevant\s*== 'true'[\s\S]*steps\.scope\.outputs\.docs_changed\s*== 'true'/u
  );
  assertWorkflowContains(prQualityGate, 'run: pnpm lint:md:changed');
  assertWorkflowContains(prQualityGate, 'run: node scripts/check-changed.cjs');
  assertWorkflowContains(prQualityGate, 'run: pnpm verify:changed --committed-tests');
  assertWorkflowExcludes(prQualityGate, 'run: pnpm verify:changed -- --committed-tests');
  assertWorkflowContains(
    prQualityGate,
    'run: node scripts/planning-db/knowledge-intake-retirement-guard.cjs --committed'
  );
  assertWorkflowContains(
    prQualityGate,
    "steps.scope.outputs.planning_db_inventory_relevant == 'true'"
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

  assertWorkflowContains(
    prQualityGate,
    'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
  );
  assertWorkflowContains(prQualityGate, 'node tools/ci/emit-scope.mjs --mode workflow');
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
    ci_tool_executable_contracts_relevant:
      workflowScopePolicy.ci_tool_executable_contracts_relevant,
  });
});

test('PR quality does not materialize human documentation indexes', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  assertWorkflowExcludes(prQualityGate, 'pnpm docs:sync:check');
});

test('contracts and test workflows consume semantic scope outputs instead of inline filters', () => {
  const contractsWorkflow = readFileSync('.github/workflows/contracts.yml', 'utf8');
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

  assertWorkflowContains(contractsWorkflow, 'node tools/ci/emit-scope.mjs --mode contracts');
  assertWorkflowContains(testWorkflow, 'node tools/ci/emit-scope.mjs --mode test');
  assertWorkflowContains(testWorkflow, 'node tools/ci/emit-test-matrix.mjs');
  assertWorkflowContains(testWorkflow, 'name: Package Tests (${{ matrix.name }})');
  assertWorkflowContains(
    testWorkflow,
    'matrix: ${{ fromJSON(needs.detect_test_matrix.outputs.matrix) }}'
  );
  assertWorkflowContains(testWorkflow, 'run: ${{ matrix.command }}');
  assertWorkflowContains(testWorkflow, 'name: Adapter Temporal Tests');
  assertWorkflowContains(testWorkflow, 'steps.scope.outputs.adapter_temporal');
  assertWorkflowContains(testWorkflow, 'steps.scope.outputs.determinism_relevant');
  assertWorkflowContains(testWorkflow, 'steps.scope.outputs.coverage_relevant');
  assertWorkflowContains(testWorkflow, 'steps.scope.outputs.root_build_sensitive');

  assert.doesNotMatch(contractsWorkflow, /dorny\/paths-filter/u);
  assert.doesNotMatch(testWorkflow, /dorny\/paths-filter/u);
  assert.doesNotMatch(testWorkflow, /steps\.det_changes\.outputs/u);
  assert.doesNotMatch(testWorkflow, /steps\.cov_changes\.outputs/u);
});

test('Test Suite heavy PR lanes are gated at job level by one detector', () => {
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

  assertWorkflowContains(testWorkflow, DRAFT_AWARE_PR_TYPES);
  assertWorkflowContains(testWorkflow, 'github.event.pull_request.draft');
  assert.equal(countWorkflowCommand(testWorkflow, 'node tools/ci/emit-scope.mjs --mode test'), 1);
  assert.equal(
    countWorkflowCommand(
      testWorkflow,
      'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
    ),
    1
  );

  for (const output of [
    'adapter_temporal: ${{ steps.scope.outputs.adapter_temporal }}',
    'web: ${{ steps.scope.outputs.web }}',
    'root_build_sensitive: ${{ steps.scope.outputs.root_build_sensitive }}',
    'determinism_relevant: ${{ steps.scope.outputs.determinism_relevant }}',
    'coverage_relevant: ${{ steps.scope.outputs.coverage_relevant }}',
    'postgres_capability_changed: ${{ steps.scope.outputs.postgres_capability_changed }}',
  ]) {
    assertWorkflowContains(testWorkflow, output);
  }

  for (const predicate of [
    "needs.detect_test_matrix.outputs.adapter_temporal == 'true'",
    "needs.detect_test_matrix.outputs.web == 'true'",
    "needs.detect_test_matrix.outputs.determinism_relevant == 'true'",
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

test('engine coverage scope is a semantic superset of engine workspace policy', () => {
  for (const pattern of workflowScopePolicy.workspace_engine) {
    assert.ok(
      TEST_SCOPE_PATTERNS.coverage_relevant.includes(pattern),
      `coverage_relevant must include engine workspace policy pattern: ${pattern}`
    );
  }

  const engineCoverageCanaries = [
    'packages/@dvt/engine/vitest.config.ts',
    'packages/@dvt/engine/src/WorkflowEngine.ts',
    'packages/@dvt/engine/test/contracts/RunLifecycle.contract.test.ts',
  ];

  for (const path of engineCoverageCanaries) {
    assert.ok(matchesAnyPattern(path, workflowScopePolicy.workspace_engine));
    assert.ok(matchesAnyPattern(path, TEST_SCOPE_PATTERNS.coverage_relevant));
  }
});

test('PR quality gate keeps merge-blocking non-projection governance commands wired', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assertWorkflowContains(prQualityGate, 'pnpm docs:gov:locations -- --changed-only');
  assert.doesNotMatch(
    prQualityGate,
    /if:\s*github\.event_name == 'pull_request'[^\n]*steps\.scope\.outputs\.docs_changed[^\n]*\n\s*run: pnpm docs:gov:locations\n/u
  );

  for (const command of PR_QUALITY_GOVERNANCE_COMMANDS) {
    assertWorkflowContains(prQualityGate, command);
  }
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
    'test-determinism',
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
    assert.match(aggregator.steps[0].with.script, /\['failure', 'cancelled'\]/u);
  }
});

test('code quality workflow exposes a stable merge-blocking outcome', () => {
  const ciWorkflow = yaml.load(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const aggregator = ciWorkflow.jobs['code-quality-required'];

  assert.equal(aggregator.name, 'Code Quality Required for Merge');
  assert.deepEqual(aggregator.needs, [
    'ci-tool-contracts',
    'detect-affected',
    'ci-tool-executable-contracts',
    'affected-preflight',
    'no-affected-workspaces',
  ]);
  assert.equal(aggregator.if, 'always()');
  assert.match(aggregator.steps[0].with.script, /\['failure', 'cancelled'\]/u);
});

test('PR quality gate consumes prepush-equivalent scope outputs for expensive gates', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assertWorkflowContains(prQualityGate, 'steps.scope.outputs.governance_global_relevant');
  assertWorkflowContains(prQualityGate, 'steps.scope.outputs.traceability_adr0_relevant');
  assertWorkflowContains(prQualityGate, 'steps.scope.outputs.feature_mechanization_relevant');
  assertWorkflowContains(prQualityGate, 'steps.scope.outputs.code_validation_relevant');
});

test('PR quality gate prepares planning DB before DB-first feature implementation checks', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const preparePlanningDbAction = readFileSync(
    '.github/actions/prepare-planning-db/action.yml',
    'utf8'
  );
  const prepareDbStep = namedWorkflowStep(
    prQualityGate,
    'Prepare planning DB for DB-backed validation'
  );
  const prepareDbIndex = prQualityGate.indexOf('Prepare planning DB for DB-backed validation');
  const prepareDbActionIndex = prQualityGate.indexOf('uses: ./.github/actions/prepare-planning-db');
  const implementationGateIndex = prQualityGate.indexOf(
    'pnpm docs:feature-mechanization:implementation'
  );

  assert.notEqual(prepareDbIndex, -1);
  assert.notEqual(prepareDbActionIndex, -1);
  assert.notEqual(implementationGateIndex, -1);
  assert.ok(prepareDbIndex < prepareDbActionIndex);
  assert.ok(prepareDbActionIndex < implementationGateIndex);
  assertWorkflowContains(prQualityGate, "github.event_name == 'push'");
  assertWorkflowContains(
    prQualityGate,
    "steps.scope.outputs.feature_mechanization_relevant == 'true'"
  );
  assertWorkflowContains(prepareDbStep, "steps.scope.outputs.governance_global_relevant == 'true'");
  assertWorkflowExcludes(prQualityGate, 'pnpm docs:dbt-roundtrip-capabilities:check');
  assertWorkflowExcludes(prQualityGate, 'DVT_GIT_EVIDENCE_REPO');
  assert.doesNotMatch(prQualityGate, /import-governance:/u);
  assertWorkflowContains(preparePlanningDbAction, 'pnpm planning:db:import');
  assert.doesNotMatch(preparePlanningDbAction, /planning:db:migrate/u);
  assert.equal(
    countWorkflowCommand(prepareDbStep, "steps.scope.outputs.governance_global_relevant == 'true'"),
    1,
    'governance scope must activate the single current-schema preparation action'
  );
  assertWorkflowContains(prQualityGate, 'GIT_BASE:');
  assertWorkflowContains(prQualityGate, 'github.event.pull_request.base.sha');
  assertWorkflowContains(prQualityGate, 'GIT_HEAD: ${{ github.sha }}');
});

test('the canonical docs sync rail provisions and imports Planning DB for every caller', () => {
  const packageScripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  const localDocsPreflight = readFileSync('scripts/docs-pr-local.cjs', 'utf8');

  assert.match(
    packageScripts['docs:sync'],
    /^pnpm planning:db:up && pnpm planning:db:health --wait && pnpm planning:db:import && node scripts\/sync-docs\.cjs$/u
  );
  assert.match(packageScripts['docs:sync:check'], /^pnpm docs:sync &&/u);
  assert.match(packageScripts['docs:ci'], /^pnpm docs:sync &&/u);
  assert.match(localDocsPreflight, /\['pnpm', \['docs:sync:check'\]\]/u);
});

test('main full CI prepares Planning DB before the full validation baseline', () => {
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const preparePlanningDbAction = readFileSync(
    '.github/actions/prepare-planning-db/action.yml',
    'utf8'
  );
  const prepareDbIndex = ciWorkflow.indexOf('Prepare planning DB for full CI baseline');
  const prepareDbActionIndex = ciWorkflow.indexOf('uses: ./.github/actions/prepare-planning-db');
  const fullBaselineIndex = ciWorkflow.indexOf('run: pnpm ci:full');

  assert.notEqual(prepareDbIndex, -1);
  assert.notEqual(prepareDbActionIndex, -1);
  assert.notEqual(fullBaselineIndex, -1);
  assert.ok(prepareDbIndex < prepareDbActionIndex);
  assert.ok(prepareDbActionIndex < fullBaselineIndex);
  assert.doesNotMatch(ciWorkflow, /import-governance:/u);
  assertWorkflowContains(preparePlanningDbAction, 'pnpm planning:db:import');
  assert.doesNotMatch(preparePlanningDbAction, /planning:db:migrate/u);
  assertWorkflowContains(ciWorkflow, 'PLANNING_DB_INTEGRITY_SCOPE: bootstrap');
});

test('PR quality traceability runs after implementation mechanization to avoid dirty generated diffs', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const implementationGateIndex = prQualityGate.indexOf(
    'pnpm docs:feature-mechanization:implementation'
  );
  const traceabilityIndex = prQualityGate.indexOf('pnpm traceability:adr0');

  assert.notEqual(implementationGateIndex, -1);
  assert.notEqual(traceabilityIndex, -1);
  assert.ok(implementationGateIndex < traceabilityIndex);
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

test('PR quality gate is the single remote owner for ADR-0000 traceability', () => {
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assert.equal(countWorkflowCommand(prQualityGate, 'pnpm traceability:adr0'), 1);
  assert.equal(countWorkflowCommand(ciWorkflow, 'pnpm traceability:adr0'), 0);
});

test('release generation and candidate admission have one trusted owner each', () => {
  const releaseWorkflow = readFileSync('.github/workflows/release.yml', 'utf8');
  const prQualityWorkflow = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const integrityWorkflow = readFileSync(
    '.github/workflows/release-candidate-integrity.yml',
    'utf8'
  );
  const release = yaml.load(releaseWorkflow);
  const prQuality = yaml.load(prQualityWorkflow);
  const integrity = yaml.load(integrityWorkflow);

  assertWorkflowContains(
    releaseWorkflow,
    'googleapis/release-please-action@45996ed1f6d02564a971a2fa1b5860e934307cf7 # v5.0.0'
  );
  assertWorkflowContains(releaseWorkflow, 'target-branch: main');
  assertWorkflowContains(releaseWorkflow, 'cancel-in-progress: false');
  const releasePleaseStep = release.jobs.release_please.steps.find((step) =>
    String(step.name).includes('release-please')
  );
  const releaseCredentialPreflight = release.jobs.release_please.steps.find(
    (step) => step.name === 'Require release governance credential'
  );
  assert.equal(releasePleaseStep.with.token, '${{ secrets.RELEASE_GOVERNANCE_TOKEN }}');
  assert.equal(
    releaseCredentialPreflight.env.RELEASE_GOVERNANCE_TOKEN,
    '${{ secrets.RELEASE_GOVERNANCE_TOKEN }}'
  );
  assert.match(releaseCredentialPreflight.run, /test -n "\$RELEASE_GOVERNANCE_TOKEN"/u);
  assert.doesNotMatch(
    releaseWorkflow,
    /token:\s*\$\{\{\s*(?:github\.token|secrets\.GITHUB_TOKEN)/u
  );
  assert.equal(release.on.workflow_dispatch, undefined);
  assert.equal(Object.keys(release.jobs).length, 1);
  assert.doesNotMatch(releaseWorkflow, /actions\/checkout|checks:\s*write|candidate_validation/u);

  assert.deepEqual(integrity.on.pull_request_target.types, [
    'opened',
    'synchronize',
    'reopened',
    'ready_for_review',
  ]);
  assert.deepEqual(integrity.permissions, { contents: 'read' });
  assert.deepEqual(Object.keys(integrity.jobs), [
    'classify_release_candidate_authority',
    'begin_release_candidate_integrity',
    'assess_release_candidate_integrity',
    'complete_release_candidate_integrity',
  ]);
  assert.deepEqual(integrity.jobs.classify_release_candidate_authority.permissions, {
    contents: 'read',
  });
  assert.equal(
    integrity.jobs.begin_release_candidate_integrity.needs,
    'classify_release_candidate_authority'
  );
  assert.deepEqual(integrity.jobs.assess_release_candidate_integrity.needs, [
    'classify_release_candidate_authority',
    'begin_release_candidate_integrity',
  ]);
  assert.equal(
    String(integrity.jobs.assess_release_candidate_integrity.if).replace(/\s+/gu, ' '),
    "${{ fromJSON(needs.classify_release_candidate_authority.outputs.classification-json).assessmentDisposition != 'not_applicable' }}"
  );
  assert.deepEqual(integrity.jobs.complete_release_candidate_integrity.needs, [
    'classify_release_candidate_authority',
    'begin_release_candidate_integrity',
    'assess_release_candidate_integrity',
  ]);
  const beginPublication = integrity.jobs.begin_release_candidate_integrity.steps.find(
    (step) => step.id === 'publish'
  );
  const completionPublication = integrity.jobs.complete_release_candidate_integrity.steps.find(
    (step) => String(step.name).startsWith('Publish final check outcome')
  );
  const assessmentEnforcement = integrity.jobs.complete_release_candidate_integrity.steps.find(
    (step) => step.name === 'Enforce required trusted assessment outcome'
  );
  const classifiedPublicationSha =
    '${{ fromJSON(needs.classify_release_candidate_authority.outputs.classification-json).publicationSha }}';
  assert.equal(beginPublication.env.PUBLICATION_SHA, classifiedPublicationSha);
  assert.equal(completionPublication.env.PUBLICATION_SHA, classifiedPublicationSha);
  assert.match(
    String(completionPublication.env.CHECK_CONCLUSION),
    /assessmentDisposition == 'not_applicable'/u
  );
  assert.match(
    String(completionPublication.env.CHECK_CONCLUSION),
    /needs\.assess_release_candidate_integrity\.result == 'success'/u
  );
  assert.match(String(assessmentEnforcement.if), /assessmentDisposition != 'not_applicable'/u);
  assert.deepEqual(integrity.jobs.begin_release_candidate_integrity.permissions, {
    contents: 'read',
    checks: 'write',
  });
  assert.deepEqual(integrity.jobs.assess_release_candidate_integrity.permissions, {
    contents: 'read',
  });
  const policyInspection = integrity.jobs.assess_release_candidate_integrity.steps.find(
    (step) => step.id === 'policy'
  );
  assert.equal(policyInspection.env.GH_TOKEN, '${{ secrets.RELEASE_GOVERNANCE_TOKEN }}');
  const candidateAssessment = integrity.jobs.assess_release_candidate_integrity.steps.find(
    (step) => step.name === 'Assess exact candidate with trusted code'
  );
  assert.equal(
    candidateAssessment.env.RELEASE_REPOSITORY_POLICY_JSON,
    '${{ toJSON(fromJSON(steps.policy.outputs.json).policy) }}'
  );
  assert.deepEqual(integrity.jobs.complete_release_candidate_integrity.permissions, {
    contents: 'read',
    checks: 'write',
  });
  assert.notEqual(
    integrity.jobs.begin_release_candidate_integrity.name,
    'Release candidate integrity'
  );
  assert.notEqual(
    integrity.jobs.assess_release_candidate_integrity.name,
    'Release candidate integrity'
  );
  assert.notEqual(
    integrity.jobs.complete_release_candidate_integrity.name,
    'Release candidate integrity'
  );
  assertWorkflowContains(integrityWorkflow, 'github.event.pull_request.base.sha');
  assertWorkflowContains(integrityWorkflow, 'github.event.pull_request.head.sha');
  assertWorkflowContains(integrityWorkflow, 'github.event.pull_request.merge_commit_sha');
  assertWorkflowContains(integrityWorkflow, 'github.event.pull_request.head.repo.full_name');
  assertWorkflowContains(integrityWorkflow, 'persist-credentials: false');
  assertWorkflowContains(integrityWorkflow, 'actions/setup-node@');
  assertWorkflowContains(integrityWorkflow, 'releaseCandidateIntegrityCli.mjs');
  assertWorkflowContains(integrityWorkflow, 'releaseCandidateAuthorityCli.mjs');
  assertWorkflowContains(integrityWorkflow, 'releaseMergePolicyCli.mjs inspect');
  assertWorkflowContains(integrityWorkflow, 'releaseCandidateCheckGithubAdapter.mjs begin');
  assertWorkflowContains(integrityWorkflow, 'releaseCandidateCheckGithubAdapter.mjs complete');
  assertWorkflowContains(integrityWorkflow, 'needs.assess_release_candidate_integrity.result');
  assertWorkflowContains(
    integrityWorkflow,
    'fromJSON(needs.classify_release_candidate_authority.outputs.classification-json).publicationSha'
  );
  assert.doesNotMatch(integrityWorkflow, /name:\s*Classify pull request authority/u);
  assert.doesNotMatch(integrityWorkflow, /if \[\[ "\$HEAD_REF"/u);
  assert.doesNotMatch(integrityWorkflow, /pnpm\s+--dir\s+candidate/u);

  assert.equal(prQuality.permissions['pull-requests'], 'read');
  assert.equal(prQuality.jobs['release-candidate-integrity'], undefined);
  assert.equal(
    prQuality.jobs['all-checks-passed'].needs.includes('release-candidate-integrity'),
    false
  );
  for (const job of Object.values(prQuality.jobs)) {
    for (const step of job.steps ?? []) {
      if (String(step.uses ?? '').startsWith('actions/checkout@')) {
        assert.equal(step.with?.['persist-credentials'], false);
      }
    }
  }
});

test('setup-node consumers stay on one pinned action version', () => {
  const githubYamlSources = listYamlFiles('.github').map((filePath) =>
    readFileSync(filePath, 'utf8')
  );
  const setupNodeReferenceCount = githubYamlSources.reduce(
    (count, source) => count + [...source.matchAll(/actions\/setup-node@/gu)].length,
    0
  );
  const setupNodePins = githubYamlSources
    .flatMap((source) => [
      ...source.matchAll(/actions\/setup-node@([0-9a-f]{40}) # (v\d+(?:\.\d+\.\d+)?)/gu),
    ])
    .map((match) => ({ sha: match[1], version: match[2] }));

  assert.ok(setupNodeReferenceCount > 0);
  assert.equal(setupNodePins.length, setupNodeReferenceCount);
  assert.equal(new Set(setupNodePins.map(({ sha }) => sha)).size, 1);
  assert.equal(new Set(setupNodePins.map(({ version }) => version)).size, 1);
  assert.equal(setupNodePins[0].sha, '820762786026740c76f36085b0efc47a31fe5020');
  assert.equal(setupNodePins[0].version, 'v7.0.0');
});

test('security and nightly workflows stay wired to pinned actions and failure notification', () => {
  const dependencyReview = readFileSync('.github/workflows/dependency-review.yml', 'utf8');
  const codeql = readFileSync('.github/workflows/codeql.yml', 'utf8');
  const contracts = readFileSync('.github/workflows/contracts.yml', 'utf8');
  const createLabels = readFileSync('.github/workflows/create-labels.yml', 'utf8');
  const docsDeploy = readFileSync('.github/workflows/docs-deploy.yml', 'utf8');
  const nightly = readFileSync(
    '.github/workflows/adapter-postgres-integration-nightly.yml',
    'utf8'
  );
  const setupNodePnpm = readFileSync('.github/actions/setup-node-pnpm/action.yml', 'utf8');

  assertWorkflowContains(
    dependencyReview,
    'actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0'
  );
  assertWorkflowContains(dependencyReview, 'fail-on-severity: high');
  assertWorkflowContains(dependencyReview, "vars.GH_ADVANCED_SECURITY_ENABLED == 'true'");
  assertWorkflowContains(dependencyReview, "github.event.repository.visibility == 'public'");

  const codeqlActionPins = [
    ...codeql.matchAll(/github\/codeql-action\/(init|analyze)@([0-9a-f]{40}) # (v\d+\.\d+\.\d+)/gu),
  ].map((match) => ({ action: match[1], sha: match[2], version: match[3] }));
  assert.deepEqual(codeqlActionPins.map(({ action }) => action).sort(), ['analyze', 'init']);
  assert.equal(new Set(codeqlActionPins.map(({ sha }) => sha)).size, 1);
  assert.equal(new Set(codeqlActionPins.map(({ version }) => version)).size, 1);
  assert.equal(codeqlActionPins[0].sha, '7188fc363630916deb702c7fdcf4e481b751f97a');
  assert.equal(codeqlActionPins[0].version, 'v4.37.1');
  assertWorkflowContains(codeql, 'security-events: write');
  assertWorkflowContains(codeql, 'javascript-typescript');
  assertWorkflowContains(codeql, "vars.GH_ADVANCED_SECURITY_ENABLED == 'true'");
  assertWorkflowContains(codeql, "github.event.repository.visibility == 'public'");
  assertWorkflowContains(codeql, 'name: Detect security analysis scope');
  assertWorkflowContains(codeql, 'node tools/ci/emit-scope.mjs --mode workflow');
  assertWorkflowContains(codeql, 'security_analysis_relevant:');
  assertWorkflowContains(
    codeql,
    "needs.detect-security-scope.outputs.security_analysis_relevant == 'true'"
  );
  assert.doesNotMatch(codeql, /paths-ignore/u);

  assertWorkflowContains(nightly, 'issues: write');
  assertWorkflowContains(nightly, 'name: Notify nightly failure');
  assertWorkflowContains(nightly, 'if: failure()');
  assertWorkflowContains(nightly, 'gh issue create --title "${NIGHTLY_ISSUE_TITLE}"');
  assertWorkflowContains(
    nightly,
    'node scripts/run-turbo-workspace-task.cjs build --filter=@dvt/adapter-postgres...'
  );
  assert.doesNotMatch(
    nightly,
    /pnpm --workspace-concurrency=4 --filter @dvt\/adapter-postgres\.\.\. --if-present run build/u
  );

  assertWorkflowContains(
    createLabels,
    'actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0'
  );

  assertWorkflowContains(docsDeploy, 'timeout-minutes: 20');
  assertWorkflowContains(docsDeploy, 'contents: write');
  assert.match(
    docsDeploy,
    /python -m pip install --disable-pip-version-check --require-hashes -r\s+\.github\/requirements\/zensical\.lock/u
  );
  assertWorkflowContains(docsDeploy, "if: ${{ github.event.inputs.run_pages_deploy == 'true' }}");

  assert.doesNotMatch(contracts, /POSTGRES_PASSWORD:\s+dvt_test/);
  assert.doesNotMatch(contracts, /postgresql:\/\/dvt_test:dvt_test@/);
  assert.match(contracts, /POSTGRES_PASSWORD:\s+\$\{\{\s*github\.run_id\s*\}\}/);
  assert.match(
    contracts,
    /DATABASE_URL:\s+postgresql:\/\/dvt_test:\$\{\{\s*github\.run_id\s*\}\}@localhost:5432\/dvt_test/
  );

  assert.doesNotMatch(setupNodePnpm, /Cache node_modules/u);
  assert.doesNotMatch(setupNodePnpm, /nm-cache/u);
  assert.doesNotMatch(setupNodePnpm, /(?:^|\s)tools\/\*\/node_modules(?:\s|$)/u);
  assertWorkflowContains(setupNodePnpm, "default: '--frozen-lockfile --prefer-offline'");
  assertWorkflowContains(setupNodePnpm, 'run: pnpm install ${{ inputs.install-args }}');
});
