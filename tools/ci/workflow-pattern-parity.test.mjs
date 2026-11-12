import './workflow-contracts/workflow-scope-wiring.cases.mjs';
import './workflow-contracts/workflow-scheduling-checkout.cases.mjs';
import './workflow-contracts/code-quality-outcome.cases.mjs';
import './workflow-contracts/workflow-governance-preparation.cases.mjs';
import './workflow-contracts/release-authority.cases.mjs';
import './workflow-contracts/security-action-pins.cases.mjs';

/** Owned concern: workflow pattern parity.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import yaml from 'js-yaml';
import { buildCiScopeOutputs } from './ci-scope-outputs.mjs';
import {
  ADAPTER_POSTGRES_RELEVANT_PATTERNS,
  PR_QUALITY_SCOPE_PATTERNS,
  TEST_SCOPE_PATTERNS,
  computeWorkflowModeScopeOutputs,
  matchesAnyPattern,
} from './scope-config.mjs';
import { assertWorkflowContains } from './workflow-contracts/assertions.mjs';

const workflowScopePolicyPath = 'tools/ci/policy/workflow-scope.json';

const policyPath = 'tools/ci/policy/adapter-postgres-relevance.json';

const workflowScopePolicy = JSON.parse(readFileSync(workflowScopePolicyPath, 'utf8'));

const policy = JSON.parse(readFileSync(policyPath, 'utf8'));

test('every scope consumer acquires its committed diff once through the shared entrypoint', () => {
  for (const name of ['ci', 'test', 'contracts', 'pr-quality-gate', 'codeql']) {
    const source = readFileSync(`.github/workflows/${name}.yml`, 'utf8');
    const workflow = yaml.load(source);
    const steps = Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);
    const scopes = steps.filter((step) => step.run?.includes('tools/ci/emit-'));
    assert.equal(scopes.length, 1, name);
    assert.equal(scopes[0].id, 'scope');
    assert.equal(scopes[0].run, 'node tools/ci/emit-scope.mjs');
    assert.equal(scopes[0].if, undefined, `${name}: scope must also run for non-PR events`);
    assert.ok(scopes[0].env.GIT_BASE);
    assert.ok(scopes[0].env.GIT_HEAD);
    assert.doesNotMatch(
      source,
      /fromJSON\(steps\.scope\.outputs\.\w+\)\.\w+\s*[!=]=\s*'(?:true|false)'/u
    );
  }
});

test('CodeQL consumes shared scope for PR, push, manual and scheduled events', () => {
  const job = yaml.load(readFileSync('.github/workflows/codeql.yml', 'utf8')).jobs[
    'detect-security-scope'
  ];
  const expression = job.outputs.security_analysis_relevant.replace(
    /^\s*\$\{\{\s*|\s*\}\}\s*$/gu,
    ''
  );
  const evaluate = (outputs) =>
    runInNewContext(expression, {
      steps: { scope: { outputs } },
      fromJSON: JSON.parse,
    });
  for (const event of ['pull_request', 'push', 'workflow_dispatch', 'schedule']) {
    for (const files of [['docs/README.md'], ['apps/web/src/App.tsx']]) {
      const full = event !== 'pull_request';
      assert.equal(
        evaluate(buildCiScopeOutputs(files, {}, { full })),
        full || computeWorkflowModeScopeOutputs('workflow', files).security_analysis_relevant,
        `${event}:${files}`
      );
    }
  }
  assert.throws(() => evaluate({ workflow_scope: '' }));
});

test('adapter-postgres policy stays wired into the PR quality gate and test workflow', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

  assertWorkflowContains(
    testWorkflow,
    'node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json'
  );
  assertWorkflowContains(testWorkflow, 'node tools/ci/emit-scope.mjs');
  assertWorkflowContains(prQualityGate, 'node tools/ci/emit-scope.mjs');
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
