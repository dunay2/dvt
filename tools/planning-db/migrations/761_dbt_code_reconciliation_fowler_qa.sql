-- Align DB authority with the Fowler QA result: the frontend leaf owns the
-- save command, CodeView correlates its receipt through the existing read
-- query, and the DBT context adapter owns project-freshness reconciliation.

delete from planning_query_store.frontend_component_local_cq_rails
where component_id = 'SYS-WEB-CODE-WORKING-TREE-SYNC';

delete from architecture.design_scope
where design_id = 'DBT-CODE-RECONCILIATION-TRUTH-20260719'
  and subject_kind = 'component'
  and subject_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW';

update architecture.design
set
  rationale = 'Revision-guarded persistence and DBT semantic analysis are distinct outcomes. CodeView correlates the save receipt with a final authoritative GetWorkspaceFileContent read; the working-tree state remains unresolved for stale-last-valid, invalid, unavailable, transport-failed, superseded, and revision-conflict outcomes.',
  updated_at = now()
where design_id = 'DBT-CODE-RECONCILIATION-TRUTH-20260719';

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values (
  'DBT-CODE-RECONCILIATION-TRUTH-20260719',
  'test',
  'TEST-WEB-VIEWS-CODE',
  'must_prove',
  true
)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component_responsibility
set
  responsibility = 'Map an exact selected DBT file or project scope to the generic contextual workbench and adapt ProjectDbtGraphFromFiles freshness after a correlated workspace-file save.',
  reason_to_change = 'DBT Code target resolution or post-save project-reconciliation adaptation changes.',
  ddd_owner = 'DbtProjectCodeWorkbenchAdapter',
  status = 'implemented'
where responsibility_id = 'RESP-WEB-DBT-PROJECT-CODE-WORKBENCH-ADAPTER';

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values (
  'PORT-WEB-DBT-CODE-RECONCILIATION',
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
  'ReconcileDbtCodeFilePersistence',
  'query',
  'inbound',
  null,
  null,
  array[
    'fresh project analysis bypasses final workspace-file receipt correlation',
    'stale-last-valid analysis is presented as synchronized',
    'invalid or unavailable analysis is presented as synchronized',
    'a superseded file revision is offered a blind reconciliation retry'
  ],
  'implemented'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

update architecture.component_port
set
  negative_tests = array[
    'later edit is lost while a write is in flight',
    'modified content is lost when the workbench unmounts before debounce',
    'post-save consumer runs before the authoritative save receipt',
    'synchronized posture is emitted for stale-last-valid, invalid, unavailable, or superseded authority',
    'post-save reconciliation causes a duplicate file write'
  ],
  status = 'implemented'
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC';

update architecture.component_observability
set
  signal_name = 'CodeWorkingTreeStatus exposes synchronized, modified, syncing, reconciling, conflict, failed, reconciliation_failed, persisted_stale, persisted_invalid, persisted_unavailable, persisted_superseded, and read_only posture.',
  status = 'implemented'
where observability_id = 'OBS-WEB-CODE-WORKING-TREE-SYNC';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'Fresh project analysis becomes synchronized only when a final authoritative file read matches the save receipt path and content SHA.',
    4
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'transition',
    'reconciling -> persisted_superseded when the final authoritative file revision differs from the save receipt.',
    4
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

do $$
declare
  frontend_save_rail_count integer;
  adapter_project_rail_count integer;
begin
  select count(*) into frontend_save_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'web.component.code.CodeWorkingTreeSync'
    and rail_name = 'SaveWorkspaceFileContent'
    and rail_kind = 'command';

  select count(*) into adapter_project_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
    and rail_name = 'ProjectDbtGraphFromFiles'
    and rail_kind = 'query';

  if frontend_save_rail_count <> 1 then
    raise exception 'CodeWorkingTreeSync must own exactly one frontend save rail, found %', frontend_save_rail_count;
  end if;
  if adapter_project_rail_count <> 1 then
    raise exception 'DBT Code adapter must own exactly one project query rail, found %', adapter_project_rail_count;
  end if;
  if exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'SYS-WEB-CODE-WORKING-TREE-SYNC'
  ) then
    raise exception 'Architecture identity still duplicates frontend CodeWorkingTreeSync rails';
  end if;
  if exists (
    select 1
    from architecture.design_scope
    where design_id = 'DBT-CODE-RECONCILIATION-TRUTH-20260719'
      and subject_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  ) then
    raise exception 'Selection recovery remains mixed into DBT Code reconciliation design scope';
  end if;
  if not exists (
    select 1
    from architecture.component_port
    where port_id = 'PORT-WEB-DBT-CODE-RECONCILIATION'
      and status = 'implemented'
  ) then
    raise exception 'DBT Code reconciliation has no explicit adapter port';
  end if;
end
$$;
