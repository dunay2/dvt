-- Close the in-flight edit race found by the final PR review. The existing
-- SaveWorkspaceFileContent command remains the sole persistence rail.

update architecture.component_port
set negative_tests = array_append(
  negative_tests,
  'an edit made while a DBT save command is in flight is approved after only the older bytes persist'
)
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC'
  and not (
    'an edit made while a DBT save command is in flight is approved after only the older bytes persist'
    = any(negative_tests)
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values (
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'invariant',
  'A save acknowledgement enters semantic reconciliation only when its persisted bytes still equal the editor buffer; otherwise the buffer remains modified and requires another revision-guarded write.',
  8
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.frontend_component_capability_gaps (
  component_id, gap_id, gap_kind, gap_status, description, owning_task_id,
  raw_gap, source_path, source_content_sha256
)
values (
  'web.component.code.CodeWorkingTreeSync',
  'GAP-CODE-EDIT-DURING-INFLIGHT-DBT-SAVE',
  'state-transition-race',
  'closed',
  'A DBT save acknowledgement entered reconciling even when the editor had changed while that save was in flight, allowing flush to approve an unsaved buffer.',
  'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1',
  jsonb_build_object(
    'requiredProof', 'start save -> edit before receipt -> acknowledge older bytes -> flush persists latest buffer against receipt revision',
    'affectedRail', 'SaveWorkspaceFileContent',
    'closedBy', 'tools/planning-db/migrations/772_dbt_code_inflight_edit_reconciliation_guard.sql'
  ),
  'tools/planning-db/migrations/772_dbt_code_inflight_edit_reconciliation_guard.sql',
  md5('gap:CodeWorkingTreeSync:edit-during-inflight-dbt-save:closed:772')
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

update planning_query_store.frontend_component_validation_evidence
set
  proves = 'A flush persists the latest editor bytes both when an edit occurs during the save command and when it occurs during later semantic reconciliation.',
  raw_evidence = raw_evidence || jsonb_build_object(
    'inFlightEditRequiresSecondWrite', true,
    'inFlightEditUsesReceiptRevision', true,
    'flushWaitsForLatestBytes', true
  ),
  source_path = 'tools/planning-db/migrations/772_dbt_code_inflight_edit_reconciliation_guard.sql',
  source_content_sha256 = md5('evidence:code-inflight-edit-reconciliation-guard:772'),
  updated_at = now()
where component_id = 'web.component.code.CodeWorkingTreeSync'
  and evidence_id = 'EV-CODE-PERSISTENCE-RECONCILIATION-BOUNDARY';

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id =
    'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof'
), reconciled_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select distinct surface
    from target_rail rail
    cross join lateral jsonb_array_elements_text(
      coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
    ) existing(surface)
    union
    select 'tools/planning-db/migrations/772_dbt_code_inflight_edit_reconciliation_guard.sql'
  ) unique_surface
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = reconciled_surfaces.surfaces,
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{allowedImplementationSurfaces}',
    reconciled_surfaces.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/772_dbt_code_inflight_edit_reconciliation_guard.sql',
  source_content_sha256 = repeat(md5('dbt-code-inflight-edit-reconciliation-guard:772'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_surfaces
where rail.rail_id =
  'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof';

do $$
begin
  if not exists (
    select 1
    from planning_query_store.frontend_component_capability_gaps
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and gap_id = 'GAP-CODE-EDIT-DURING-INFLIGHT-DBT-SAVE'
      and gap_status = 'closed'
      and owning_task_id = 'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1'
  ) then
    raise exception 'In-flight DBT save edit race is not closed by the current task';
  end if;

  if exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name <> 'SaveWorkspaceFileContent'
  ) then
    raise exception 'In-flight edit guard introduced a parallel command/query rail';
  end if;
end
$$;
