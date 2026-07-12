-- Persist the Code working-tree synchronization component across governance
-- imports. Imported frontend inventory is replaceable; local component facts,
-- ownership, rails, surface placement, and evidence are the DB-first authority.

insert into planning_query_store.frontend_component_local_components (
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
  'current',
  'create',
  'Frontend / Code workbench',
  'Synchronize Monaco edits into the scoped project working tree through serialized revision-guarded writes and present honest synchronization posture.',
  '@dvt/web',
  '/canvas',
  null,
  '[]'::jsonb,
  jsonb_build_array(
    'EV-CODE-WORKING-TREE-STATE-MODEL',
    'EV-CODE-WORKING-TREE-PRESENTATION',
    'EV-CODE-WORKING-TREE-ARCHITECTURE',
    'EV-CODE-WORKING-TREE-CYPRESS',
    'EV-CODE-WORKING-TREE-TYPECHECK'
  ),
  'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql',
  md5('web.component.code.CodeWorkingTreeSync:local-overlay:636'),
  jsonb_build_object(
    'aggregateComponent', 'SYS-WEB-VIEWS-CODE',
    'interaction', 'automatic working-tree synchronization',
    'persistenceAuthority', 'project working tree',
    'writePolicy', 'serialized content-sha conditional writes',
    'selectionPolicy', 'flush before file selection changes',
    'conflictPolicy', 'stop automatic writes and require authoritative reload',
    'visibleSaveAction', false,
    'gitPosture', 'file mutation is not stage, commit, push, or remote sync',
    'hardCutStatus', 'implemented'
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
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts', 'model', 'reduceCodeWorkingTreeSync', jsonb_build_object('status', 'implemented', 'scope', 'pure synchronization state machine'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('file:codeWorkingTreeSyncModel:636')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts', 'test', null, jsonb_build_object('status', 'implemented', 'coverage', 'state transitions and no-lost-edit invariant'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('file:codeWorkingTreeSyncModel.test:636')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.ts', 'hook', 'useCodeWorkingTreeSync', jsonb_build_object('status', 'implemented', 'scope', 'debounce, serialization, CAS command, conflict and retry'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('file:useCodeWorkingTreeSync:636')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx', 'test', null, jsonb_build_object('status', 'implemented', 'coverage', 'debounce, serialization, conflict, retry and selection flush'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('file:useCodeWorkingTreeSync.test:636')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx', 'component', 'CodeWorkingTreeStatus', jsonb_build_object('status', 'implemented', 'scope', 'localized synchronization posture and recovery actions'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('file:CodeWorkingTreeStatus:636')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/CodeWorkingTreeStatus.test.tsx', 'test', null, jsonb_build_object('status', 'implemented', 'coverage', 'localized honest status presentation'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('file:CodeWorkingTreeStatus.test:636')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/src/app/views/code/codeMonacoEditableAccess.architecture.test.ts', 'architecture-test', null, jsonb_build_object('status', 'implemented', 'coverage', 'single command authority and no Save action'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('file:codeMonacoEditableAccess.architecture:636')),
  ('web.component.code.CodeWorkingTreeSync', 'apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts', 'e2e-test', null, jsonb_build_object('status', 'implemented', 'coverage', 'contextual demanding-user edit and CAS synchronization'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('file:code-workbench-workspace-files.cypress:636'))
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'web.component.code.CodeWorkingTreeSync',
  'SaveWorkspaceFileContent',
  'command',
  'implemented-api',
  jsonb_build_object(
    'dddObject', 'WorkspaceFileContent',
    'applicationPort', 'IWorkspaceFileContentCommandPort.saveFileContent',
    'adapterSurface', 'createApiWorkspaceFileContentCommandPort',
    'authorizationScope', 'active tenant, project, and environment workspace file-write scope',
    'negativeTests', jsonb_build_array(
      'content SHA conflict stops automatic synchronization',
      'failed writes retain the modified editor value for explicit retry',
      'file selection does not change until a pending write succeeds'
    )
  ),
  'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql',
  md5('rail:SaveWorkspaceFileContent:CodeWorkingTreeSync:636')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  ('EV-CODE-WORKING-TREE-STATE-MODEL', 'web.component.code.CodeWorkingTreeSync', 'unit-test', 'pnpm --filter @dvt/web test:unit:run -- src/app/views/code/codeWorkingTreeSyncModel.test.ts', 'passing', jsonb_build_object('assertions', 5, 'scope', 'state transitions, serialization, conflict, and retry'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('evidence:state-model:636')),
  ('EV-CODE-WORKING-TREE-PRESENTATION', 'web.component.code.CodeWorkingTreeSync', 'presentation-test', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/code/useCodeWorkingTreeSync.test.tsx src/app/views/code/CodeWorkingTreeStatus.test.tsx src/app/views/CodeView.test.tsx src/app/components/workbench/RouteWorkbenchFrame.test.tsx', 'passing', jsonb_build_object('scope', 'autosync orchestration, status copy, file-selection flush, and embedded layout'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('evidence:presentation:636')),
  ('EV-CODE-WORKING-TREE-ARCHITECTURE', 'web.component.code.CodeWorkingTreeSync', 'architecture-test', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/code/codeMonacoEditableAccess.architecture.test.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts', 'passing', jsonb_build_object('scope', 'single command authority, no Save UI, contextual route, and command/query vocabulary'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('evidence:architecture:636')),
  ('EV-CODE-WORKING-TREE-CYPRESS', 'web.component.code.CodeWorkingTreeSync', 'e2e-test', 'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/code-workbench-workspace-files.cy.ts,cypress/e2e/shell/route-workbench-slots.cy.ts', 'passing', jsonb_build_object('scope', 'retired-route redirect, contextual Monaco edit, CAS request, no Save action, and embedded slots'), 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('evidence:cypress:636')),
  ('EV-CODE-WORKING-TREE-TYPECHECK', 'web.component.code.CodeWorkingTreeSync', 'typecheck', 'pnpm --filter @dvt/web typecheck', 'passing', '{}'::jsonb, 'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql', md5('evidence:typecheck:636'))
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id,
  surface_id,
  route_path,
  placement_kind,
  placement_order,
  raw_link,
  source_path,
  source_content_sha256
)
values (
  'web.component.code.CodeWorkingTreeSync',
  'web.canvas.graph',
  '/canvas',
  'contextual-workbench',
  30,
  jsonb_build_object('host', 'SYS-WEB-VIEWS-CODE', 'activation', 'Workspace > Open project code'),
  'tools/planning-db/migrations/636_code_working_tree_sync_local_overlay.sql',
  md5('surface:web.canvas.graph:CodeWorkingTreeSync:636')
)
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
