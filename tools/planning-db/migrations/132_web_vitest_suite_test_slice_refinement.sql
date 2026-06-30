-- Refine the web Vitest governance test split after separating changed-file
-- discovery and governance command routing into their own component tests.

with feature as (
  select
    'local#WEB-VITEST-GOVERNANCE-TEST-SLICES-20260618#command#validatewebvitestgovernancetestslices'::text as rail_id,
    'DB-first split of the web Vitest governance architecture test into component-owned catalog, changed-file-discovery, changed-routing, changed-routing-governance, size-policy, raw-intake, and documentation checks.'::text as implementation_plan,
    array[
      'apps/web/src/testing/vitestSuites.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.catalog.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedFileDiscovery.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedRouting.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedRoutingGovernance.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.rawIntake.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.sizePolicy.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#catalogGlobMatchesPath',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#countLines',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#countTestCases',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#escapeRegexChar',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#expandBraceAlternatives',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#hasRawIntakePathReference',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#listFiles',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#listWebVitestFiles',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#normalizePath',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#rawIntakePathReferencePatterns',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#readRepoFile',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#sourceRoot',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#suiteMatchesFile',
      'apps/web/src/testing/vitestSuites.architecture.support.ts#webRoot',
      'tools/planning-db/migrations/131_web_vitest_suite_test_support_symbols.sql',
      'tools/planning-db/migrations/132_web_vitest_suite_test_slice_refinement.sql'
    ]::text[] as implementation_refs,
    array[
      'apps/web/src/testing/vitestSuites.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.catalog.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedFileDiscovery.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedRouting.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedRoutingGovernance.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.rawIntake.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.sizePolicy.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.architecture.support.ts',
      'tools/planning-db/migrations/131_web_vitest_suite_test_support_symbols.sql',
      'tools/planning-db/migrations/132_web_vitest_suite_test_slice_refinement.sql'
    ]::text[] as allowed_surfaces,
    array[
      'apps/web/src/testing/vitestSuites.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.catalog.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedFileDiscovery.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedRouting.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedRoutingGovernance.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.rawIntake.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.sizePolicy.architecture.test.ts'
    ]::text[] as architecture_guards,
    array[
      'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts src/testing/vitestSuites.catalog.architecture.test.ts src/testing/vitestSuites.changedFileDiscovery.architecture.test.ts src/testing/vitestSuites.changedRouting.architecture.test.ts src/testing/vitestSuites.changedRoutingGovernance.architecture.test.ts src/testing/vitestSuites.sizePolicy.architecture.test.ts src/testing/vitestSuites.rawIntake.architecture.test.ts',
      'pnpm --filter @dvt/web lint',
      'pnpm --filter @dvt/web typecheck',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ]::text[] as completion_gate
),
patched_manifest as (
  select
    rail.raw_manifest,
    feature.*
  from feature
  join planning_query_store.feature_mechanization_local_rails rail
    on rail.rail_id = feature.rail_id
),
patched_symbols as (
  select
    patched_manifest.*,
    (
      select jsonb_agg(
        jsonb_set(symbol, '{unitTests}', to_jsonb(patched_manifest.architecture_guards), true)
      )
      from jsonb_array_elements(patched_manifest.raw_manifest->'symbols') as symbol
    ) as symbols
  from patched_manifest
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = to_jsonb(patched_symbols.implementation_refs),
  allowed_implementation_surfaces = to_jsonb(patched_symbols.allowed_surfaces),
  architecture_guards = to_jsonb(patched_symbols.architecture_guards),
  completion_gate = to_jsonb(patched_symbols.completion_gate),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            patched_symbols.raw_manifest,
            '{implementationPlan}',
            to_jsonb(patched_symbols.implementation_plan),
            true
          ),
          '{allowedImplementationSurfaces}',
          to_jsonb(patched_symbols.allowed_surfaces),
          true
        ),
        '{architectureGuards}',
        to_jsonb(patched_symbols.architecture_guards),
        true
      ),
      '{completionGate}',
      to_jsonb(patched_symbols.completion_gate),
      true
    ),
    '{symbols}',
    coalesce(patched_symbols.symbols, '[]'::jsonb),
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched_symbols
where rail.rail_id = patched_symbols.rail_id;
