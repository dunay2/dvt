-- Extend the existing Code working-tree feature manifest with the two private
-- identity helpers introduced by race hardening and the governing migrations.
-- No product rail or feature alias is added.

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id =
    'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof'
), desired_symbol(path, name, fowler_signals, architecture_guard, unit_test) as (
  values
    (
      'apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts'::text,
      'isSameSaveReceipt'::text,
      jsonb_build_array('State Machine', 'Value Object'),
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/code/codeWorkingTreeSyncModel.test.ts'::text,
      'apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts'::text
    ),
    (
      'apps/web/src/app/views/code/useCodeWorkingTreeSync.ts'::text,
      'createSaveReceiptKey'::text,
      jsonb_build_array('Asynchronous Boundary', 'Value Object'),
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/code/useCodeWorkingTreeSync.test.tsx'::text,
      'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx'::text
    )
), existing_symbol as (
  select distinct on (path, name)
    symbol.item,
    path,
    name
  from target_rail rail
  cross join lateral jsonb_array_elements(
    coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
  ) symbol(item)
  cross join lateral (
    values (
      symbol.item ->> 'path',
      coalesce(symbol.item ->> 'name', symbol.item ->> 'symbol')
    )
  ) identity(path, name)
  where path is not null
    and name is not null
  order by path, name
), reconciled_symbol as (
  select distinct on (path, name) item, path, name
  from (
    select existing.item, existing.path, existing.name, 0 as priority
    from existing_symbol existing
    union all
    select
      jsonb_build_object(
        'name', desired.name,
        'path', desired.path,
        'dddOwner', 'SYS-WEB-CODE-WORKING-TREE-SYNC',
        'cqRails', jsonb_build_array('SaveWorkspaceFileContent'),
        'fowlerSignals', desired.fowler_signals,
        'architectureGuard', desired.architecture_guard,
        'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'unitTests', jsonb_build_array(desired.unit_test)
      ),
      desired.path,
      desired.name,
      1
    from desired_symbol desired
  ) candidate
  order by path, name, priority desc
), manifest as (
  select
    jsonb_agg(item order by path, name) as symbols,
    jsonb_agg(to_jsonb(path || '#' || name) order by path, name) as symbol_refs,
    (
      select jsonb_agg(to_jsonb(surface) order by surface)
      from (
        select distinct surface
        from (
          select value as surface
          from target_rail rail
          cross join lateral jsonb_array_elements_text(
            coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
          ) existing_surface(value)
          union all
          values
            ('tools/planning-db/migrations/767_dbt_code_reconciliation_race_hardening.sql'),
            ('tools/planning-db/migrations/768_dbt_code_reconciliation_race_closeout.sql'),
            ('tools/planning-db/migrations/769_dbt_code_reconciliation_race_feature_symbols.sql')
        ) surface_candidate
      ) unique_surface
    ) as allowed_surfaces
  from reconciled_symbol
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = manifest.symbol_refs,
  allowed_implementation_surfaces = manifest.allowed_surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{symbols}',
      manifest.symbols,
      true
    ),
    '{allowedImplementationSurfaces}',
    manifest.allowed_surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/769_dbt_code_reconciliation_race_feature_symbols.sql',
  source_content_sha256 = repeat(md5('dbt-code-reconciliation-race-symbols:769'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from manifest
where rail.rail_id =
  'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof';

do $$
declare
  symbol_count integer;
  required_surface_count integer;
begin
  select count(*) into symbol_count
  from (
    select distinct symbol.item ->> 'path' as path, symbol.item ->> 'name' as name
    from planning_query_store.feature_mechanization_local_rails rail
    cross join lateral jsonb_array_elements(
      coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
    ) symbol(item)
    where rail.feature_id = 'E-DBT-CODE-WORKING-TREE-SYNC-20260712'
  ) symbol;

  select count(*) into required_surface_count
  from planning_query_store.feature_mechanization_local_rails rail
  cross join lateral jsonb_array_elements_text(
    coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
  ) surface(value)
  where rail.feature_id = 'E-DBT-CODE-WORKING-TREE-SYNC-20260712'
    and surface.value in (
      'tools/planning-db/migrations/767_dbt_code_reconciliation_race_hardening.sql',
      'tools/planning-db/migrations/768_dbt_code_reconciliation_race_closeout.sql',
      'tools/planning-db/migrations/769_dbt_code_reconciliation_race_feature_symbols.sql'
    );

  if symbol_count <> 20 then
    raise exception 'Code working-tree race manifest must declare 20 unique symbols, found %',
      symbol_count;
  end if;
  if required_surface_count <> 3 then
    raise exception 'Code working-tree race manifest is missing governed migration surfaces: %',
      required_surface_count;
  end if;
end
$$;
