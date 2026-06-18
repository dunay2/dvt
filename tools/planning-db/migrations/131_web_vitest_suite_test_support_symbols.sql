-- Register the split web Vitest governance test support as DB-first
-- feature-mechanization symbols. The implementation guard rejects helper
-- symbols unless the Planning DB owns their component test manifest.

with feature as (
  select
    'WEB-VITEST-GOVERNANCE-TEST-SLICES-20260618'::text as feature_id,
    'ValidateWebVitestGovernanceTestSlices'::text as rail_name,
    'validatewebvitestgovernancetestslices'::text as normalized_rail_name,
    'WebVitestChangedSuiteRouter'::text as ddd_owner,
    'apps/web/src/testing/vitestSuites.architecture.support.ts'::text as source_path,
    '5e3c996696b0011cf03ae5c7ed14833472b966e11e658da3cc0220c5b993ce84'::text as source_content_sha256,
    array[
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
      'apps/web/src/testing/vitestSuites.architecture.support.ts#webRoot'
    ]::text[] as symbol_refs,
    array[
      'apps/web/src/testing/vitestSuites.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.catalog.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedRouting.architecture.test.ts',
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
      'tools/planning-db/migrations/131_web_vitest_suite_test_support_symbols.sql'
    ]::text[] as implementation_refs,
    array[
      'docs/architecture/components/web/frontend-test-governance-component.md',
      'docs/architecture/components/web/web-vitest-changed-suite-router-component.md',
      'docs/architecture/components/web/web-vitest-changed-suite-router-user-stories.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/web-vitest-suite-partition-plan-20260517.md'
    ]::text[] as documentation_refs,
    array[
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ]::text[] as governing_sources,
    array[
      'apps/web/src/testing/vitestSuites.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.catalog.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedRouting.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.rawIntake.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.sizePolicy.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.architecture.support.ts',
      'tools/planning-db/migrations/131_web_vitest_suite_test_support_symbols.sql'
    ]::text[] as allowed_surfaces,
    array[
      'apps/web/vitest.suites.ts',
      'apps/web/scripts/run-vitest-changed-suites.ts'
    ]::text[] as forbidden_surfaces,
    array[
      'WebVitestSuiteCatalog',
      'WebVitestChangedSuiteRouter',
      'WebVitestGovernanceTestSupport'
    ]::text[] as domain_objects,
    array[
      'god_test_decomposition',
      'test_harness_overload',
      'semantic_fitness_function'
    ]::text[] as fowler_signals,
    array[
      'apps/web/src/testing/vitestSuites.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.catalog.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.changedRouting.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.rawIntake.architecture.test.ts',
      'apps/web/src/testing/vitestSuites.sizePolicy.architecture.test.ts'
    ]::text[] as architecture_guards,
    array[
      'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts src/testing/vitestSuites.catalog.architecture.test.ts src/testing/vitestSuites.changedRouting.architecture.test.ts src/testing/vitestSuites.sizePolicy.architecture.test.ts src/testing/vitestSuites.rawIntake.architecture.test.ts',
      'pnpm --filter @dvt/web lint',
      'pnpm --filter @dvt/web typecheck',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ]::text[] as completion_gate
)
insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
select
  'local#' || feature.feature_id || '#command#' || feature.normalized_rail_name,
  feature.feature_id,
  'implemented',
  feature.rail_name,
  feature.normalized_rail_name,
  'command',
  feature.ddd_owner,
  'implemented',
  to_jsonb(feature.symbol_refs),
  to_jsonb(feature.implementation_refs),
  to_jsonb(feature.documentation_refs),
  to_jsonb(feature.governing_sources),
  to_jsonb(feature.allowed_surfaces),
  to_jsonb(feature.architecture_guards),
  to_jsonb(feature.completion_gate),
  feature.source_path,
  feature.source_content_sha256,
  jsonb_build_object(
    'name', feature.rail_name,
    'type', 'command',
    'dddOwner', feature.ddd_owner,
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', feature.feature_id,
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'DB-first split of the web Vitest governance architecture test into component-owned catalog, changed-routing, size-policy, raw-intake, and documentation checks.',
    'componentGuides', to_jsonb(feature.documentation_refs),
    'userStories', jsonb_build_array(
      'Web governance tests stay small enough for local review.',
      'Changed-file routing remains validated without a single oversized architecture file.',
      'Raw intake guards stay isolated from suite catalog and routing assertions.'
    ),
    'governingSources', to_jsonb(feature.governing_sources),
    'allowedImplementationSurfaces', to_jsonb(feature.allowed_surfaces),
    'forbiddenImplementationSurfaces', to_jsonb(feature.forbidden_surfaces),
    'domainObjects', to_jsonb(feature.domain_objects),
    'fowlerSignals', to_jsonb(feature.fowler_signals),
    'architectureGuards', to_jsonb(feature.architecture_guards),
    'cypressFlows', jsonb_build_array('not_applicable:architecture_test_modularization'),
    'completionGate', to_jsonb(feature.completion_gate),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', feature.rail_name,
        'type', 'command',
        'dddOwner', feature.ddd_owner,
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', feature.normalized_rail_name || '-record',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'New helper symbols in vitestSuites.architecture.support.ts are rejected until Planning DB declares them.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/131_web_vitest_suite_test_support_symbols.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols',
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', split_part(symbol_ref, '#', 2),
            'path', split_part(symbol_ref, '#', 1),
            'dddOwner', feature.ddd_owner,
            'cqRails', jsonb_build_array(feature.rail_name),
            'fowlerSignals', to_jsonb(feature.fowler_signals),
            'architectureGuard', 'apps/web/src/testing/vitestSuites.sizePolicy.architecture.test.ts',
            'cypressCoverage', 'not_applicable:architecture_test_modularization',
            'unitTests', to_jsonb(feature.architecture_guards)
          )
        )
        from unnest(feature.symbol_refs) as symbol_ref
      )
  ),
  0,
  'codex'
from feature
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  updated_at = now();
