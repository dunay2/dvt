import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ADAPTER_POSTGRES_RELEVANT_PATTERNS,
  PR_QUALITY_SCOPE_PATTERNS,
  matchesAnyPattern,
} from './scope-config.mjs';

const policyPath = 'tools/ci/policy/adapter-postgres-relevance.json';
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));

function assertWorkflowContains(workflow, snippet) {
  assert.ok(workflow.includes(snippet), `workflow must include: ${snippet}`);
}

test('adapter-postgres policy stays wired into the PR quality gate and test workflow', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

  assertWorkflowContains(prQualityGate, 'node tools/ci/emit-scope.mjs --mode pr-quality');
  assertWorkflowContains(
    testWorkflow,
    'node .github/scripts/generate-paths-filter.js tools/ci/policy/adapter-postgres-relevance.json adapter_postgres'
  );
  assertWorkflowContains(
    testWorkflow,
    'node .github/scripts/generate-paths-filter.js tools/ci/policy/adapter-postgres-relevance.json adapter_postgres_integration'
  );
  assertWorkflowContains(
    testWorkflow,
    'node .github/scripts/generate-paths-filter.js tools/ci/policy/adapter-postgres-relevance.json adapter_postgres_relevant'
  );

  assert.deepEqual(ADAPTER_POSTGRES_RELEVANT_PATTERNS, policy.adapter_postgres_relevant);
  assert.deepEqual(PR_QUALITY_SCOPE_PATTERNS.adapter_postgres_changed, policy.adapter_postgres_relevant);

  assert.ok(
    matchesAnyPattern('packages/@dvt/adapter-postgres/src/index.ts', ADAPTER_POSTGRES_RELEVANT_PATTERNS)
  );
  assert.ok(matchesAnyPattern('tsconfig.base.json', ADAPTER_POSTGRES_RELEVANT_PATTERNS));
  assert.ok(matchesAnyPattern('tsconfig.json', ADAPTER_POSTGRES_RELEVANT_PATTERNS));
  assert.ok(matchesAnyPattern('.github/workflows/pr-quality-gate.yml', ADAPTER_POSTGRES_RELEVANT_PATTERNS));
  assert.ok(!matchesAnyPattern('packages/@dvt/adapter-postgresx/src/index.ts', ADAPTER_POSTGRES_RELEVANT_PATTERNS));
});
