-- Approve the Code working-tree synchronization boundary before production
-- implementation. SaveWorkspaceFileContent remains the single internal CAS
-- command; no user-facing Save or fake Git lifecycle is introduced.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'CODE-WORKING-TREE-AUTOSYNC-20260712',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'Code working-tree automatic synchronization',
  'Frontend / Project Workspace I/O',
  'approved',
  'Code edits currently stop in a route-local buffer. The existing revision-guarded workspace-file command must synchronize edits automatically without creating a second Save lifecycle or falsely claiming Git stage, commit, push, or remote synchronization.',
  'hidden_authority',
  'GetWorkspaceFileContent;SaveWorkspaceFileContent',
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
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'decision', 'ADR-0060', 'must_prove', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'component', 'SYS-WEB-VIEWS-CODE', 'may_update', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'component', 'SYS-WEB-SERVICES-WORKSPACE', 'may_reference', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'query', 'GetWorkspaceFileContent', 'may_reference', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'query', 'SaveWorkspaceFileContent', 'may_reference', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'path', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts', 'may_create', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'path', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.ts', 'may_create', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'path', 'apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx', 'may_create', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'path', 'apps/web/src/app/views/CodeView.tsx', 'may_update', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'test', 'codeWorkingTreeSyncModel.test.ts', 'must_prove', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'test', 'useCodeWorkingTreeSync.test.tsx', 'must_prove', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'test', 'CodeWorkingTreeStatus.test.tsx', 'must_prove', true),
  ('CODE-WORKING-TREE-AUTOSYNC-20260712', 'test', 'code-workbench-workspace-files.cy.ts', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.frontend_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  source_path,
  source_content_sha256,
  raw_component
)
values (
  'web.component.code.CodeWorkingTreeSync',
  'CodeWorkingTreeSync',
  'state-view',
  'planned',
  'create',
  'Frontend / Code workbench',
  'Synchronize Monaco edits into the scoped project working tree through serialized revision-guarded writes and present honest synchronization posture.',
  '@dvt/web',
  '/canvas',
  null,
  jsonb_build_array('browser proof and implementation evidence pending'),
  '[]'::jsonb,
  'tools/planning-db/migrations/634_code_working_tree_sync_design.sql',
  md5('web.component.code.CodeWorkingTreeSync:634') || md5('SaveWorkspaceFileContent:no-visible-save'),
  jsonb_build_object(
    'aggregateComponent', 'SYS-WEB-VIEWS-CODE',
    'interaction', 'automatic working-tree synchronization',
    'rejectedInteraction', 'manual Save',
    'gitPosture', 'file mutation is not stage, commit, push, or remote sync'
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
  imported_at = now();

insert into planning_query_store.frontend_component_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file
)
values
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts', 'model', 'reduceCodeWorkingTreeSync', jsonb_build_object('status', 'planned')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts', 'test', null, jsonb_build_object('coverage', 'state transitions and no-lost-edit invariant')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.ts', 'hook', 'useCodeWorkingTreeSync', jsonb_build_object('status', 'planned')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx', 'test', null, jsonb_build_object('coverage', 'debounce, serialization, conflict, selection flush')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx', 'component', 'CodeWorkingTreeStatus', jsonb_build_object('status', 'planned')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/CodeWorkingTreeStatus.test.tsx', 'test', null, jsonb_build_object('coverage', 'localized honest status presentation')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/codeMonacoEditableAccess.architecture.test.ts', 'architecture-test', null, jsonb_build_object('coverage', 'Code delegates synchronization and exposes no Save action')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts', 'e2e-test', null, jsonb_build_object('coverage', 'demanding-user working-tree synchronization'))
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file;

insert into planning_query_store.frontend_component_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail
)
values (
  'web.component.code.CodeWorkingTreeSync',
  'SaveWorkspaceFileContent',
  'command',
  'partial-ui',
  jsonb_build_object(
    'purpose', 'Automatically persist the latest editor value with mandatory expected revision.',
    'userFacingName', 'none',
    'notGitOperations', jsonb_build_array('stage', 'commit', 'push', 'remote sync')
  )
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-WEB-CODE-WORKING-TREE-SYNC-USES-WORKSPACE-SERVICE',
  'SYS-WEB-VIEWS-CODE',
  'SYS-WEB-SERVICES-WORKSPACE',
  'calls',
  'outbound',
  'async',
  'Revision conflict or command failure keeps the editor modified and blocks file selection.',
  'Active tenant, project, and environment workspace file-write scope.',
  jsonb_build_array(
    'apps/web/src/app/views/code/useCodeWorkingTreeSync.ts',
    'apps/web/src/app/services/AppServicesContext.tsx#useWorkspaceFileContentCommandPort'
  ),
  'approved'
)
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

-- Correct the aggregate Code component vocabulary while keeping relational
-- frontend component-to-rail rows as the precise source for this slice.
update planning_query_store.governance_component_local_definitions
set
  cq_rails = 'ListWorkspaceFiles;GetWorkspaceFileContent;GetWorkspaceFileHistory;SaveWorkspaceFileContent',
  owned_concern = 'Render the Code workbench, project file read models, file history, and revision-guarded working-tree synchronization.',
  source_path = 'tools/planning-db/migrations/634_code_working_tree_sync_design.sql',
  source_content_sha256 = md5('SYS-WEB-VIEWS-CODE:634') || md5('List;Get;History;SaveCAS'),
  revision = revision + 1
where component_id = 'SYS-WEB-VIEWS-CODE';
