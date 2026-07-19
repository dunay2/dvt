-- Record and close the post-persistence edit race found during PR review.
-- The existing SaveWorkspaceFileContent command remains the only write rail.

update architecture.component_port
set negative_tests = array_append(
  negative_tests,
  'an edit made while an earlier save receipt is reconciling is treated as already persisted'
)
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC'
  and not (
    'an edit made while an earlier save receipt is reconciling is treated as already persisted'
    = any(negative_tests)
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values (
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'invariant',
  'An editor change made after byte persistence but before semantic reconciliation completes returns the buffer to modified and requires a new revision-guarded SaveWorkspaceFileContent command.',
  7
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.frontend_component_capability_gaps (
  component_id, gap_id, gap_kind, gap_status, description, owning_task_id,
  raw_gap, source_path, source_content_sha256
)
values (
  'web.component.code.CodeWorkingTreeSync',
  'GAP-CODE-EDIT-DURING-RECONCILIATION-PERSISTENCE',
  'state-transition-race',
  'closed',
  'An edit made while an earlier receipt was reconciling retained the reconciling phase, allowing flush to approve an unsaved buffer.',
  'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1',
  jsonb_build_object(
    'requiredProof', 'persist first edit -> edit while reconciliation pending -> flush persists second edit against first receipt revision',
    'affectedRail', 'SaveWorkspaceFileContent',
    'closedBy', 'tools/planning-db/migrations/770_dbt_code_reconciliation_followup_edit_guard.sql'
  ),
  'tools/planning-db/migrations/770_dbt_code_reconciliation_followup_edit_guard.sql',
  md5('gap:CodeWorkingTreeSync:edit-during-reconciliation:closed:770')
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
  proves = 'A save receipt releases navigation only for its persisted bytes; an edit made during semantic reconciliation becomes modified and flush emits a second revision-guarded write.',
  raw_evidence = raw_evidence || jsonb_build_object(
    'postPersistenceEditRequiresWrite', true,
    'secondWriteUsesPriorReceiptRevision', true
  ),
  source_path = 'tools/planning-db/migrations/770_dbt_code_reconciliation_followup_edit_guard.sql',
  source_content_sha256 = md5('evidence:code-persistence-reconciliation-followup-edit:770'),
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
    select 'tools/planning-db/migrations/770_dbt_code_reconciliation_followup_edit_guard.sql'
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
  source_path = 'tools/planning-db/migrations/770_dbt_code_reconciliation_followup_edit_guard.sql',
  source_content_sha256 = repeat(
    md5('dbt-code-reconciliation-followup-edit-guard:770'),
    2
  ),
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
      and gap_id = 'GAP-CODE-EDIT-DURING-RECONCILIATION-PERSISTENCE'
      and gap_status = 'closed'
      and owning_task_id = 'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1'
  ) then
    raise exception 'Post-persistence edit race is not closed by the current task';
  end if;

  if exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name <> 'SaveWorkspaceFileContent'
  ) then
    raise exception 'Post-persistence edit guard introduced a parallel command/query rail';
  end if;
end
$$;
