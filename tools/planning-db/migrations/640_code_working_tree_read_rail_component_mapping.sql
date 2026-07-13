-- Reconcile the Code working-tree component with the canonical read rail used
-- to load and reopen authoritative file content. This relation was declared by
-- the design and exercised by the live proof but absent from component profile.

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
  'GetWorkspaceFileContent',
  'query',
  'implemented-api',
  jsonb_build_object(
    'dddObject', 'WorkspaceFileContentReadModel',
    'applicationPort', 'IWorkspaceFilesQueryPort.getFileContent',
    'adapterSurface', 'createApiWorkspaceFilesQueryPort',
    'authorizationScope', 'active tenant, project, and environment workspace file-read scope',
    'negativeTests', jsonb_build_array(
      'path traversal is rejected',
      'unsupported file types are rejected',
      'oversized content is rejected',
      'unauthorized workspace scope fails closed',
      'browser reopen must not substitute stale editor state for the authoritative query result'
    )
  ),
  'tools/planning-db/migrations/640_code_working_tree_read_rail_component_mapping.sql',
  md5('rail:GetWorkspaceFileContent:CodeWorkingTreeSync:640')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'readAuthorityRail', 'GetWorkspaceFileContent',
    'mutationAuthorityRail', 'SaveWorkspaceFileContent'
  ),
  source_path = 'tools/planning-db/migrations/640_code_working_tree_read_rail_component_mapping.sql',
  source_content_sha256 = md5('CodeWorkingTreeSync:read-write-rails:640'),
  updated_at = now()
where component_id = 'web.component.code.CodeWorkingTreeSync';
