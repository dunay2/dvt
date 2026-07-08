-- Register compact text-search helpers under the existing Planning DB query filter rail.
with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612#query#applyplanningdbquerytextsearchfilter'
),
new_symbols as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'appendCompactTextSearchFilter',
      'path', 'scripts/planning-db/query-filter.cjs',
      'dddOwner', 'PlanningDbQueryFilterHelper',
      'cqRails', jsonb_build_array('ApplyPlanningDbQueryTextSearchFilter'),
      'fowlerSignals', jsonb_build_array('duplicate_query_logic', 'read_model_helper_extraction'),
      'architectureGuard', 'node --test scripts/planning-db-query.test.cjs',
      'cypressCoverage', 'not_applicable:planning_db_cli',
      'unitTests', jsonb_build_array('node --test scripts/planning-db-query.test.cjs')
    ),
    jsonb_build_object(
      'name', 'compactTextSearchColumnExpression',
      'path', 'scripts/planning-db/query-filter.cjs',
      'dddOwner', 'PlanningDbQueryFilterHelper',
      'cqRails', jsonb_build_array('ApplyPlanningDbQueryTextSearchFilter'),
      'fowlerSignals', jsonb_build_array('duplicate_query_logic', 'read_model_helper_extraction'),
      'architectureGuard', 'node --test scripts/planning-db-query.test.cjs',
      'cypressCoverage', 'not_applicable:planning_db_cli',
      'unitTests', jsonb_build_array('node --test scripts/planning-db-query.test.cjs')
    ),
    jsonb_build_object(
      'name', 'normalizeCompactTextSearchValue',
      'path', 'scripts/planning-db/query-filter.cjs',
      'dddOwner', 'PlanningDbQueryFilterHelper',
      'cqRails', jsonb_build_array('ApplyPlanningDbQueryTextSearchFilter'),
      'fowlerSignals', jsonb_build_array('duplicate_query_logic', 'read_model_helper_extraction'),
      'architectureGuard', 'node --test scripts/planning-db-query.test.cjs',
      'cypressCoverage', 'not_applicable:planning_db_cli',
      'unitTests', jsonb_build_array('node --test scripts/planning-db-query.test.cjs')
    )
  ) as symbols
),
new_allowed_surfaces as (
  select jsonb_build_array(
    'scripts/planning-db/query-filter.cjs',
    'scripts/planning-db/queries/command-query-rail-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'tools/planning-db/migrations/556_planning_db_query_compact_filter_symbols.sql'
  ) as surfaces
),
new_implementation_refs as (
  select jsonb_build_array(
    'scripts/planning-db/query-filter.cjs#appendCompactTextSearchFilter',
    'scripts/planning-db/query-filter.cjs#compactTextSearchColumnExpression',
    'scripts/planning-db/query-filter.cjs#normalizeCompactTextSearchValue'
  ) as refs
),
new_red_green_cycles as (
  select jsonb_build_array(
    jsonb_build_object(
      'id', 'planning-db-command-query-rail-spaced-filter',
      'redTest', 'node --test --test-name-pattern "readCommandQueryRailRows normalizes spaced rail filters" scripts/planning-db-query.test.cjs',
      'expectedFailure', 'command-query-rails --filter "Source Import" cannot discover SourceImport rails because the text predicate only matches literal substrings.',
      'patchSurfaces', jsonb_build_array(
        'scripts/planning-db/query-filter.cjs',
        'scripts/planning-db/queries/command-query-rail-query.cjs',
        'scripts/planning-db-query.test.cjs'
      ),
      'greenTest', 'node --test scripts/planning-db-query.test.cjs'
    )
  ) as cycles
),
merged_manifest as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(symbol order by symbol->>'name')
      from (
        select existing.symbol
        from jsonb_array_elements(coalesce(target_rail.raw_manifest->'symbols', '[]'::jsonb)) existing(symbol)
        union all
        select added.symbol
        from new_symbols
        cross join jsonb_array_elements(new_symbols.symbols) added(symbol)
      ) all_symbols
    ) as symbols,
    (
      select jsonb_agg(to_jsonb(surface) order by surface)
      from (
        select distinct surface
        from jsonb_array_elements_text(
          coalesce(target_rail.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
        ) existing(surface)
        union
        select surface
        from new_allowed_surfaces
        cross join jsonb_array_elements_text(new_allowed_surfaces.surfaces) added(surface)
      ) surfaces
    ) as allowed_surfaces,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct ref
        from jsonb_array_elements_text(coalesce(target_rail.implementation_refs, '[]'::jsonb)) existing(ref)
        union
        select ref
        from new_implementation_refs
        cross join jsonb_array_elements_text(new_implementation_refs.refs) added(ref)
      ) refs
    ) as implementation_refs,
    (
      coalesce(target_rail.raw_manifest->'redGreenCycles', '[]'::jsonb)
      || (select cycles from new_red_green_cycles)
    ) as red_green_cycles
  from target_rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = merged_manifest.implementation_refs,
  allowed_implementation_surfaces = merged_manifest.allowed_surfaces,
  source_path = 'tools/planning-db/migrations/556_planning_db_query_compact_filter_symbols.sql',
  source_content_sha256 = md5('PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612:ApplyPlanningDbQueryTextSearchFilter:556'),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(rail.raw_manifest, '{}'::jsonb),
        '{symbols}',
        merged_manifest.symbols,
        true
      ),
      '{allowedImplementationSurfaces}',
      merged_manifest.allowed_surfaces,
      true
    ),
    '{redGreenCycles}',
    merged_manifest.red_green_cycles,
    true
  ),
  revision = rail.revision + 1,
  created_by = 'codex'
from merged_manifest
where rail.rail_id = merged_manifest.rail_id;
