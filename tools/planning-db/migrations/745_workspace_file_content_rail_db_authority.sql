-- Promote the existing workspace-file content query and command from a
-- documentation-import fallback to canonical Planning DB authority. Migration
-- 737 must remain bootstrap-safe before governance import; this forward
-- migration owns the final fail-closed rail assertion for both clean and
-- already-migrated databases.

update architecture.design
set
  status = 'implemented',
  rationale = 'GetWorkspaceFileContent and SaveWorkspaceFileContent retain one provider-neutral WorkspaceFileContent owner, revision CAS, protected HTTP adapters, and DB-local command/query authority without a parallel DBT-specific persistence rail.',
  fowler_signal = 'hidden_authority',
  updated_at = now()
where design_id = 'WORKSPACE-FILE-REVISION-CAS-20260711';

drop table if exists pg_temp.workspace_file_content_rail_authority;

create temporary table workspace_file_content_rail_authority (
  rail_name text primary key,
  rail_type text not null,
  application_port text not null,
  adapter_surface text not null,
  authorization_scope text not null,
  implementation_refs jsonb not null,
  negative_tests jsonb not null
) on commit drop;

insert into workspace_file_content_rail_authority (
  rail_name,
  rail_type,
  application_port,
  adapter_surface,
  authorization_scope,
  implementation_refs,
  negative_tests
)
values
  (
    'GetWorkspaceFileContent',
    'query',
    'IWorkspaceFileRepository.getContent',
    'GET RUNTIME_ROUTE_PATH.workspaceFileContent;IWorkspaceFilesQueryPort.getFileContent',
    'authenticated tenant, project, and environment workspace scope with workspace:files:view',
    jsonb_build_array(
      'apps/api/src/application/ports/workspaceFiles.ts#IWorkspaceFileRepository.getContent',
      'apps/api/src/application/services/getWorkspaceFileContentUseCase.ts#GetWorkspaceFileContentUseCase',
      'apps/api/src/entrypoints/http/workspaceFilesRoutes.ts#registerWorkspaceFilesRoutes',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#getContent',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts#getContent',
      'apps/web/src/app/ports/workspace.ts#IWorkspaceFilesQueryPort',
      'apps/web/src/app/services/workspace/workspacePorts.api.ts#getFileContent'
    ),
    jsonb_build_array(
      'reject unauthenticated or unauthorized scope',
      'reject an invalid or escaping workspace path',
      'return a typed not-found result for a missing file'
    )
  ),
  (
    'SaveWorkspaceFileContent',
    'command',
    'IWorkspaceFileRepository.saveContent',
    'POST RUNTIME_ROUTE_PATH.workspaceFileContent;IWorkspaceFileContentCommandPort.saveFileContent',
    'authenticated tenant, project, and environment workspace scope with workspace:files:save',
    jsonb_build_array(
      'apps/api/src/application/ports/workspaceFiles.ts#IWorkspaceFileRepository.saveContent',
      'apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts#SaveWorkspaceFileContentUseCase',
      'apps/api/src/entrypoints/http/workspaceFilesRoutes.ts#registerWorkspaceFilesRoutes',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#saveContent',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts#saveContent',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.ts#runExclusive',
      'apps/web/src/app/ports/workspace.ts#IWorkspaceFileContentCommandPort',
      'apps/web/src/app/services/workspace/workspacePorts.api.ts#saveFileContent'
    ),
    jsonb_build_array(
      'reject unauthenticated or unauthorized scope',
      'reject an invalid or escaping workspace path',
      'reject missing or malformed expected revision',
      'return a typed conflict without replacing newer content',
      'leave the current file intact when atomic replacement fails'
    )
  );

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
select
  'local#DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG#' || authority.rail_type || '#' || lower(authority.rail_name) || '#implemented',
  'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
  'implemented',
  authority.rail_name,
  lower(authority.rail_name),
  authority.rail_type,
  'WorkspaceFileContent',
  'implemented',
  authority.implementation_refs,
  authority.implementation_refs,
  jsonb_build_array(
    'docs/architecture/components/web/code-workbench-workspace-files-component.md',
    'docs/architecture/components/web/workspace/workspace-port-decomposition-component.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/adr/ADR-0060-dbt-project-authoring-authority.md'
  ),
  jsonb_build_array(
    'apps/api/src/application/ports/workspaceFiles.ts',
    'apps/api/src/application/services/*WorkspaceFileContentUseCase.ts',
    'apps/api/src/entrypoints/http/workspaceFilesRoutes.ts',
    'apps/api/src/infrastructure/workspaceFiles/**',
    'apps/web/src/app/ports/workspace.ts',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts'
  ),
  jsonb_build_array(
    'pnpm --filter dvt-api test',
    'pnpm --filter @dvt/web test:unit:run',
    'pnpm planning:db:integrity:check'
  ),
  jsonb_build_array(
    'pnpm test:planning:db:migrations',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/745_workspace_file_content_rail_db_authority.sql',
  repeat(md5(authority.rail_name || ':745:db-authority'), 2),
  jsonb_build_object(
    'name', authority.rail_name,
    'type', authority.rail_type,
    'boundedContext', 'Project Workspace I/O',
    'dddObject', 'WorkspaceFileContent',
    'applicationPort', authority.application_port,
    'adapterSurface', authority.adapter_surface,
    'scopeAndAuthorization', authority.authorization_scope,
    'negativeTests', authority.negative_tests,
    'revisionField', 'contentSha256',
    'expectedRevision', case
      when authority.rail_type = 'command' then 'mandatory_content_sha256_or_absent'
      else null
    end,
    'supersedesDocumentationImport', true
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', authority.rail_name,
        'type', authority.rail_type,
        'status', 'implemented',
        'dddOwner', 'WorkspaceFileContent'
      )
    )
  ),
  0,
  'codex'
from workspace_file_content_rail_authority authority
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

do $$
declare
  authority_count integer;
  invalid_authority_count integer;
begin
  select count(*) into authority_count
  from planning_query_store.command_query_rail_query
  where (rail_name, rail_type) in (
    ('GetWorkspaceFileContent', 'query'),
    ('SaveWorkspaceFileContent', 'command')
  );

  select count(*) into invalid_authority_count
  from planning_query_store.command_query_rail_query
  where (rail_name, rail_type) in (
    ('GetWorkspaceFileContent', 'query'),
    ('SaveWorkspaceFileContent', 'command')
  )
    and (
      ddd_owner <> 'WorkspaceFileContent'
      or rail_status <> 'implemented'
      or rail_source <> 'local'
      or is_gap
      or is_duplicate
    );

  if authority_count <> 2 then
    raise exception 'WorkspaceFileContent requires exactly two canonical rails, found %', authority_count;
  end if;

  if invalid_authority_count <> 0 then
    raise exception 'WorkspaceFileContent command/query authority is not canonical, local, implemented, and unique';
  end if;
end
$$;
