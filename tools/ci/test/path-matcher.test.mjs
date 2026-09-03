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

test('script globs cover root and nested scripts explicitly', () => {
  assert.equal(matchesAnyPattern('scripts/planning-db-query.cjs', ['scripts/*.cjs']), true);
  assert.equal(matchesAnyPattern('scripts/nested/example.cjs', ['scripts/**/*.cjs']), true);
  assert.equal(matchesAnyPattern('tools/docs/check-filenames.ts', ['tools/docs/*.ts']), true);
  assert.equal(matchesAnyPattern('tools/docs/lib/markdown.ts', ['tools/docs/**/*.ts']), true);
  assert.equal(
    matchesAnyPattern('tools/ops/ar-c2-evidence-collector.mjs', ['tools/ops/*.mjs']),
    true
  );
});

test('computeBooleanScope marks adapter_postgres_changed for relevant runtime/config changes', () => {
  const fromWorkflow = computeBooleanScope(
    ['.github/workflows/pr-quality-gate.yml'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromWorkflow.adapter_postgres_changed, false);
  assert.equal(fromWorkflow.ci_tooling_changed, true);

  const fromTsconfig = computeBooleanScope(['tsconfig.base.json'], PR_QUALITY_SCOPE_PATTERNS);
  assert.equal(fromTsconfig.adapter_postgres_changed, true);

  const fromUnrelated = computeBooleanScope(['docs/index.md'], PR_QUALITY_SCOPE_PATTERNS);
  assert.equal(fromUnrelated.adapter_postgres_changed, false);
});

test('computeBooleanScope marks temporal_postgres_changed for adapter-postgres changes', () => {
  const fromAdapterPostgres = computeBooleanScope(
    ['packages/@dvt/adapter-postgres/src/index.ts'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromAdapterPostgres.temporal_postgres_changed, true);

  const fromTemporalSources = computeBooleanScope(
    ['packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromTemporalSources.temporal_postgres_changed, true);

  const fromWorkflowConfig = computeBooleanScope(
    ['.github/workflows/pr-quality-gate.yml'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromWorkflowConfig.temporal_changed, false);
  assert.equal(fromWorkflowConfig.temporal_postgres_changed, false);
  assert.equal(fromWorkflowConfig.ci_tooling_changed, true);

  const fromRuntimeDepsHelper = computeBooleanScope(
    ['scripts/build-workspace-runtime-deps.cjs'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromRuntimeDepsHelper.temporal_changed, true);
  assert.equal(fromRuntimeDepsHelper.temporal_transformation_changed, true);
  assert.equal(fromRuntimeDepsHelper.temporal_postgres_changed, true);

  const fromObjectFileWorker = computeBooleanScope(
    ['apps/temporal-worker/src/runtime/temporalWorkerObjectFilePostgresProfile.ts'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromObjectFileWorker.temporal_postgres_changed, true);

  const fromObjectFilePlugin = computeBooleanScope(
    ['packages/@dvt/temporal-object-file-postgres-plugin/src/ObjectFilePostgresPluginRunner.ts'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromObjectFilePlugin.temporal_postgres_changed, true);
});

test('computeBooleanScope isolates transformation-specific integration changes', () => {
  const fromTransformationIntegrationFile = computeBooleanScope(
    ['packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromTransformationIntegrationFile.temporal_changed, false);
  assert.equal(fromTransformationIntegrationFile.temporal_transformation_changed, true);
  assert.equal(fromTransformationIntegrationFile.temporal_postgres_changed, false);

  const fromTemporalWorkerHost = computeBooleanScope(
    ['packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromTemporalWorkerHost.temporal_changed, true);
  assert.equal(fromTemporalWorkerHost.temporal_transformation_changed, true);
  assert.equal(fromTemporalWorkerHost.temporal_postgres_changed, true);

  const fromTemporalIndex = computeBooleanScope(
    ['packages/@dvt/adapter-temporal/src/index.ts'],
    PR_QUALITY_SCOPE_PATTERNS
  );
  assert.equal(fromTemporalIndex.temporal_changed, true);
  assert.equal(fromTemporalIndex.temporal_transformation_changed, true);
  assert.equal(fromTemporalIndex.temporal_postgres_changed, true);
});
