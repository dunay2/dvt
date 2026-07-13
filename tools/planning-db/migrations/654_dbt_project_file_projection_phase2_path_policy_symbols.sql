-- Declare every production symbol in the dbt snapshot path policy and keep
-- the remaining Web/live closeout migrations reserved without rewriting the
-- already-applied authority hardening migration.

with declared_symbol(path, name) as (
  values
    ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'DbtProjectPathPolicyResult'),
    ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'PATH_SETTING'),
    ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'TEMPLATE_MARKER'),
    ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'evaluateDbtProjectPathPolicy'),
    ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'evaluateDbtProjectSnapshotPathPolicy'),
    ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'isRecord'),
    ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'isSnapshotContainedRelativePath'),
    ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'listDbtProjectFiles'),
    ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'readConfiguredPaths')
), symbol_manifest as (
  select
    jsonb_agg(
      jsonb_build_object(
        'name', name,
        'path', path,
        'dddOwner', 'IDbtProjectAnalyzerPort',
        'cqRails', jsonb_build_array('ProjectDbtGraphFromFiles'),
        'fowlerSignals', jsonb_build_array('Boundary drift'),
        'architectureGuard', 'pnpm --filter dvt-api test:arch',
        'cypressCoverage', 'not_applicable:server_snapshot_path_policy',
        'unitTests', jsonb_build_array(
          'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts',
          'apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts'
        )
      ) order by path, name
    ) as symbols,
    jsonb_agg(to_jsonb(path || '#' || name) order by path, name) as symbol_refs
  from declared_symbol
), reconciled_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select surface
    from planning_query_store.feature_mechanization_local_rails rail,
      lateral jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
      ) as item(surface)
    where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
      and surface not in (
        'tools/planning-db/migrations/654_dbt_project_file_projection_phase2_web_closeout.sql',
        'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_live_closeout.sql'
      )

    union
    values
      ('tools/planning-db/migrations/654_dbt_project_file_projection_phase2_path_policy_symbols.sql'),
      ('tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_closeout.sql'),
      ('tools/planning-db/migrations/656_dbt_project_file_projection_phase2_live_closeout.sql')
  ) as all_surfaces(surface)
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = coalesce(rail.symbol_refs, '[]'::jsonb) || symbol_manifest.symbol_refs,
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/654_dbt_project_file_projection_phase2_path_policy_symbols.sql'
    ),
  allowed_implementation_surfaces = reconciled_surfaces.surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(
      rail.raw_manifest,
      '{symbols}',
      coalesce(rail.raw_manifest->'symbols', '[]'::jsonb) || symbol_manifest.symbols,
      true
    ),
    '{allowedImplementationSurfaces}',
    reconciled_surfaces.surfaces,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from symbol_manifest, reconciled_surfaces
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';
