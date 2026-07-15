-- Reconcile the exact source symbols and migration surfaces introduced by the
-- dbt path partition review fixes without creating a parallel rail.

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
), rail_surfaces as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(item order by item #>> '{}')
      from (
        select distinct item
        from jsonb_array_elements(
          coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb)
          || jsonb_build_array(
            'tools/planning-db/migrations/688_dbt_project_non_source_path_overlap_guard.sql',
            'tools/planning-db/migrations/689_dbt_project_path_partition_manifest_reconciliation.sql'
          )
        ) surfaces(item)
      ) distinct_surfaces
    ) as surfaces
  from target_rail
), desired_inspector_symbol(name) as (
  values
    ('DirectoryRole'),
    ('excludedDirectoryReason'),
    ('resolveDirectoryRole')
), inspector_symbol_items as (
  select jsonb_build_object(
    'name', desired_inspector_symbol.name,
    'path', 'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts',
    'dddOwner', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
    'cqRails', jsonb_build_array('ValidateDbtProjectImport'),
    'fowlerSignals', jsonb_build_array('Gateway', 'Policy'),
    'architectureGuard', 'pnpm --filter dvt-api test:arch',
    'cypressCoverage', 'not_applicable:filesystem_inspector_is_exercised_by_boundary_tests',
    'unitTests', jsonb_build_array('apps/api/test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts')
  ) as item
  from desired_inspector_symbol
), reconciled_inspector as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(item order by path, name)
      from (
        select distinct on (path, name) item, path, name
        from (
          select
            current_symbol.item,
            current_symbol.item ->> 'path' as path,
            coalesce(current_symbol.item ->> 'name', current_symbol.item ->> 'symbol') as name,
            0 as priority
          from jsonb_array_elements(
            coalesce(target_rail.raw_manifest -> 'symbols', '[]'::jsonb)
          ) current_symbol(item)
          where not (
            current_symbol.item ->> 'path' = 'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts'
            and coalesce(current_symbol.item ->> 'name', current_symbol.item ->> 'symbol') = 'RUNTIME_DIRECTORIES'
          )
          union all
          select
            inspector_symbol_items.item,
            inspector_symbol_items.item ->> 'path',
            inspector_symbol_items.item ->> 'name',
            1
          from inspector_symbol_items
        ) candidates
        where path is not null and name is not null
        order by path, name, priority desc
      ) distinct_symbols
    ) as symbols
  from target_rail
  where lower(target_rail.rail_name) = 'validatedbtprojectimport'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = case
    when reconciled_inspector.symbols is null then rail.symbol_refs
    else (
      select jsonb_agg(
        to_jsonb((item ->> 'path') || '#' || (item ->> 'name'))
        order by item ->> 'path', item ->> 'name'
      )
      from jsonb_array_elements(reconciled_inspector.symbols) symbol(item)
    )
  end,
  implementation_refs = rail_surfaces.surfaces,
  allowed_implementation_surfaces = rail_surfaces.surfaces,
  raw_manifest = jsonb_set(
    case
      when reconciled_inspector.symbols is null then rail.raw_manifest
      else jsonb_set(rail.raw_manifest, '{symbols}', reconciled_inspector.symbols, true)
    end,
    '{allowedImplementationSurfaces}',
    rail_surfaces.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/689_dbt_project_path_partition_manifest_reconciliation.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':path-partition-manifest:689'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from rail_surfaces
left join reconciled_inspector on reconciled_inspector.rail_id = rail_surfaces.rail_id
where rail.rail_id = rail_surfaces.rail_id;

do $$
declare
  governed_rail_count integer;
  inspector_symbol_count integer;
begin
  select count(*) into governed_rail_count
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
    and rail.allowed_implementation_surfaces ? 'tools/planning-db/migrations/688_dbt_project_non_source_path_overlap_guard.sql'
    and rail.allowed_implementation_surfaces ? 'tools/planning-db/migrations/689_dbt_project_path_partition_manifest_reconciliation.sql';

  select count(*) into inspector_symbol_count
  from jsonb_array_elements(
    (
      select rail.raw_manifest -> 'symbols'
      from planning_query_store.feature_mechanization_local_rails rail
      where lower(rail.rail_name) = 'validatedbtprojectimport'
    )
  ) symbol(item)
  where item ->> 'path' = 'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts'
    and item ->> 'name' in ('DirectoryRole', 'excludedDirectoryReason', 'resolveDirectoryRole');

  if governed_rail_count <> 2 or inspector_symbol_count <> 3 then
    raise exception 'dbt path partition manifest reconciliation failed: rails %, inspector symbols %', governed_rail_count, inspector_symbol_count;
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail,
      lateral jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) symbol(item)
    where lower(rail.rail_name) = 'validatedbtprojectimport'
      and item ->> 'path' = 'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts'
      and item ->> 'name' = 'RUNTIME_DIRECTORIES'
  ) then
    raise exception 'stale RUNTIME_DIRECTORIES symbol remains on ValidateDbtProjectImport';
  end if;
end $$;
