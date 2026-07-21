-- Preserve semantic receipt authority across editor reversions without allowing
-- an older reconciliation result to erase a newer persistence terminal state.
-- SaveWorkspaceFileContent remains the sole component command rail.

update architecture.component_port
set negative_tests = array_append(
  negative_tests,
  'an edit reverted to persisted bytes hides its still-pending semantic reconciliation receipt'
)
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC'
  and not (
    'an edit reverted to persisted bytes hides its still-pending semantic reconciliation receipt'
    = any(negative_tests)
  );

update architecture.component_port
set negative_tests = array_append(
  negative_tests,
  'an older reconciliation outcome erases a newer persistence conflict or failure'
)
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC'
  and not (
    'an older reconciliation outcome erases a newer persistence conflict or failure'
    = any(negative_tests)
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'Editor byte equality never proves semantic freshness: a matching pending save receipt remains authoritative until its correlated reconciliation outcome settles.',
    9
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'A reconciliation outcome may update only its matching receipt state and cannot erase a newer SaveWorkspaceFileContent conflict, failure, or in-flight command.',
    10
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.frontend_component_capability_gaps (
  component_id, gap_id, gap_kind, gap_status, description, owning_task_id,
  raw_gap, source_path, source_content_sha256
)
values (
  'web.component.code.CodeWorkingTreeSync',
  'GAP-CODE-PENDING-RECEIPT-REVERSION',
  'state-transition-race',
  'closed',
  'Reverting an edit to persisted bytes hid the still-pending semantic receipt and caused its matching completion or failure to be ignored.',
  'E-WEB-DBT-RECONCILIATION-RECEIPT-TRUTH-1',
  jsonb_build_object(
    'requiredProof', 'save receipt pending -> edit -> revert -> matching outcome remains authoritative',
    'affectedRail', 'SaveWorkspaceFileContent',
    'closedBy', 'tools/planning-db/migrations/791_code_working_tree_receipt_precedence.sql'
  ),
  'tools/planning-db/migrations/791_code_working_tree_receipt_precedence.sql',
  md5('gap:CodeWorkingTreeSync:pending-receipt-reversion:closed:791')
)
on conflict (component_id, gap_id) do update set
  gap_kind = excluded.gap_kind,
  gap_status = excluded.gap_status,
  description = excluded.description,
  owning_task_id = excluded.owning_task_id,
  raw_gap = excluded.raw_gap,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
), desired_symbol as (
  select
    jsonb_build_object(
      'name', symbol_name,
      'path', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts',
      'dddOwner', 'SYS-WEB-CODE-WORKING-TREE-SYNC',
      'cqRails', jsonb_build_array('SaveWorkspaceFileContent'),
      'fowlerSignals', jsonb_build_array('State Machine', 'Presentation Model'),
      'architectureGuard',
        'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/code/codeWorkingTreeSyncModel.test.ts',
      'cypressCoverage',
        'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
      'unitTests', jsonb_build_array(
        'apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts'
      )
    ) as item,
    'apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts'::text as path,
    symbol_name as name
  from unnest(array[
    'projectCodeWorkingTreeSyncPhase',
    'projectReconciliationTransition'
  ]) symbol_name
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
          select 'tools/planning-db/migrations/791_code_working_tree_receipt_precedence.sql'
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
  source_path = 'tools/planning-db/migrations/791_code_working_tree_receipt_precedence.sql',
  source_content_sha256 = repeat(md5('code-working-tree-receipt-precedence:791'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from manifest
where rail.rail_id =
  'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof';

do $$
begin
  if not exists (
    select 1
    from planning_query_store.frontend_component_capability_gaps
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and gap_id = 'GAP-CODE-PENDING-RECEIPT-REVERSION'
      and gap_status = 'closed'
      and owning_task_id = 'E-WEB-DBT-RECONCILIATION-RECEIPT-TRUTH-1'
  ) then
    raise exception 'Pending receipt reversion gap is not closed by the current task';
  end if;

  if exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name <> 'SaveWorkspaceFileContent'
  ) then
    raise exception 'Receipt precedence hardening introduced a parallel command/query rail';
  end if;

  if (
    select count(distinct symbol.value ->> 'name')
    from planning_query_store.feature_mechanization_local_rails rail
    cross join lateral jsonb_array_elements(
      coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
    ) symbol(value)
    where rail.feature_id = 'E-DBT-CODE-WORKING-TREE-SYNC-20260712'
      and symbol.value ->> 'name' in (
        'projectCodeWorkingTreeSyncPhase',
        'projectReconciliationTransition'
      )
  ) <> 2 then
    raise exception 'Receipt precedence state-machine symbols are not fully mechanized';
  end if;
end
$$;
