-- Model Code navigation as a coordinated consumer of the existing
-- SaveWorkspaceFileContent command. Persisted semantic degradation may remain
-- visible, but only unpersisted bytes may block file or route transitions.

update architecture.design
set
  rationale = 'Revision-guarded persistence and DBT semantic analysis are distinct outcomes. File, workbench, SPA-route, and hard-browser transitions coordinate the existing save command before teardown; persisted stale, invalid, unavailable, verification-unavailable, and superseded states remain honest without trapping the user.',
  updated_at = now()
where design_id = 'DBT-CODE-RECONCILIATION-TRUTH-20260719';

update architecture.component_responsibility
set
  responsibility = 'Serialize revision-guarded workspace-file writes, preserve later edits, coordinate file and navigation transitions before teardown, and expose persistence and semantic-reconciliation posture independently.',
  reason_to_change = 'Working-tree synchronization, concurrency, navigation coordination, conflict, retry, or post-save reconciliation policy changes.',
  status = 'approved'
where responsibility_id = 'RESP-WEB-CODE-WORKING-TREE-SYNC';

update architecture.component_port
set
  negative_tests = array[
    'later edit is lost while a write is in flight',
    'a file-scope target change replaces an unpersisted buffer',
    'SPA or hard-browser navigation discards unpersisted bytes',
    'a failed persistence retry resolves before the retry command settles',
    'post-save consumer runs before the authoritative save receipt',
    'persisted semantic degradation blocks switching files or closing the workbench',
    'synchronized posture is emitted for stale-last-valid, invalid, unavailable, verification-unavailable, or superseded authority',
    'post-save reconciliation causes a duplicate file write'
  ],
  status = 'approved'
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CODE-WORKING-TREE-SYNC'
  and item_kind = 'invariant'
  and item_value = 'Unmounting before debounce starts the same revision-guarded command for the latest modified buffer.';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'A file target changes only after the previous buffer has reached a persisted state through SaveWorkspaceFileContent.',
    5
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'SPA and hard-browser navigation are guarded while workspace-file bytes are modified, syncing, conflicted, or failed.',
    6
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'Persisted semantic degradation remains visible but does not block file or workbench navigation.',
    7
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'invariant',
    'A persistence retry promise settles only after the retry command attempt settles.',
    8
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'owns',
    'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx',
    4
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'owns',
    'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx',
    5
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'owns',
    'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.ts',
    6
  ),
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'owns',
    'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.test.ts',
    7
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  (
    'web.component.code.CodeWorkingTreeSync',
    'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx',
    'component',
    'CodeWorkingTreeNavigationGuard',
    jsonb_build_object('status', 'planned', 'scope', 'SPA and hard-browser navigation coordination'),
    'tools/planning-db/migrations/762_code_working_tree_navigation_integrity.sql',
    md5('file:CodeWorkingTreeNavigationGuard:762')
  ),
  (
    'web.component.code.CodeWorkingTreeSync',
    'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx',
    'test',
    null,
    jsonb_build_object('status', 'planned', 'coverage', 'route and beforeunload protection'),
    'tools/planning-db/migrations/762_code_working_tree_navigation_integrity.sql',
    md5('file:CodeWorkingTreeNavigationGuard.test:762')
  ),
  (
    'web.component.code.CodeWorkingTreeSync',
    'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.ts',
    'policy',
    'reconcileWorkspaceFileAuthority',
    jsonb_build_object('status', 'planned', 'scope', 'save receipt and final file-read correlation'),
    'tools/planning-db/migrations/762_code_working_tree_navigation_integrity.sql',
    md5('file:workspaceFileReconciliationAuthority:762')
  ),
  (
    'web.component.code.CodeWorkingTreeSync',
    'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.test.ts',
    'test',
    null,
    jsonb_build_object('status', 'planned', 'coverage', 'matching and superseded authority'),
    'tools/planning-db/migrations/762_code_working_tree_navigation_integrity.sql',
    md5('file:workspaceFileReconciliationAuthority.test:762')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values (
  'TEST-WEB-CODE-WORKING-TREE-NAVIGATION-GUARD',
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx',
  'integration',
  'negative',
  true,
  'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

do $$
begin
  if not exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name = 'SaveWorkspaceFileContent'
      and rail_kind = 'command'
  ) then
    raise exception 'Code navigation integrity requires the existing SaveWorkspaceFileContent command';
  end if;
  if exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name <> 'SaveWorkspaceFileContent'
  ) then
    raise exception 'CodeWorkingTreeSync acquired a parallel command/query rail';
  end if;
end
$$;
