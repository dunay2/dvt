-- Reopen DBT Code reconciliation after hard QA exposed three races. Keep the
-- existing SaveWorkspaceFileContent command and ProjectDbtGraphFromFiles
-- query; do not introduce a parallel persistence or analysis rail.

update architecture.design
set
  status = 'review',
  rationale = 'Byte persistence and semantic analysis remain separate. Hard QA additionally requires pending contextual targets to survive persistence retry, navigation to unblock as soon as bytes are persisted, and asynchronous reconciliation outcomes to be correlated to the receipt that started them.',
  updated_at = now()
where design_id = 'DBT-CODE-RECONCILIATION-TRUTH-20260719';

update architecture.component_responsibility
set status = 'drift'
where responsibility_id in (
  'RESP-WEB-CODE-WORKING-TREE-SYNC',
  'RESP-SYS-WEB-VIEWS-CODE'
);

update architecture.component_port
set
  status = 'approved',
  negative_tests = array[
    'later edit is lost while a write is in flight',
    'modified content is lost when the workbench unmounts before debounce',
    'post-save consumer runs before the authoritative save receipt',
    'synchronized posture is emitted for stale-last-valid, invalid, or unavailable DBT analysis',
    'post-save reconciliation causes a duplicate file write',
    'a contextual target requested before a failed save is lost after retry',
    'navigation waits for semantic analysis after bytes are persisted',
    'an older reconciliation outcome mutates a newer file or receipt'
  ]
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'A requested contextual file target remains pending across a failed SaveWorkspaceFileContent attempt and is applied exactly once after a successful retry.',
    4
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'content_persisted releases file, workbench, and SPA navigation without waiting for ProjectDbtGraphFromFiles; semantic reconciliation continues as an observable background state.',
    5
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'A reconciliation completion is reduced only when its receipt still matches the pending reconciliation receipt for the current file state.',
    6
  ),
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
    'invariant',
    'Exact whole-project revision binding belongs to the existing DBT atomic publication path; repeated browser reads must not be presented as atomic proof.',
    3
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

delete from planning_query_store.frontend_component_capability_gaps
where component_id = 'web.component.code.CodeWorkingTreeSync'
  and gap_id in (
    'GAP-CODE-PENDING-TARGET-RETRY',
    'GAP-CODE-PERSISTENCE-RECONCILIATION-COUPLING',
    'GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION'
  );

insert into planning_query_store.frontend_component_capability_gaps (
  component_id, gap_id, gap_kind, gap_status, description, owning_task_id,
  raw_gap, source_path, source_content_sha256
)
values
  (
    'web.component.code.CodeWorkingTreeSync',
    'GAP-CODE-PENDING-TARGET-RETRY',
    'state-transition-race',
    'open',
    'A contextual file target can be lost when persistence fails before the target transition and later succeeds through Retry.',
    'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1',
    jsonb_build_object(
      'requiredProof', 'failed save -> retry -> requested target selected exactly once',
      'affectedRail', 'SaveWorkspaceFileContent',
      'coordinatorComponentId', 'SYS-WEB-VIEWS-CODE'
    ),
    'tools/planning-db/migrations/767_dbt_code_reconciliation_race_hardening.sql',
    md5('gap:CodeWorkingTreeSync:pending-target-retry:767')
  ),
  (
    'web.component.code.CodeWorkingTreeSync',
    'GAP-CODE-PERSISTENCE-RECONCILIATION-COUPLING',
    'async-boundary-coupling',
    'open',
    'flush waits for DBT semantic analysis after SaveWorkspaceFileContent has already proved byte persistence.',
    'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1',
    jsonb_build_object(
      'requiredProof', 'flush resolves after save receipt while reconciliation remains pending',
      'affectedRails', jsonb_build_array('SaveWorkspaceFileContent', 'ProjectDbtGraphFromFiles')
    ),
    'tools/planning-db/migrations/767_dbt_code_reconciliation_race_hardening.sql',
    md5('gap:CodeWorkingTreeSync:persistence-reconciliation-coupling:767')
  ),
  (
    'web.component.code.CodeWorkingTreeSync',
    'GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION',
    'revision-authority',
    'open',
    'Fresh DBT analysis is a point-in-time project-source snapshot; exact save-plus-whole-project publication identity still requires the governed atomic publication task.',
    'E-WEB-DBT-ATOMIC-PUBLICATION-1',
    jsonb_build_object(
      'requiredProof', 'one server-owned receipt binds writes and exact analysis identity',
      'forbiddenShortcut', 'double GET presented as atomic proof',
      'affectedRails', jsonb_build_array('SaveWorkspaceFileContent', 'ProjectDbtGraphFromFiles')
    ),
    'tools/planning-db/migrations/767_dbt_code_reconciliation_race_hardening.sql',
    md5('gap:CodeWorkingTreeSync:exact-project-revision:767')
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

do $$
declare
  current_task_gap_count integer;
begin
  select count(*) into current_task_gap_count
  from planning_query_store.frontend_component_capability_gaps
  where component_id = 'web.component.code.CodeWorkingTreeSync'
    and owning_task_id = 'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1'
    and gap_status = 'open'
    and gap_id in (
      'GAP-CODE-PENDING-TARGET-RETRY',
      'GAP-CODE-PERSISTENCE-RECONCILIATION-COUPLING'
    );

  if current_task_gap_count <> 2 then
    raise exception 'DBT Code race hardening expected two current-task gaps, found %', current_task_gap_count;
  end if;

  if not exists (
    select 1
    from planning_query_store.frontend_component_capability_gaps
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and gap_id = 'GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION'
      and owning_task_id = 'E-WEB-DBT-ATOMIC-PUBLICATION-1'
      and gap_status = 'open'
  ) then
    raise exception 'Exact DBT project revision gap is not assigned to atomic publication';
  end if;

  if exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name <> 'SaveWorkspaceFileContent'
  ) then
    raise exception 'CodeWorkingTreeSync acquired a parallel command/query rail during race hardening';
  end if;
end
$$;
