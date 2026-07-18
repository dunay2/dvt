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
    'IWorkspaceFileRepository.getFileContent',
    'GET RUNTIME_ROUTE_PATH.workspaceFileContent;IWorkspaceFilesQueryPort.getFileContent',
    'authenticated tenant, project, and environment workspace scope with workspace:files:view',
    jsonb_build_array(
      'apps/api/src/application/ports/workspaceFiles.ts#IWorkspaceFileRepository.getFileContent',
      'apps/api/src/application/services/getWorkspaceFileContentUseCase.ts#GetWorkspaceFileContentUseCase',
      'apps/api/src/entrypoints/http/workspaceFilesRoutes.ts#registerWorkspaceFilesRoutes',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#getFileContent',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts#getFileContent',
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
    'IWorkspaceFileRepository.saveFileContent',
    'POST RUNTIME_ROUTE_PATH.workspaceFileContent;IWorkspaceFileContentCommandPort.saveFileContent',
    'authenticated tenant, project, and environment workspace scope with workspace:files:save',
    jsonb_build_array(
      'apps/api/src/application/ports/workspaceFiles.ts#IWorkspaceFileRepository.saveFileContent',
      'apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts#SaveWorkspaceFileContentUseCase',
      'apps/api/src/entrypoints/http/workspaceFilesRoutes.ts#registerWorkspaceFilesRoutes',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#saveFileContent',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.ts#saveFileContent',
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
    'implementationPlan', 'Keep one provider-neutral WorkspaceFileContent query/command pair as the revision-guarded project-file authority and project it from DB-local command/query records instead of documentation imports.',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/code-workbench-workspace-files-component.md',
      'docs/architecture/components/web/workspace/workspace-port-decomposition-component.md'
    ),
    'userStories', jsonb_build_array(
      'An authorized user can read the exact current workspace file and its content revision.',
      'An authorized editor can persist one workspace file only when the expected revision still matches.',
      'A conflicting or failed write preserves the newer authoritative content and returns an actionable result.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/architecture/adr/ADR-0060-dbt-project-authoring-authority.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/api/src/application/ports/workspaceFiles.ts',
      'apps/api/src/application/services/getWorkspaceFileContentUseCase.ts',
      'apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts',
      'apps/api/src/entrypoints/http/workspaceFilesRoutes.ts',
      'apps/api/src/infrastructure/workspaceFiles/**',
      'apps/web/src/app/ports/workspace.ts',
      'apps/web/src/app/services/workspace/workspacePorts.api.ts',
      'tools/planning-db/migrations/745_workspace_file_content_rail_db_authority.sql',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/stores/**',
      'apps/web/cypress/**/fixtures/**',
      'buzon/**'
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object('name', 'WorkspaceFileContent', 'type', 'read model', 'owner', 'Project Workspace I/O'),
      jsonb_build_object('name', 'WorkspaceFileSaveReceipt', 'type', 'command receipt', 'owner', 'Project Workspace I/O'),
      jsonb_build_object('name', 'ExpectedWorkspaceFileRevision', 'type', 'value object', 'owner', 'Project Workspace I/O')
    ),
    'fowlerSignals', jsonb_build_array(
      'separated interface',
      'gateway',
      'optimistic offline lock',
      'hidden authority prevention'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object('name', 'API workspace-file suite', 'command', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/workspaceFilesRoutes.test.ts test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts test/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.test.ts'),
      jsonb_build_object('name', 'Web workspace-port suite', 'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/services/workspace/workspacePorts.files.test.ts'),
      jsonb_build_object('name', 'Planning DB migration suite', 'command', 'pnpm test:planning:db:migrations'),
      jsonb_build_object('name', 'Feature mechanization', 'command', 'pnpm docs:feature-mechanization:implementation')
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object('name', 'DBT author Code run live persistence', 'command', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'),
      jsonb_build_object('name', 'DBT YAML description live roundtrip', 'command', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts')
    ),
    'completionGate', jsonb_build_array(
      'pnpm test:planning:db:migrations',
      'pnpm --filter dvt-api test',
      'pnpm --filter @dvt/web test:unit:run',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', authority.rail_name,
        'type', authority.rail_type,
        'status', 'implemented',
        'dddOwner', 'WorkspaceFileContent'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', lower(authority.rail_name) || '-db-local-authority',
        'redTest', 'pnpm test:planning:db:migrations',
        'expectedFailure', 'A clean Planning DB bootstrap reaches a consumer assertion before the documentation-imported workspace-file rail exists.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/737_code_working_tree_dbt_reanalysis_design.sql',
          'tools/planning-db/migrations/745_workspace_file_content_rail_db_authority.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest', 'pnpm test:planning:db:migrations'
      )
    ),
    'symbols', case authority.rail_name
      when 'GetWorkspaceFileContent' then jsonb_build_array(
        jsonb_build_object(
          'name', 'GetWorkspaceFileContentUseCase',
          'path', 'apps/api/src/application/services/getWorkspaceFileContentUseCase.ts',
          'dddOwner', 'WorkspaceFileContent',
          'cqRails', jsonb_build_array('GetWorkspaceFileContent'),
          'fowlerSignals', jsonb_build_array('Application Service', 'Separated Interface'),
          'architectureGuard', 'apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
          'unitTests', jsonb_build_array('apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts')
        ),
        jsonb_build_object(
          'name', 'LocalWorkspaceFileRepository',
          'path', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
          'dddOwner', 'WorkspaceFileContent',
          'cqRails', jsonb_build_array('GetWorkspaceFileContent'),
          'fowlerSignals', jsonb_build_array('Gateway', 'Data Mapper'),
          'architectureGuard', 'apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
          'unitTests', jsonb_build_array('apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts')
        ),
        jsonb_build_object(
          'name', 'createApiWorkspaceFilesQueryPort',
          'path', 'apps/web/src/app/services/workspace/workspacePorts.api.ts',
          'dddOwner', 'WorkspaceFileContent',
          'cqRails', jsonb_build_array('GetWorkspaceFileContent'),
          'fowlerSignals', jsonb_build_array('Gateway', 'Separated Interface'),
          'architectureGuard', 'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
          'unitTests', jsonb_build_array('apps/web/src/app/services/workspace/workspacePorts.files.test.ts')
        )
      )
      else jsonb_build_array(
        jsonb_build_object(
          'name', 'SaveWorkspaceFileContentUseCase',
          'path', 'apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts',
          'dddOwner', 'WorkspaceFileContent',
          'cqRails', jsonb_build_array('SaveWorkspaceFileContent'),
          'fowlerSignals', jsonb_build_array('Application Service', 'Separated Interface'),
          'architectureGuard', 'apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
          'unitTests', jsonb_build_array('apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts')
        ),
        jsonb_build_object(
          'name', 'LocalWorkspaceFileMutationCoordinator',
          'path', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.ts',
          'dddOwner', 'WorkspaceFileContent',
          'cqRails', jsonb_build_array('SaveWorkspaceFileContent'),
          'fowlerSignals', jsonb_build_array('Unit of Work', 'Optimistic Offline Lock'),
          'architectureGuard', 'apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
          'unitTests', jsonb_build_array('apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.test.ts')
        ),
        jsonb_build_object(
          'name', 'createApiWorkspaceFileContentCommandPort',
          'path', 'apps/web/src/app/services/workspace/workspacePorts.api.ts',
          'dddOwner', 'WorkspaceFileContent',
          'cqRails', jsonb_build_array('SaveWorkspaceFileContent'),
          'fowlerSignals', jsonb_build_array('Gateway', 'Separated Interface'),
          'architectureGuard', 'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
          'unitTests', jsonb_build_array('apps/web/src/app/services/workspace/workspacePorts.files.test.ts')
        )
      )
    end
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
