-- Close the Code working-tree synchronization slice with relational evidence.
-- The existing workspace-file CAS command remains the only mutation rail;
-- working-tree synchronization does not imply any Git lifecycle operation.

alter table architecture.design_scope
  drop constraint if exists architecture_design_scope_subject_kind_check;

alter table architecture.design_scope
  add constraint architecture_design_scope_subject_kind_check
  check (
    subject_kind in (
      'component',
      'relation',
      'contract',
      'flow',
      'check',
      'path',
      'command',
      'query',
      'decision',
      'evidence',
      'risk',
      'test'
    )
  );

update architecture.design_scope
set subject_kind = 'command'
where design_id = 'CODE-WORKING-TREE-AUTOSYNC-20260712'
  and subject_kind = 'query'
  and subject_id = 'SaveWorkspaceFileContent';

update architecture.design
set
  status = 'implemented',
  rationale = 'Code edits synchronize automatically through the existing revision-guarded SaveWorkspaceFileContent command. The UI exposes honest synchronized, modified, syncing, conflict, failed, and read-only posture without a Save action or a false Git stage, commit, push, or remote-sync claim.',
  updated_at = now()
where design_id = 'CODE-WORKING-TREE-AUTOSYNC-20260712';

update planning_query_store.frontend_components
set
  component_status = 'current',
  capability_gaps = '[]'::jsonb,
  evidence_refs = jsonb_build_array(
    'EV-CODE-WORKING-TREE-STATE-MODEL',
    'EV-CODE-WORKING-TREE-PRESENTATION',
    'EV-CODE-WORKING-TREE-ARCHITECTURE',
    'EV-CODE-WORKING-TREE-CYPRESS',
    'EV-CODE-WORKING-TREE-TYPECHECK'
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'hardCutStatus', 'implemented',
    'persistenceAuthority', 'project working tree',
    'writePolicy', 'serialized content-sha conditional writes',
    'selectionPolicy', 'flush before file selection changes',
    'conflictPolicy', 'stop automatic writes and require authoritative reload',
    'visibleSaveAction', false,
    'gitLifecycleClaims', jsonb_build_array()
  ),
  source_path = 'tools/planning-db/migrations/635_code_working_tree_sync_implementation_closeout.sql',
  source_content_sha256 = md5('web.component.code.CodeWorkingTreeSync:implemented:635'),
  imported_at = now()
where component_id = 'web.component.code.CodeWorkingTreeSync';

update planning_query_store.frontend_component_files
set raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object('status', 'implemented')
where component_id = 'web.component.code.CodeWorkingTreeSync';

update planning_query_store.frontend_component_cq_rails
set
  rail_status = 'implemented-api',
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'applicationPort', 'IWorkspaceFileContentCommandPort.saveFileContent',
    'adapterSurface', 'createApiWorkspaceFileContentCommandPort',
    'authorizationScope', 'active tenant, project, and environment workspace file-write scope',
    'negativeTests', jsonb_build_array(
      'content SHA conflict stops automatic synchronization',
      'failed writes retain the modified editor value for explicit retry',
      'file selection does not change until a pending write succeeds'
    )
  )
where component_id = 'web.component.code.CodeWorkingTreeSync'
  and rail_name = 'SaveWorkspaceFileContent';

insert into planning_query_store.frontend_component_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence
)
values
  (
    'EV-CODE-WORKING-TREE-STATE-MODEL',
    'web.component.code.CodeWorkingTreeSync',
    'unit-test',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/code/codeWorkingTreeSyncModel.test.ts',
    'passing',
    jsonb_build_object('assertions', 5, 'scope', 'state transitions, serialization, conflict, and retry')
  ),
  (
    'EV-CODE-WORKING-TREE-PRESENTATION',
    'web.component.code.CodeWorkingTreeSync',
    'presentation-test',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/code/useCodeWorkingTreeSync.test.tsx src/app/views/code/CodeWorkingTreeStatus.test.tsx src/app/views/CodeView.test.tsx src/app/components/workbench/RouteWorkbenchFrame.test.tsx',
    'passing',
    jsonb_build_object('scope', 'autosync orchestration, status copy, file-selection flush, and embedded layout')
  ),
  (
    'EV-CODE-WORKING-TREE-ARCHITECTURE',
    'web.component.code.CodeWorkingTreeSync',
    'architecture-test',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/code/codeMonacoEditableAccess.architecture.test.ts src/app/routes/internalAlphaRouteGate.architecture.test.ts',
    'passing',
    jsonb_build_object('scope', 'single command authority, no Save UI, contextual route, and command/query vocabulary')
  ),
  (
    'EV-CODE-WORKING-TREE-CYPRESS',
    'web.component.code.CodeWorkingTreeSync',
    'e2e-test',
    'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/code-workbench-workspace-files.cy.ts,cypress/e2e/shell/route-workbench-slots.cy.ts',
    'passing',
    jsonb_build_object('scope', 'retired-route redirect, contextual Monaco edit, CAS request, no Save action, and embedded slots')
  ),
  (
    'EV-CODE-WORKING-TREE-TYPECHECK',
    'web.component.code.CodeWorkingTreeSync',
    'typecheck',
    'pnpm --filter @dvt/web typecheck',
    'passing',
    '{}'::jsonb
  )
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence;

update architecture.component_relation
set
  status = 'implemented',
  source_refs = jsonb_build_array(
    'apps/web/src/app/views/code/useCodeWorkingTreeSync.ts',
    'apps/web/src/app/services/AppServicesContext.tsx#useWorkspaceFileContentCommandPort',
    'apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts'
  ),
  updated_at = now()
where relation_id = 'REL-WEB-CODE-WORKING-TREE-SYNC-USES-WORKSPACE-SERVICE';
