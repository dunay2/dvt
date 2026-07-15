-- Reconcile the complete source-path policy symbol set with the two existing
-- dbt project query rails. This extends their shared feature manifest; it does
-- not introduce a command, query, or parallel product intent.

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
), extension_symbol(rail_name, name) as (
  values
    ('ProjectDbtGraphFromFiles', 'evaluateDbtProjectPathPolicy'),
    ('ProjectDbtGraphFromFiles', 'normalizeContainedRelativePath'),
    ('ProjectDbtGraphFromFiles', 'parseDbtProjectDocument'),
    ('ValidateDbtProjectImport', 'evaluateDbtProjectPathPolicy'),
    ('ValidateDbtProjectImport', 'normalizeContainedRelativePath'),
    ('ValidateDbtProjectImport', 'parseDbtProjectDocument')
), extension as (
  select
    target_rail.rail_id,
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', symbol.name,
          'path', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts',
          'dddOwner', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
          'cqRails', jsonb_build_array(target_rail.rail_name),
          'fowlerSignals', jsonb_build_array('Policy', 'Separated Interface'),
          'architectureGuard', 'pnpm --filter dvt-api test:arch',
          'cypressCoverage', 'not_applicable:server_source_path_policy',
          'unitTests', jsonb_build_array(
            'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'
          )
        ) order by symbol.name
      )
      from extension_symbol symbol
      where symbol.rail_name = target_rail.rail_name
    ) as symbols,
    (
      select jsonb_agg(item order by item #>> '{}')
      from (
        select distinct item
        from jsonb_array_elements(
          coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb)
          || jsonb_build_array(
            'scripts/planning-db-migrate.test.cjs',
            'tools/planning-db/migrations/683_dbt_project_source_path_policy_maturity.sql',
            'tools/planning-db/migrations/684_dbt_project_source_path_policy_feature_mechanization.sql'
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
          select item, item ->> 'path', item ->> 'name', 1
          from jsonb_array_elements(extension.symbols) added_symbol(item)
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
  source_path = 'tools/planning-db/migrations/684_dbt_project_source_path_policy_feature_mechanization.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':source-path-policy-mechanization:684'), 2),
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
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
    and (
      select count(*)
      from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) symbol(item)
      where item ->> 'path' = 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts'
        and item ->> 'name' in (
          'evaluateDbtProjectPathPolicy',
          'normalizeContainedRelativePath',
          'parseDbtProjectDocument'
        )
    ) = 3;

  if reconciled_rail_count <> 2 then
    raise exception 'dbt source-path policy requires complete symbol evidence on exactly two query rails, found %', reconciled_rail_count;
  end if;
end $$;
