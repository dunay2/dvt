-- Split analyzer tests by component responsibility and make each source
-- symbol point at the focused evidence that exercises its behavior.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/test/infrastructure/dbt/dbtAnalyzerProcess.test.ts', 6),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/test/infrastructure/dbt/dbtManifestProjection.test.ts', 7),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/test/infrastructure/dbt/dbtProjectContentRevision.test.ts', 8)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-DBT-ANALYZER-PROCESS-BOUNDARY',
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'apps/api/test/infrastructure/dbt/dbtAnalyzerProcess.test.ts',
    'unit',
    'negative',
    true,
    'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/dbtAnalyzerProcess.test.ts'
  ),
  (
    'TEST-DBT-MANIFEST-PROJECTION',
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'apps/api/test/infrastructure/dbt/dbtManifestProjection.test.ts',
    'unit',
    'behavior',
    true,
    'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/dbtManifestProjection.test.ts'
  ),
  (
    'TEST-DBT-PROJECT-CONTENT-REVISION',
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'apps/api/test/infrastructure/dbt/dbtProjectContentRevision.test.ts',
    'unit',
    'boundary',
    true,
    'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/dbtProjectContentRevision.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
), reconciled_symbols as (
  select jsonb_agg(
    case symbol ->> 'path'
      when 'apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts'
        then jsonb_set(
          symbol,
          '{unitTests}',
          jsonb_build_array('apps/api/test/infrastructure/dbt/dbtAnalyzerProcess.test.ts'),
          true
        )
      when 'apps/api/src/infrastructure/dbt/dbtManifestProjection.ts'
        then jsonb_set(
          symbol,
          '{unitTests}',
          jsonb_build_array('apps/api/test/infrastructure/dbt/dbtManifestProjection.test.ts'),
          true
        )
      when 'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts'
        then jsonb_set(
          symbol,
          '{unitTests}',
          jsonb_build_array('apps/api/test/infrastructure/dbt/dbtProjectContentRevision.test.ts'),
          true
        )
      else symbol
    end
    order by symbol ->> 'path', symbol ->> 'name'
  ) as symbols
  from target_rail,
    lateral jsonb_array_elements(coalesce(raw_manifest -> 'symbols', '[]'::jsonb)) as item(symbol)
), reconciled_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select surface
    from target_rail,
      lateral jsonb_array_elements_text(
        coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      ) as item(surface)
    where surface not in (
      'tools/planning-db/migrations/650_dbt_project_file_projection_phase2_web_closeout.sql',
      'tools/planning-db/migrations/651_dbt_project_file_projection_phase2_live_closeout.sql'
    )

    union
    values
      ('tools/planning-db/migrations/650_dbt_project_file_projection_phase2_test_ownership.sql'),
      ('tools/planning-db/migrations/651_dbt_project_file_projection_phase2_web_closeout.sql'),
      ('tools/planning-db/migrations/652_dbt_project_file_projection_phase2_live_closeout.sql')
  ) as all_surfaces(surface)
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array(
      'apps/api/test/infrastructure/dbt/dbtAnalyzerProcess.test.ts',
      'apps/api/test/infrastructure/dbt/dbtManifestProjection.test.ts',
      'apps/api/test/infrastructure/dbt/dbtProjectContentRevision.test.ts',
      'tools/planning-db/migrations/650_dbt_project_file_projection_phase2_test_ownership.sql'
    ),
  allowed_implementation_surfaces = reconciled_surfaces.surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(
      rail.raw_manifest,
      '{symbols}',
      reconciled_symbols.symbols,
      true
    ),
    '{allowedImplementationSurfaces}',
    reconciled_surfaces.surfaces,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_symbols
cross join reconciled_surfaces
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
