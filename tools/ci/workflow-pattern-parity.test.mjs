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

function assertWorkflowContains(workflow, snippet) {
  assert.ok(workflow.includes(snippet), `workflow must include: ${snippet}`);
}

test('adapter-postgres policy stays wired into the PR quality gate and test workflow', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

  assertWorkflowContains(
    testWorkflow,
    'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
  );
  assertWorkflowContains(testWorkflow, 'node tools/ci/emit-scope.mjs --mode test');
  assertWorkflowContains(prQualityGate, 'node tools/ci/emit-scope.mjs --mode pr-quality');
  assertWorkflowContains(
    testWorkflow,
    'node .github/scripts/generate-paths-filter.js tools/ci/policy/adapter-postgres-relevance.json adapter_postgres_relevant'
  );

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

  assertWorkflowContains(
    ciWorkflow,
    'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
  );
  assertWorkflowContains(ciWorkflow, 'node tools/ci/emit-scope.mjs --mode workflow');
  assertWorkflowContains(ciWorkflow, 'node tools/ci/emit-workspace-matrix.mjs');

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
  });
});
