import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeBooleanScope,
  matchesAnyPattern,
  PR_QUALITY_SCOPE_PATTERNS,
} from '../scope-config.mjs';

test('matchesAnyPattern supports wildcard and normalizes Windows separators', () => {
  assert.ok(
    matchesAnyPattern('packages\\@dvt\\adapter-postgres\\src\\index.ts', [
      'packages/@dvt/adapter-postgres/**',
    ])
  );
  assert.ok(matchesAnyPattern('tsconfig.base.json', ['tsconfig*.json']));
  assert.ok(
    !matchesAnyPattern('packages/@dvt/adapter-postgresx/src/index.ts', [
      'packages/@dvt/adapter-postgres/**',
    ])
  );
});

test('computeBooleanScope marks adapter_postgres_changed for relevant workflow/config changes', () => {
  const fromWorkflow = computeBooleanScope(
    ['.github/workflows/pr-quality-gate.yml'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromWorkflow.adapter_postgres_changed, true);

  const fromTsconfig = computeBooleanScope(['tsconfig.base.json'], PR_QUALITY_SCOPE_PATTERNS);
  assert.equal(fromTsconfig.adapter_postgres_changed, true);

  const fromUnrelated = computeBooleanScope(['docs/index.md'], PR_QUALITY_SCOPE_PATTERNS);
  assert.equal(fromUnrelated.adapter_postgres_changed, false);
});

test('computeBooleanScope marks temporal_changed for adapter-postgres changes', () => {
  const fromAdapterPostgres = computeBooleanScope(
    ['packages/@dvt/adapter-postgres/src/index.ts'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromAdapterPostgres.temporal_changed, true);

  const fromTemporalWorkflow = computeBooleanScope(
    ['.github/workflows/pr-quality-gate.yml'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromTemporalWorkflow.temporal_changed, true);
});
