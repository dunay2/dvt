-- Bind the project revision and dbt manifest to the same bounded ephemeral
-- file snapshot. A mutable workspace can change during analysis without
-- producing a revision/manifest pair from different project states.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
  'invariant',
  'Content revision and dbt manifest are produced from the same bounded ephemeral project snapshot.',
  2
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
), reconciled_symbols as (
  select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name') as symbols
  from (
    select symbol
    from target_rail,
      lateral jsonb_array_elements(coalesce(raw_manifest -> 'symbols', '[]'::jsonb)) as item(symbol)
    where not (
      symbol ->> 'path' = 'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts'
      and symbol ->> 'name' in (
        'ProjectContentLimits',
        'collectProjectContent',
        'snapshotProjectContent',
        'writeAll'
      )
    )

    union all

    select jsonb_build_object(
      'name', symbol_name,
      'path', 'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts',
      'dddOwner', 'IDbtProjectAnalyzerPort',
      'cqRails', jsonb_build_array('ProjectDbtGraphFromFiles'),
      'fowlerSignals', jsonb_build_array('Boundary drift'),
      'architectureGuard', 'pnpm --filter dvt-api test:arch',
      'cypressCoverage', 'not_applicable:server_snapshot_boundary',
      'unitTests', jsonb_build_array(
        'apps/api/test/infrastructure/dbt/dbtProjectContentRevision.test.ts',
        'apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts'
      )
    )
    from unnest(array[
      'ProjectContentLimits',
      'collectProjectContent',
      'snapshotProjectContent',
      'writeAll'
    ]) as declared(symbol_name)
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
      'tools/planning-db/migrations/651_dbt_project_file_projection_phase2_web_closeout.sql',
      'tools/planning-db/migrations/652_dbt_project_file_projection_phase2_live_closeout.sql'
    )

    union
    values
      ('tools/planning-db/migrations/651_dbt_project_file_projection_phase2_stable_snapshot.sql'),
      ('tools/planning-db/migrations/652_dbt_project_file_projection_phase2_web_closeout.sql'),
      ('tools/planning-db/migrations/653_dbt_project_file_projection_phase2_live_closeout.sql')
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
      'tools/planning-db/migrations/651_dbt_project_file_projection_phase2_stable_snapshot.sql'
    ),
  allowed_implementation_surfaces = reconciled_manifest.surfaces,
  raw_rail = jsonb_set(
    rail.raw_rail,
    '{negativeTests}',
    coalesce(rail.raw_rail -> 'negativeTests', '[]'::jsonb)
      || jsonb_build_array(
        'parse a bounded project snapshot and preserve revision/manifest consistency while workspace files change'
      ),
    true
  ),
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
set signal_name = 'Project revision and manifest share one bounded ephemeral snapshot; invalid projects expose fixed diagnostics; unsupported resources and traversal limits remain explicit.'
where observability_id = 'OBS-DBT-PROJECT-ANALYZER-RESULT';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
