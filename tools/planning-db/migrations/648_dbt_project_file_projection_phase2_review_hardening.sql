-- Harden the phase-two server analyzer after adversarial review. Arbitrary
-- dbt stdout/stderr is not an HTTP diagnostic surface, and the project byte
-- budget covers every directory because dbt resource paths are configurable.

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
), reconciled_symbols as (
  select coalesce(jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name'), '[]'::jsonb) as symbols
  from (
    select symbol
    from target_rail,
      lateral jsonb_array_elements(coalesce(raw_manifest -> 'symbols', '[]'::jsonb)) as item(symbol)
    where not (
      symbol ->> 'path' = 'apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts'
      and symbol ->> 'name' in (
        'ANSI_ESCAPE_SEQUENCE',
        'extractDbtMessages',
        'normalizeProcessDiagnostic'
      )
    )
      and not (
        symbol ->> 'path' = 'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts'
        and symbol ->> 'name' in ('EXCLUDED_DIRECTORY_NAMES', 'EXCLUDED_FILE_NAMES')
      )

    union all

    select jsonb_build_object(
      'name', 'INVALID_PROJECT_DIAGNOSTIC_MESSAGE',
      'path', 'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts',
      'dddOwner', 'IDbtProjectAnalyzerPort',
      'cqRails', jsonb_build_array('ProjectDbtGraphFromFiles'),
      'fowlerSignals', jsonb_build_array('Boundary drift'),
      'architectureGuard', 'pnpm --filter dvt-api test:arch',
      'cypressCoverage', 'not_applicable:phase_two_contract_and_server_query',
      'unitTests', jsonb_build_array(
        'apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts'
      )
    )
  ) as all_symbols(symbol)
), reconciled_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select surface
    from target_rail,
      lateral jsonb_array_elements_text(
        coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      ) as item(surface)
    where surface not in (
      'tools/planning-db/migrations/648_dbt_project_file_projection_phase2_web_closeout.sql',
      'tools/planning-db/migrations/649_dbt_project_file_projection_phase2_live_closeout.sql'
    )

    union
    values
      ('tools/planning-db/migrations/648_dbt_project_file_projection_phase2_review_hardening.sql'),
      ('tools/planning-db/migrations/649_dbt_project_file_projection_phase2_web_closeout.sql'),
      ('tools/planning-db/migrations/650_dbt_project_file_projection_phase2_live_closeout.sql')
  ) as all_surfaces(surface)
), reconciled_manifest as (
  select
    reconciled_symbols.symbols,
    reconciled_surfaces.surfaces,
    (
      select jsonb_agg(
        to_jsonb((symbol ->> 'path') || '#' || (symbol ->> 'name'))
        order by symbol ->> 'path', symbol ->> 'name'
      )
      from jsonb_array_elements(reconciled_symbols.symbols) as item(symbol)
    ) as symbol_refs
  from reconciled_symbols
  cross join reconciled_surfaces
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = reconciled_manifest.symbol_refs,
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/648_dbt_project_file_projection_phase2_review_hardening.sql'
    ),
  allowed_implementation_surfaces = reconciled_manifest.surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(
      rail.raw_manifest,
      '{symbols}',
      reconciled_manifest.symbols,
      true
    ),
    '{allowedImplementationSurfaces}',
    reconciled_manifest.surfaces,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_manifest
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

update architecture.component_observability
set signal_name = 'Invalid dbt projects expose a fixed safe diagnostic; analyzer output remains server-local, while project resource-path budgets include every directory before process launch.'
where observability_id = 'OBS-DBT-PROJECT-ANALYZER-RESULT';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
