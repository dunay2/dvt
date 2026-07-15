-- Fail closed when generated dbt output and installed dependency directories
-- overlap, because one path cannot safely carry both lifecycle roles.

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY'
  and item_kind = 'invariant'
  and item_value = 'Generated artifact paths and installed dependency paths are contained, disjoint from configured source, and semantically distinct.';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values (
  'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
  'invariant',
  'Generated artifact paths and installed dependency paths are contained, mutually non-overlapping, disjoint from configured source, and semantically distinct.',
  1
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
), overlap_symbol as (
  select
    target_rail.rail_id,
    target_rail.rail_name,
    jsonb_build_object(
      'name', 'nonSourcePathsOverlap',
      'path', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts',
      'dddOwner', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
      'cqRails', jsonb_build_array(target_rail.rail_name),
      'fowlerSignals', jsonb_build_array('Policy', 'Specification'),
      'architectureGuard', 'pnpm --filter dvt-api test:arch',
      'cypressCoverage', 'not_applicable:server_source_path_policy',
      'unitTests', jsonb_build_array('apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts')
    ) as item
  from target_rail
), reconciled as (
  select
    overlap_symbol.rail_id,
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
          from target_rail,
            lateral jsonb_array_elements(
              coalesce(target_rail.raw_manifest -> 'symbols', '[]'::jsonb)
            ) current_symbol(item)
          where target_rail.rail_id = overlap_symbol.rail_id
          union all
          select
            overlap_symbol.item,
            overlap_symbol.item ->> 'path',
            overlap_symbol.item ->> 'name',
            1
        ) candidates
        where path is not null and name is not null
        order by path, name, priority desc
      ) distinct_symbols
    ) as symbols
  from overlap_symbol
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = (
    select jsonb_agg(
      to_jsonb((item ->> 'path') || '#' || (item ->> 'name'))
      order by item ->> 'path', item ->> 'name'
    )
    from jsonb_array_elements(reconciled.symbols) symbol(item)
  ),
  raw_manifest = jsonb_set(rail.raw_manifest, '{symbols}', reconciled.symbols, true),
  source_path = 'tools/planning-db/migrations/688_dbt_project_non_source_path_overlap_guard.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':non-source-path-overlap:688'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled
where rail.rail_id = reconciled.rail_id;

do $$
declare
  governed_rail_count integer;
begin
  select count(*) into governed_rail_count
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
    and exists (
      select 1
      from jsonb_array_elements(
        coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
      ) symbol(item)
      where item ->> 'path' = 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts'
        and item ->> 'name' = 'nonSourcePathsOverlap'
    );

  if governed_rail_count <> 2 then
    raise exception 'dbt non-source path overlap guard requires exactly two reconciled query rails, found %', governed_rail_count;
  end if;
end $$;
