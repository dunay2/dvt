/**
 * @ownedConcern Guard GitHub workflow wiring against drift from shared CI scope policies.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ADAPTER_POSTGRES_RELEVANT_PATTERNS,
  PR_QUALITY_SCOPE_PATTERNS,
  TEST_SCOPE_PATTERNS,
  WORKFLOW_SCOPE_PATTERNS,
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
  'pnpm docs:governance:document-unit-map:check',
  'pnpm docs:governance:file-component-index:check',
  'pnpm docs:governance:file-fingerprint-baseline:check',
  'pnpm docs:governance:file-fingerprint-impact:check',
  'pnpm docs:governance:coverage-report:check',
  'pnpm docs:governance:remediation-queue:check',
  'pnpm traceability:adr0',
  'pnpm docs:feature-mechanization',
  'pnpm docs:feature-mechanization:implementation',
  'pnpm qa:artifact:check',
  'pnpm arch:deps',
];

function assertWorkflowContains(workflow, snippet) {
  assert.ok(workflow.includes(snippet), `workflow must include: ${snippet}`);
}

function countWorkflowCommand(workflow, command) {
  return workflow.split(command).length - 1;
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
    'adapter_postgres_changed: ${{ steps.scope.outputs.postgres_capability_changed }}'
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
  assert.ok(
    matchesAnyPattern('.github/workflows/pr-quality-gate.yml', ADAPTER_POSTGRES_RELEVANT_PATTERNS)
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
  assert.ok(matchesAnyPattern('tools/ci/emit-scope.mjs', TEST_SCOPE_PATTERNS.root_config));
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
  assertWorkflowContains(ciWorkflow, 'run: pnpm test:ci-tools');
  assertWorkflowContains(
    ciWorkflow,
    'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
  );
  assertWorkflowContains(ciWorkflow, 'node tools/ci/emit-scope.mjs --mode workflow');
  assertWorkflowContains(ciWorkflow, 'node tools/ci/emit-workspace-matrix.mjs');
  assertWorkflowContains(
    ciWorkflow,
    'changed_file_validation_relevant: ${{ steps.scope.outputs.changed_file_validation_relevant }}'
  );
  assertWorkflowContains(
    ciWorkflow,
    "needs.detect-affected.outputs.changed_file_validation_relevant == 'true'"
  );

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
    lane_yaml_changed: workflowScopePolicy.lane_yaml_changed,
    generated_status_relevant: workflowScopePolicy.generated_status_relevant,
    generated_capability_relevant: workflowScopePolicy.generated_capability_relevant,
    changed_file_validation_relevant: workflowScopePolicy.changed_file_validation_relevant,
  });
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

test('PR quality gate keeps merge-blocking governance commands wired', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  for (const command of PR_QUALITY_GOVERNANCE_COMMANDS) {
    assertWorkflowContains(prQualityGate, command);
  }
});

test('PR quality gate consumes prepush-equivalent scope outputs for expensive gates', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assertWorkflowContains(prQualityGate, 'steps.scope.outputs.governance_global_relevant');
  assertWorkflowContains(prQualityGate, 'steps.scope.outputs.traceability_adr0_relevant');
  assertWorkflowContains(prQualityGate, 'steps.scope.outputs.feature_mechanization_relevant');
  assertWorkflowContains(prQualityGate, 'steps.scope.outputs.code_validation_relevant');
});

test('PR quality gate is the single remote owner for ADR-0000 traceability', () => {
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assert.equal(countWorkflowCommand(prQualityGate, 'pnpm traceability:adr0'), 1);
  assert.equal(countWorkflowCommand(ciWorkflow, 'pnpm traceability:adr0'), 0);
});

test('release workflow stays action-only until it needs repository tooling', () => {
  const releaseWorkflow = readFileSync('.github/workflows/release.yml', 'utf8');

  assertWorkflowContains(releaseWorkflow, 'googleapis/release-please-action@');
  assert.doesNotMatch(releaseWorkflow, /actions\/checkout/u);
  assert.doesNotMatch(releaseWorkflow, /\.\/\.github\/actions\/setup-node-pnpm/u);
  assert.doesNotMatch(releaseWorkflow, /\bpnpm\s+/u);
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
    'actions/dependency-review-action@2031cfc080254a8a887f58cffee85186f0e49e48 # v4.9.0'
  );
  assertWorkflowContains(dependencyReview, 'fail-on-severity: high');

  assertWorkflowContains(
    codeql,
    'github/codeql-action/init@95e58e9a2cdfd71adc6e0353d5c52f41a045d225 # v4.35.2'
  );
  assertWorkflowContains(
    codeql,
    'github/codeql-action/analyze@95e58e9a2cdfd71adc6e0353d5c52f41a045d225 # v4.35.2'
  );
  assertWorkflowContains(codeql, 'security-events: write');
  assertWorkflowContains(codeql, 'javascript-typescript');

  assertWorkflowContains(nightly, 'issues: write');
  assertWorkflowContains(nightly, 'name: Notify nightly failure');
  assertWorkflowContains(nightly, 'if: failure()');
  assertWorkflowContains(nightly, 'gh issue create --title "${NIGHTLY_ISSUE_TITLE}"');
  assertWorkflowContains(
    nightly,
    'pnpm --workspace-concurrency=4 --filter @dvt/adapter-postgres... --if-present run build'
  );

  assertWorkflowContains(
    createLabels,
    'actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0'
  );

  assertWorkflowContains(docsDeploy, 'timeout-minutes: 20');
  assertWorkflowContains(docsDeploy, 'contents: write');
  assertWorkflowContains(docsDeploy, 'python -m pip install zensical==0.0.39');
  assertWorkflowContains(docsDeploy, "if: ${{ github.event.inputs.run_pages_deploy == 'true' }}");

  assert.doesNotMatch(contracts, /POSTGRES_PASSWORD:\s+dvt_test/);
  assert.doesNotMatch(contracts, /postgresql:\/\/dvt_test:dvt_test@/);
  assert.match(contracts, /POSTGRES_PASSWORD:\s+\$\{\{\s*github\.run_id\s*\}\}/);
  assert.match(
    contracts,
    /DATABASE_URL:\s+postgresql:\/\/dvt_test:\$\{\{\s*github\.run_id\s*\}\}@localhost:5432\/dvt_test/
  );

  assertWorkflowContains(setupNodePnpm, 'tools/*/node_modules');
  assertWorkflowContains(setupNodePnpm, "default: '--frozen-lockfile --prefer-offline'");
});
