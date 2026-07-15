-- Extend the existing dbt roundtrip manifests with the graph-draft Source
-- Import replay postcondition helper. No command, query, or feature is added.

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#frontend-gap-rail-reconciliation-20260619#command#importdbtproject',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
), extension as (
  select
    target_rail.rail_id,
    jsonb_build_object(
      'name', 'readPersistedImportedNodeIds',
      'path', 'apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts',
      'dddOwner', 'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
      'cqRails', jsonb_build_array('ImportWarehouseSources'),
      'fowlerSignals', jsonb_build_array('Strategy', 'Postcondition Verification'),
      'architectureGuard', 'pnpm --filter dvt-api test:arch',
      'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'unitTests', jsonb_build_array(
        'apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts'
      )
    ) as symbol,
    (
      select jsonb_agg(item order by item #>> '{}')
      from (
        select distinct item
        from jsonb_array_elements(
          coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb)
          || jsonb_build_array(
            'scripts/planning-db-migrate.test.cjs',
            'tools/planning-db/migrations/685_graph_draft_source_import_replay_postcondition.sql',
            'tools/planning-db/migrations/686_graph_draft_source_import_replay_feature_symbol.sql'
          )
        ) surfaces(item)
      ) distinct_surfaces
    ) as surfaces
  from target_rail
), reconciled as (
  select
    extension.*,
    (
      select jsonb_agg(item order by path, name)
      from (
        select distinct on (path, name) item, path, name
        from (
          select
            item,
            item ->> 'path' as path,
            coalesce(item ->> 'name', item ->> 'symbol') as name,
            0 as priority
          from target_rail,
            lateral jsonb_array_elements(
              coalesce(target_rail.raw_manifest -> 'symbols', '[]'::jsonb)
            ) current_symbol(item)
          where target_rail.rail_id = extension.rail_id
          union all
          select extension.symbol, extension.symbol ->> 'path', extension.symbol ->> 'name', 1
        ) candidates
        where path is not null and name is not null
        order by path, name, priority desc
      ) distinct_symbols
    ) as all_symbols
  from extension
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = (
    select jsonb_agg(
      to_jsonb((item ->> 'path') || '#' || (item ->> 'name'))
      order by item ->> 'path', item ->> 'name'
    )
    from jsonb_array_elements(reconciled.all_symbols) symbol(item)
  ),
  implementation_refs = reconciled.surfaces,
  allowed_implementation_surfaces = reconciled.surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(rail.raw_manifest, '{symbols}', reconciled.all_symbols, true),
    '{allowedImplementationSurfaces}',
    reconciled.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/686_graph_draft_source_import_replay_feature_symbol.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':source-import-replay-symbol:686'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled
where rail.rail_id = reconciled.rail_id;

do $$
declare
  reconciled_rail_count integer;
begin
  select count(*) into reconciled_rail_count
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#frontend-gap-rail-reconciliation-20260619#command#importdbtproject',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
    and exists (
      select 1
      from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) symbol(item)
      where item ->> 'path' = 'apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts'
        and item ->> 'name' = 'readPersistedImportedNodeIds'
        and item -> 'cqRails' = jsonb_build_array('ImportWarehouseSources')
    );

  if reconciled_rail_count <> 2 then
    raise exception 'Source Import replay postcondition requires symbol evidence on exactly two dbt roundtrip rails, found %', reconciled_rail_count;
  end if;
end $$;
