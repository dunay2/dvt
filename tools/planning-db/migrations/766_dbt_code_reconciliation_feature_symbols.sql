-- Reconcile the final DBT Code persistence/analysis hardening with the two
-- existing feature manifests. This migration adds no product rail: it only
-- completes symbol ownership for the canonical Code working-tree and strict
-- YAML browser-proof capabilities.

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id =
    'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof'
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
), desired_symbol_group(
  file_path,
  ddd_owner,
  cq_rails,
  fowler_signals,
  architecture_guard,
  unit_tests,
  symbol_names
) as (
  values
    (
      'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts',
      'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
      jsonb_build_array('ProjectDbtGraphFromFiles'),
      jsonb_build_array('Mapper', 'Published Language'),
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/dbtProjectCodeReconciliation.test.ts',
      jsonb_build_array(
        'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.test.ts'
      ),
      jsonb_build_array('projectDbtCodeReconciliationOutcome')
    ),
    (
      'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx',
      'SYS-WEB-CODE-WORKING-TREE-SYNC',
      jsonb_build_array('SaveWorkspaceFileContent'),
      jsonb_build_array('Supervising Controller', 'Presentation Model'),
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx',
      jsonb_build_array(
        'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx'
      ),
      jsonb_build_array(
        'CodeWorkingTreeNavigationGuard',
        'CodeWorkingTreeNavigationGuardProps',
        'OptionalRouterNavigationGuard',
        'RouterNavigationGuard'
      )
    ),
    (
      'apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts',
      'SYS-WEB-CODE-WORKING-TREE-SYNC',
      jsonb_build_array('SaveWorkspaceFileContent'),
      jsonb_build_array('State Machine', 'Value Object'),
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/code/codeWorkingTreeSyncModel.test.ts',
      jsonb_build_array(
        'apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts'
      ),
      jsonb_build_array(
        'CodeWorkingTreeReconciliationOutcome',
        'PersistedReconciliationPhase',
        'isCodeWorkingTreeNavigationBlockedPhase',
        'isCodeWorkingTreeReconciliationRetryablePhase',
        'isCodeWorkingTreeReconciliationUnresolvedPhase',
        'mapDegradedReconciliationPhase',
        'mapReconciliationOutcomePhase'
      )
    ),
    (
      'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.ts',
      'SYS-WEB-CODE-WORKING-TREE-SYNC',
      jsonb_build_array('SaveWorkspaceFileContent', 'GetWorkspaceFileContent'),
      jsonb_build_array('Policy', 'Value Object'),
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/code/workspaceFileReconciliationAuthority.test.ts',
      jsonb_build_array(
        'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.test.ts'
      ),
      jsonb_build_array('reconcileWorkspaceFileAuthority')
    )
), desired_symbol as (
  select
    jsonb_build_object(
      'name', symbol_name.value,
      'path', symbol_group.file_path,
      'dddOwner', symbol_group.ddd_owner,
      'cqRails', symbol_group.cq_rails,
      'fowlerSignals', symbol_group.fowler_signals,
      'architectureGuard', symbol_group.architecture_guard,
      'cypressCoverage',
        'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
      'unitTests', symbol_group.unit_tests
    ) as item,
    symbol_group.file_path as path,
    symbol_name.value as name
  from desired_symbol_group symbol_group
  cross join lateral jsonb_array_elements_text(symbol_group.symbol_names) symbol_name(value)
), reconciled_symbol as (
  select distinct on (path, name) item, path, name
  from (
    select existing_symbol.item, existing_symbol.path, existing_symbol.name, 0 as priority
    from existing_symbol
    union all
    select desired_symbol.item, desired_symbol.path, desired_symbol.name, 1 as priority
    from desired_symbol
  ) candidate
  order by path, name, priority desc
), manifest as (
  select
    jsonb_agg(item order by path, name) as symbols,
    jsonb_agg(to_jsonb(path || '#' || name) order by path, name) as symbol_refs,
    (
      select jsonb_agg(to_jsonb(file_path) order by file_path)
      from (
        select distinct path as file_path
        from reconciled_symbol
      ) implementation_paths
    ) as implementation_refs,
    (
      select jsonb_agg(to_jsonb(surface) order by surface)
      from (
        select distinct surface
        from (
          select path as surface from reconciled_symbol
          union all
          select value as surface
          from target_rail rail
          cross join lateral jsonb_array_elements_text(
            coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
          ) existing_surface(value)
          union all
          select 'tools/planning-db/migrations/766_dbt_code_reconciliation_feature_symbols.sql'
        ) surface_candidate
      ) surfaces
    ) as allowed_surfaces
  from reconciled_symbol
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = manifest.symbol_refs,
  implementation_refs = manifest.implementation_refs,
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
  source_path = 'tools/planning-db/migrations/766_dbt_code_reconciliation_feature_symbols.sql',
  source_content_sha256 = repeat(md5('dbt-code-reconciliation-symbols:766'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from manifest
where rail.rail_id =
  'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof';

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
    and rail.rail_name in (
      'ProposeDbtYamlDescriptionEdit',
      'ApplyDbtYamlDescriptionEdit',
      'RevertDbtYamlDescriptionEdit'
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
  order by path, name, rail.rail_name
), desired_symbol as (
  select
    jsonb_build_object(
      'name', symbol_name,
      'path', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
      'dddOwner', 'DbtYamlDescriptionStrictBrowserProof',
      'cqRails', jsonb_build_array(
        'ProposeDbtYamlDescriptionEdit',
        'ApplyDbtYamlDescriptionEdit',
        'RevertDbtYamlDescriptionEdit'
      ),
      'fowlerSignals', jsonb_build_array(
        'strict browser evidence',
        'fake success prevention'
      ),
      'architectureGuard',
        'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
      'cypressCoverage',
        'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
      'unitTests', jsonb_build_array(
        'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
      )
    ) as item,
    'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'::text as path,
    symbol_name as name
  from unnest(array['INVALID_MODEL_SQL', 'replaceOpenCodeContent']) symbol_name
), reconciled_symbol as (
  select distinct on (path, name) item, path, name
  from (
    select existing_symbol.item, existing_symbol.path, existing_symbol.name, 0 as priority
    from existing_symbol
    union all
    select desired_symbol.item, desired_symbol.path, desired_symbol.name, 1 as priority
    from desired_symbol
  ) candidate
  order by path, name, priority desc
), manifest as (
  select
    jsonb_agg(item order by path, name) as symbols,
    jsonb_agg(to_jsonb(path || '#' || name) order by path, name) as symbol_refs,
    (
      select jsonb_agg(to_jsonb(file_path) order by file_path)
      from (
        select distinct path as file_path
        from reconciled_symbol
      ) implementation_paths
    ) as implementation_refs,
    (
      select jsonb_agg(to_jsonb(surface) order by surface)
      from (
        select distinct surface
        from (
          select path as surface from reconciled_symbol
          union all
          select value as surface
          from target_rail rail
          cross join lateral jsonb_array_elements_text(
            coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
          ) existing_surface(value)
          union all
          select 'tools/planning-db/migrations/766_dbt_code_reconciliation_feature_symbols.sql'
        ) surface_candidate
      ) surfaces
    ) as allowed_surfaces
  from reconciled_symbol
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = manifest.symbol_refs,
  implementation_refs = manifest.implementation_refs,
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
  source_path = 'tools/planning-db/migrations/766_dbt_code_reconciliation_feature_symbols.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':strict-live-symbols:766'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from manifest
where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
  and rail.rail_name in (
    'ProposeDbtYamlDescriptionEdit',
    'ApplyDbtYamlDescriptionEdit',
    'RevertDbtYamlDescriptionEdit'
  );

do $$
declare
  code_symbol_count integer;
  yaml_symbol_count integer;
  code_rail_count integer;
  yaml_rail_count integer;
begin
  select count(*) into code_symbol_count
  from (
    select distinct symbol.value ->> 'path' as path, symbol.value ->> 'name' as name
    from planning_query_store.command_query_rail_manifest_query rail
    cross join lateral jsonb_array_elements(
      coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
    ) symbol(value)
    where rail.raw_manifest ->> 'featureId' = 'E-DBT-CODE-WORKING-TREE-SYNC-20260712'
  ) symbols;

  select count(*) into yaml_symbol_count
  from (
    select distinct symbol.value ->> 'path' as path, symbol.value ->> 'name' as name
    from planning_query_store.feature_mechanization_local_rails rail
    cross join lateral jsonb_array_elements(
      coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
    ) symbol(value)
    where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
  ) symbols;

  select count(distinct (rail_type, normalized_rail_name)) into code_rail_count
  from planning_query_store.command_query_rail_manifest_query
  where raw_manifest ->> 'featureId' = 'E-DBT-CODE-WORKING-TREE-SYNC-20260712';

  select count(*) into yaml_rail_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1';

  if code_symbol_count <> 39 then
    raise exception 'Code working-tree feature must declare 39 unique symbols, found %',
      code_symbol_count;
  end if;
  if yaml_symbol_count <> 210 then
    raise exception 'DBT YAML description feature must declare 210 unique symbols, found %',
      yaml_symbol_count;
  end if;
  if code_rail_count <> 4 then
    raise exception 'Code working-tree feature rail catalog changed unexpectedly: %',
      code_rail_count;
  end if;
  if yaml_rail_count <> 3 then
    raise exception 'DBT YAML description feature rail catalog changed unexpectedly: %',
      yaml_rail_count;
  end if;
end
$$;
