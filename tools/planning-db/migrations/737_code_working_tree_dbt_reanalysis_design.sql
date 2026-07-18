-- Separate Code working-tree application orchestration from presentation and
-- require DBT project re-analysis after an authoritative file save. The
-- existing SaveWorkspaceFileContent command remains the only mutation rail.

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale, fowler_signal,
  rail_ref, approved_at
)
values (
  'DBT-CODE-SAVE-REANALYSIS-20260718',
  'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1',
  'DBT code save re-analysis and Code working-tree SRP split',
  'Frontend / DBT project authoring',
  'approved',
  'CodeView is presentation, CodeWorkingTreeSync owns serialized revision-guarded writes, and the DBT project adapter reconciles the authoritative graph after each successful save before the workbench reports synchronization. This prevents Preview from using a stale project revision without inventing a second save or preview rail.',
  'responsibility_overload',
  'SaveWorkspaceFileContent;ProjectDbtGraphFromFiles',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-CODE-SAVE-REANALYSIS-20260718', 'component', 'SYS-WEB-CODE-WORKING-TREE-SYNC', 'may_create', true),
  ('DBT-CODE-SAVE-REANALYSIS-20260718', 'component', 'SYS-WEB-VIEWS-CODE', 'may_update', true),
  ('DBT-CODE-SAVE-REANALYSIS-20260718', 'component', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'may_update', true),
  ('DBT-CODE-SAVE-REANALYSIS-20260718', 'component', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE', 'may_update', true),
  ('DBT-CODE-SAVE-REANALYSIS-20260718', 'command', 'SaveWorkspaceFileContent', 'may_reference', true),
  ('DBT-CODE-SAVE-REANALYSIS-20260718', 'query', 'ProjectDbtGraphFromFiles', 'may_reference', true),
  ('DBT-CODE-SAVE-REANALYSIS-20260718', 'test', 'TEST-WEB-CODE-WORKING-TREE-RECONCILIATION', 'must_prove', true),
  ('DBT-CODE-SAVE-REANALYSIS-20260718', 'test', 'TEST-WEB-DBT-YAML-DESCRIPTION-LIVE', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'Code working-tree synchronization',
  'module',
  'application',
  'Frontend / Code workbench',
  'apps/web/src/app/views/code/useCodeWorkingTreeSync.ts',
  'useCodeWorkingTreeSync',
  'browser',
  'high',
  'review',
  'SYS-WEB-VIEWS-CODE'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values (
  'RESP-WEB-CODE-WORKING-TREE-SYNC',
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'Serialize revision-guarded workspace-file writes, preserve later edits, expose synchronization state, and notify contextual consumers after an authoritative save.',
  'Working-tree synchronization, concurrency, conflict, flush, or post-save notification policy changes.',
  'CodeWorkingTreeSync',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values (
  'PORT-WEB-CODE-WORKING-TREE-SYNC',
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'SynchronizeCodeWorkingTree',
  'command',
  'inbound',
  null,
  null,
  array[
    'later edit is lost while a write is in flight',
    'post-save consumer runs before the authoritative save receipt',
    'synchronized posture is emitted before DBT re-analysis settles',
    'post-save reconciliation causes a duplicate file write'
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

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  (
    'REL-WEB-CODE-VIEW-CALLS-WORKING-TREE-SYNC',
    'SYS-WEB-VIEWS-CODE',
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'calls',
    'outbound',
    'async',
    null,
    'Presentation bypasses revision-guarded synchronization or begins owning write policy.',
    'active workspace file read/write scope',
    jsonb_build_array('CodeView', 'useCodeWorkingTreeSync'),
    'implemented'
  ),
  (
    'REL-WEB-CODE-WORKING-TREE-SYNC-USES-WORKSPACE-SERVICE',
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'SYS-WEB-SERVICES-WORKSPACE',
    'calls',
    'outbound',
    'async',
    null,
    'Revision conflict or command failure is presented as synchronized.',
    'active tenant, project, and environment workspace file-write scope',
    jsonb_build_array('useCodeWorkingTreeSync', 'IWorkspaceFileContentCommandPort.saveFileContent'),
    'implemented'
  ),
  (
    'REL-WEB-DBT-CODE-ADAPTER-REFRESHES-PROJECTION-AFTER-SAVE',
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'calls',
    'outbound',
    'async',
    null,
    'Preview remains enabled against the project revision that preceded the saved file.',
    'workspace:files:write;workspace:dbt-project:read',
    jsonb_build_array('buildDbtProjectFileCodeWorkbench', 'refreshProjectGraphAfterCodeMutation'),
    'approved'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values (
  'TEST-WEB-CODE-WORKING-TREE-RECONCILIATION',
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx',
  'unit',
  'negative',
  true,
  'pnpm --filter @dvt/web test:presentation:run -- src/app/views/code/useCodeWorkingTreeSync.test.tsx'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values (
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'tools/planning-db/migrations/737_code_working_tree_dbt_reanalysis_design.sql',
  repeat(md5('SYS-WEB-CODE-WORKING-TREE-SYNC:737'), 2),
  0,
  'Code working-tree synchronization',
  'component',
  'SYS-WEB-VIEWS-CODE',
  'SYS-DVT',
  'SYS-WEB',
  'canonical',
  false,
  'Own serialized revision-guarded file writes and post-save consumer notification.',
  'CodeWorkingTreeSync',
  'SaveWorkspaceFileContent',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = planning_query_store.governance_component_local_definitions.revision + 1,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails,
  created_by = excluded.created_by;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'owns', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts', 0),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'owns', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts', 1),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'owns', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.ts', 2),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'owns', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx', 3),
  ('SYS-WEB-VIEWS-CODE', 'excludes', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts', 100),
  ('SYS-WEB-VIEWS-CODE', 'excludes', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts', 101),
  ('SYS-WEB-VIEWS-CODE', 'excludes', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.ts', 102),
  ('SYS-WEB-VIEWS-CODE', 'excludes', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx', 103)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'responsibility', 'Synchronize the latest Code buffer through one serialized revision-guarded workspace-file command.', 0),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'reason_to_change', 'Working-tree concurrency, conflict, flush, or post-save notification policy changes.', 0),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'public_api', 'useCodeWorkingTreeSync', 0),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'invariant', 'At most one SaveWorkspaceFileContent command is in flight and later edits are never discarded.', 0),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'invariant', 'A contextual post-save consumer settles before synchronized posture is exposed.', 1),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'transition', 'modified -> syncing -> synchronized after save receipt and contextual reconciliation.', 0),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'transition', 'syncing -> conflict or failed only when the file mutation itself does not succeed.', 1),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'consumer', 'CodeView', 0),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'consumer', 'DBT project code workbench adapter', 1),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'governance_ref', 'ADR-0060', 0),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'fowler_signal', 'responsibility_overload', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.frontend_component_local_components
set
  component_kind = 'state-view',
  responsibility = 'Synchronize Code edits through serialized revision-guarded writes and notify contextual consumers after authoritative persistence.',
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'architectureComponentId', 'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'presentationOwner', 'SYS-WEB-VIEWS-CODE',
    'postSavePolicy', 'consumer reconciliation settles before synchronized posture'
  ),
  source_path = 'tools/planning-db/migrations/737_code_working_tree_dbt_reanalysis_design.sql',
  source_content_sha256 = md5('web.component.code.CodeWorkingTreeSync:srp:737'),
  updated_at = now()
where component_id = 'web.component.code.CodeWorkingTreeSync';

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.code.CodeWorkingTreeSync'
  and file_path in (
    'apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx',
    'apps/web/src/app/views/code/CodeWorkingTreeStatus.test.tsx'
  );

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status, reuse_decision,
  frontend_owner, responsibility, package_name, route_scope, plugin_scope,
  capability_gaps, evidence_refs, source_path, source_content_sha256, raw_component
)
values (
  'web.component.code.CodeWorkingTreeStatus',
  'CodeWorkingTreeStatus',
  'state-view',
  'current',
  'create',
  'Frontend / Code workbench presentation',
  'Render localized working-tree synchronization posture and recovery actions from supplied state.',
  '@dvt/web',
  '/canvas',
  null,
  '[]'::jsonb,
  jsonb_build_array('EV-CODE-WORKING-TREE-PRESENTATION'),
  'tools/planning-db/migrations/737_code_working_tree_dbt_reanalysis_design.sql',
  md5('web.component.code.CodeWorkingTreeStatus:737'),
  jsonb_build_object(
    'architectureComponentId', 'SYS-WEB-VIEWS-CODE',
    'controllerComponentId', 'web.component.code.CodeWorkingTreeSync',
    'passivePresentation', true
  )
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  ('web.component.code.CodeWorkingTreeStatus', 'apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx', 'presentation', 'CodeWorkingTreeStatus', jsonb_build_object('status', 'implemented', 'passive', true), 'tools/planning-db/migrations/737_code_working_tree_dbt_reanalysis_design.sql', md5('CodeWorkingTreeStatus:737')),
  ('web.component.code.CodeWorkingTreeStatus', 'apps/web/src/app/views/code/CodeWorkingTreeStatus.test.tsx', 'test', null, jsonb_build_object('coverage', 'localized posture and recovery controls'), 'tools/planning-db/migrations/737_code_working_tree_dbt_reanalysis_design.sql', md5('CodeWorkingTreeStatus.test:737'))
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

do $$
begin
  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'ProjectDbtGraphFromFiles'
      and rail_type = 'query'
  ) then
    raise exception 'ProjectDbtGraphFromFiles canonical query rail is missing';
  end if;
end
$$;
