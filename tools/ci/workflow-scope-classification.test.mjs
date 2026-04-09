import assert from 'node:assert/strict';
import test from 'node:test';

import { WORKFLOW_SCOPE_PATTERNS, computeBooleanScope } from './scope-config.mjs';

test('classifies docs-only pull request scope', () => {
  const scope = computeBooleanScope(['docs/guides/example.md'], WORKFLOW_SCOPE_PATTERNS);
  assert.equal(scope.docs_changed, true);
  assert.equal(scope.any_code, false);
  assert.equal(scope.lane_yaml_changed, false);
});

test('classifies lane YAML changes for workboard checks', () => {
  const scope = computeBooleanScope(
    ['docs/planning/state/agent-lane-a.yaml'],
    WORKFLOW_SCOPE_PATTERNS
  );
  assert.equal(scope.lane_yaml_changed, true);
  assert.equal(scope.docs_changed, true);
  assert.equal(scope.any_code, false);
});

test('classifies structural code changes as generated-status relevant', () => {
  const scope = computeBooleanScope(
    ['packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts'],
    WORKFLOW_SCOPE_PATTERNS
  );
  assert.equal(scope.any_code, true);
  assert.equal(scope.generated_status_relevant, true);
  assert.equal(scope.generated_capability_relevant, true);
});

test('classifies governance script changes as docs-relevant but not code scope', () => {
  const scope = computeBooleanScope(
    ['scripts/check-markdown-locations.cjs'],
    WORKFLOW_SCOPE_PATTERNS
  );
  assert.equal(scope.docs_changed, true);
  assert.equal(scope.any_code, false);
});

test('classifies app/package structural changes as code and generated-status relevant', () => {
  const scope = computeBooleanScope(['apps/web/src/main.tsx'], WORKFLOW_SCOPE_PATTERNS);
  assert.equal(scope.any_code, true);
  assert.equal(scope.generated_status_relevant, true);
  assert.equal(scope.generated_capability_relevant, true);
});
