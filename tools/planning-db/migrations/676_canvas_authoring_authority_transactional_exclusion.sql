-- Close two phase-three review gaps without introducing new product rails.
-- File publication retries retain stable command intent, while graph-draft
-- saves and file-authority binds enforce one Canvas owner under one shared
-- PostgreSQL transaction-lock identity.

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/676_canvas_authoring_authority_transactional_exclusion.sql',
  source_content_sha256 = case component_id
    when 'SYS-API-INFRA-WORKSPACE-DRAFT'
      then repeat(md5('SYS-API-INFRA-WORKSPACE-DRAFT:transactional-authority-exclusion:676'), 2)
    else repeat(md5('SYS-API-INFRA-CANVAS-AUTHORITY-STORE:transactional-draft-exclusion:676'), 2)
  end,
  owned_concern = case component_id
    when 'SYS-API-INFRA-WORKSPACE-DRAFT'
      then 'Persist scoped workspace graph drafts while transactionally rejecting every Canvas already owned by file-backed authoring authority.'
    else 'Persist scoped file-authority bindings while transactionally rejecting every Canvas already owned by a graph draft.'
  end,
  revision = revision + 1
where component_id in (
  'SYS-API-INFRA-WORKSPACE-DRAFT',
  'SYS-API-INFRA-CANVAS-AUTHORITY-STORE'
);

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-API-INFRA-WORKSPACE-DRAFT',
  'SYS-API-INFRA-CANVAS-AUTHORITY-STORE'
);

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values
  (
    'RESP-SYS-API-INFRA-WORKSPACE-DRAFT',
    'SYS-API-INFRA-WORKSPACE-DRAFT',
    'Persist scoped graph drafts and reject the complete aggregate when any member Canvas has file-backed authoring authority.',
    'Graph-draft persistence, CAS, aggregate Canvas identity, or cross-authority exclusion changes.',
    'ApiWorkspaceGraphDraftInfrastructureAdapter',
    'implemented'
  ),
  (
    'RESP-CANVAS-AUTHORITY-STORE',
    'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
    'Persist one scoped file-authority binding and reject it when graph-draft state already owns the Canvas.',
    'Authority persistence, conflict, idempotency, or cross-authority exclusion changes.',
    'ICanvasAuthoringAuthorityStore',
    'implemented'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

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
  'REL-WORKSPACE-DRAFT-FILE-AUTHORITY-MUTUAL-EXCLUSION',
  'SYS-API-INFRA-WORKSPACE-DRAFT',
  'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
  'guards',
  'bidirectional',
  'sync',
  'A concurrent or reordered write persists both graph-draft and file-backed semantic authority for one Canvas.',
  'tenant/project/environment/canvas',
  jsonb_build_array(
    'apps/api/src/application/ports/canvasAuthoringAuthority.ts',
    'apps/api/src/application/ports/workspaceGraphDraft.ts',
    'apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts',
    'apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts'
  ),
  'implemented'
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

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-CANVAS-AUTHORITY-STORE',
    'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
    'apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts',
    'integration',
    'boundary',
    true,
    'pnpm --filter dvt-api exec vitest run test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts'
  ),
  (
    'TEST-WORKSPACE-DRAFT-FILE-AUTHORITY-EXCLUSION',
    'SYS-API-INFRA-WORKSPACE-DRAFT',
    'apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts',
    'integration',
    'boundary',
    true,
    'pnpm --filter dvt-api exec vitest run test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

-- Promote the documented SaveWorkspaceGraphDraft rail through a same-identity
-- DB-local override. Migrations run before governance import in clean CI, so
-- the canonical identity must also be available without an imported row.
with canonical_rail_identity as (
  select
    'docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md#DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG#command#00121#saveworkspacegraphdraft'::text as rail_id,
    'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG'::text as feature_id,
    'SaveWorkspaceGraphDraft'::text as rail_name,
    'saveworkspacegraphdraft'::text as normalized_rail_name,
    'command'::text as rail_type,
    jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md'
    ) as documentation_refs,
    jsonb_build_object(
      'sourceKind', 'documentation_scan',
      'documentPath', 'docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md'
    ) as raw_manifest
), target_rail as (
  select
    rail.rail_id,
    rail.feature_id,
    rail.rail_name,
    rail.normalized_rail_name,
    rail.rail_type,
    rail.documentation_refs,
    rail.raw_manifest
  from planning_query_store.command_query_rails rail
  join canonical_rail_identity canonical using (rail_id)

  union all

  select canonical.*
  from canonical_rail_identity canonical
  where not exists (
    select 1
    from planning_query_store.command_query_rails rail
    where rail.rail_id = canonical.rail_id
  )
), patch as (
  select
    jsonb_build_array(
      'apps/api/src/application/ports/workspaceGraphDraft.ts#resolveWorkspaceGraphDraftCanvasIds',
      'apps/api/src/application/services/saveWorkspaceGraphDraftUseCase.ts#SaveWorkspaceGraphDraftUseCase',
      'apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts#PostgresCanvasAuthoringAuthorityStore',
      'apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts#PostgresWorkspaceGraphDraftStore',
      'apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts#registerWorkspaceGraphDraftRoutes'
    ) as symbol_refs,
    jsonb_build_array(
      'apps/api/src/application/ports/canvasAuthoringAuthority.ts',
      'apps/api/src/application/ports/workspaceGraphDraft.ts',
      'apps/api/src/application/services/saveWorkspaceGraphDraftUseCase.ts',
      'apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts',
      'apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts',
      'apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts',
      'apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts',
      'apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts'
    ) as implementation_refs
)
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
  created_by,
  created_at,
  updated_at
)
select
  target_rail.rail_id,
  target_rail.feature_id,
  'implemented',
  target_rail.rail_name,
  target_rail.normalized_rail_name,
  target_rail.rail_type,
  'WorkspaceGraphAuthoringDraft',
  'implemented',
  patch.symbol_refs,
  patch.implementation_refs,
  (
    select jsonb_agg(value order by value)
    from (
      select value from jsonb_array_elements_text(coalesce(target_rail.documentation_refs, '[]'::jsonb))
      union
      select unnest(array[
        'docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md',
        'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
        'docs/evidence/ED-20260714-dbt-project-import-phase3-runtime.md'
      ]::text[])
    ) refs
  ),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md',
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md'
  ),
  patch.implementation_refs,
  jsonb_build_array(
    'Every Canvas identity in the aggregate is locked in stable order before the draft write.',
    'A file-authoritative Canvas rejects the complete graph-draft save.',
    'Graph-draft save and file-authority bind use the same scoped transaction lock identity.'
  ),
  jsonb_build_array(
    'pnpm --filter dvt-api test',
    'pnpm --filter dvt-api typecheck',
    'pnpm --filter dvt-api lint',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/676_canvas_authoring_authority_transactional_exclusion.sql',
  repeat(md5('SaveWorkspaceGraphDraft:transactional-authority-exclusion:676'), 2),
  jsonb_build_object(
    'name', 'SaveWorkspaceGraphDraft',
    'type', 'command',
    'status', 'implemented',
    'boundedContext', 'Workspace authoring',
    'dddOwner', 'WorkspaceGraphAuthoringDraft',
    'applicationPort', 'SaveWorkspaceGraphDraftUseCase.execute',
    'adapterSurface', 'PostgresWorkspaceGraphDraftStore.save',
    'authorizationScope', 'workspace:graph-draft:save in tenant/project/environment scope',
    'negativeTests', jsonb_build_array(
      'read-only or forbidden capability',
      'stale revision',
      'idempotency mismatch',
      'unsupported schema',
      'file-authority conflict',
      'concurrent file-authority claim has exactly one winner'
    )
  ),
  coalesce(target_rail.raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'mechanizationStatus', 'implemented',
    'authorityInvariant', 'exactly_one_graph_draft_or_file_backed_owner_per_canvas'
  ),
  0,
  'codex',
  now(),
  now()
from target_rail
cross join patch
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
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

update planning_query_store.feature_mechanization_local_rails
set
  raw_rail = raw_rail || jsonb_build_object(
    'transactionalAuthorityGuard', 'shared_scoped_advisory_lock_plus_competing_store_revalidation',
    'negativeEvidence', jsonb_build_array(
      'apps/api/test/application/dbtProjectImportUseCases.test.ts#fails closed on authority canvas_occupied before projecting',
      'apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts#rejects file authority when the same Canvas is already owned by the graph draft',
      'apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts#serializes concurrent draft and file-authority claims so only one owner wins'
    )
  ),
  source_path = 'tools/planning-db/migrations/676_canvas_authoring_authority_transactional_exclusion.sql',
  source_content_sha256 = repeat(md5('ImportDbtProject:transactional-authority-exclusion:676'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'ImportDbtProject';

update planning_query_store.feature_mechanization_local_rails
set
  raw_rail = raw_rail || jsonb_build_object(
    'retryIdentity', 'desired_mutation_plus_expected_path_set',
    'revisionSemantics', 'first_application_compare_and_swap_precondition',
    'equivalentRetry', 'replay_receipt_after_postconditions_match',
    'retryEvidence', jsonb_build_array(
      'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts#deduplicates an equivalent retry after publication changed the expected revisions'
    )
  ),
  source_path = 'tools/planning-db/migrations/676_canvas_authoring_authority_transactional_exclusion.sql',
  source_content_sha256 = repeat(md5('ImportWarehouseSources:post-publication-retry:676'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'ImportWarehouseSources';

-- Extend the existing phase-three manifest with the reviewed behavior and
-- source ownership. Symbols are merged by path/name, never appended as a
-- duplicate declaration.
with symbol_group (
  path,
  ddd_owner,
  cq_rails,
  fowler_signals,
  architecture_guard,
  unit_tests,
  symbols
) as (
  values
    (
      'apps/api/src/application/ports/canvasAuthoringAuthority.ts',
      'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
      array['ImportDbtProject', 'SaveWorkspaceGraphDraft']::text[],
      array['Separated Interface', 'Published Language']::text[],
      'pnpm --filter dvt-api test:arch',
      array['apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts']::text[],
      array['serializeCanvasAuthoringAuthorityKey']::text[]
    ),
    (
      'apps/api/src/application/ports/workspaceGraphDraft.ts',
      'SYS-API-APPLICATION-PORTS',
      array['SaveWorkspaceGraphDraft', 'ImportWarehouseSources']::text[],
      array['Separated Interface', 'Published Language']::text[],
      'pnpm --filter dvt-api test:arch',
      array['apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts']::text[],
      array[
        'IWorkspaceGraphDraftStore',
        'WorkspaceGraphDraftSaveStoreResult',
        'resolveWorkspaceGraphDraftCanvasIds'
      ]::text[]
    ),
    (
      'apps/api/src/application/services/saveWorkspaceGraphDraftUseCase.ts',
      'SYS-API-APPLICATION-SERVICES-WORKSPACE',
      array['SaveWorkspaceGraphDraft']::text[],
      array['Service Layer', 'Command']::text[],
      'pnpm --filter dvt-api test:arch',
      array['apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts']::text[],
      array['SaveWorkspaceGraphDraftUseCase', 'SaveWorkspaceGraphDraftUseCaseResult']::text[]
    ),
    (
      'apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts',
      'SYS-API-HTTP-ERROR-TRANSLATION',
      array['SaveWorkspaceGraphDraft']::text[],
      array['Published Language', 'Special Case']::text[],
      'pnpm --filter dvt-api test:arch',
      array['apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts']::text[],
      array['HTTP_ERROR_REASON']::text[]
    ),
    (
      'apps/api/src/entrypoints/http/httpErrorTranslation.ts',
      'SYS-API-HTTP-ERROR-TRANSLATION',
      array['SaveWorkspaceGraphDraft']::text[],
      array['Remote Facade', 'Data Mapper']::text[],
      'pnpm --filter dvt-api test:arch',
      array['apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts']::text[],
      array['httpErrorTranslation']::text[]
    ),
    (
      'apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts',
      'SYS-API-HTTP-WORKSPACE-ROUTES',
      array['SaveWorkspaceGraphDraft']::text[],
      array['Remote Facade', 'Controller']::text[],
      'pnpm --filter dvt-api test:arch',
      array['apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts']::text[],
      array['registerWorkspaceGraphDraftRoutes']::text[]
    ),
    (
      'apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts',
      'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
      array['ImportDbtProject', 'SaveWorkspaceGraphDraft']::text[],
      array['Repository', 'Data Mapper']::text[],
      'pnpm --filter dvt-api test:arch',
      array['apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts']::text[],
      array['DraftPayloadRow', 'PostgresCanvasAuthoringAuthorityStore']::text[]
    ),
    (
      'apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts',
      'SYS-API-INFRA-WORKSPACE-DRAFT',
      array['SaveWorkspaceGraphDraft', 'ImportWarehouseSources']::text[],
      array['Repository', 'Data Mapper']::text[],
      'pnpm --filter dvt-api test:arch',
      array['apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts']::text[],
      array['AuthorityConflictRow', 'PostgresWorkspaceGraphDraftStore']::text[]
    )
), extension as (
  select
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', symbol_name,
          'path', path,
          'dddOwner', ddd_owner,
          'cqRails', to_jsonb(cq_rails),
          'fowlerSignals', to_jsonb(fowler_signals),
          'architectureGuard', architecture_guard,
          'cypressCoverage', 'not_applicable:server_transaction_boundary',
          'unitTests', to_jsonb(unit_tests)
        ) order by path, symbol_name
      )
      from symbol_group
      cross join lateral unnest(symbols) symbol(symbol_name)
    ) as symbols,
    jsonb_build_array(
      'apps/api/src/application/ports/canvasAuthoringAuthority.ts',
      'apps/api/src/application/ports/workspaceGraphDraft.ts',
      'apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts',
      'apps/api/src/application/services/importDbtProjectUseCase.ts',
      'apps/api/src/application/services/saveWorkspaceGraphDraftUseCase.ts',
      'apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts',
      'apps/api/src/entrypoints/http/httpErrorTranslation.ts',
      'apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts',
      'apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts',
      'apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts',
      'apps/api/test/application/dbtProjectImportUseCases.test.ts',
      'apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts',
      'apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts',
      'apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts',
      'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts',
      'docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md',
      'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
      'docs/evidence/ED-20260714-dbt-project-import-phase3-runtime.md',
      'docs/risk-register/quality/R-20260714-DBT-PROJECT-IMPORT-AUTHORITY.yaml',
      'tools/planning-db/migrations/676_canvas_authoring_authority_transactional_exclusion.sql'
    ) as surfaces,
    jsonb_build_array(
      'Graph-draft save and file-authority bind share one scoped transaction-lock identity and revalidate the competing store.',
      'Every Canvas id in a multi-Canvas draft is checked in stable lock order.',
      'File-batch command identity excludes mutable CAS revision values while receipt postconditions guard replay.'
    ) as guards,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'phase3-post-publication-file-batch-retry',
        'redTest', 'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts',
        'expectedFailure', 'An equivalent retry after successful publication conflicted with revisions written by its first application.',
        'patchSurfaces', jsonb_build_array(
          'apps/api/src/infrastructure/workspaceFiles/localWorkspaceFileBatchMutationModel.ts',
          'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts'
        ),
        'greenTest', 'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts'
      ),
      jsonb_build_object(
        'id', 'phase3-transactional-authority-exclusion',
        'redTest', 'pnpm --filter dvt-api exec vitest run test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts',
        'expectedFailure', 'Graph-draft saves could recreate semantic authority after a Canvas was bound to dbt project files.',
        'patchSurfaces', jsonb_build_array(
          'apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts',
          'apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts'
        ),
        'greenTest', 'DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-api exec vitest run test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts'
      )
    ) as red_green_cycles
), target_symbols as (
  select
    rail.rail_id,
    (
      select jsonb_agg(item order by path, name)
      from (
        select distinct on (path, name) item, path, name
        from (
          select
            item,
            item ->> 'path' as path,
            coalesce(item ->> 'name', item ->> 'symbol') as name,
            0 as priority
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(item)
          union all
          select item, item ->> 'path', item ->> 'name', 1
          from jsonb_array_elements(extension.symbols) symbols(item)
        ) candidates
        where path is not null and name is not null
        order by path, name, priority desc
      ) distinct_symbols
    ) as symbols,
    (
      select jsonb_agg(to_jsonb(value) order by value)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb))
        union
        select value from jsonb_array_elements_text(extension.surfaces)
      ) distinct_surfaces
    ) as surfaces,
    (
      select jsonb_agg(to_jsonb(value) order by value)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.raw_manifest -> 'architectureGuards', '[]'::jsonb))
        union
        select value from jsonb_array_elements_text(extension.guards)
      ) distinct_guards
    ) as guards,
    extension.red_green_cycles
  from planning_query_store.feature_mechanization_local_rails rail
  cross join extension
  where rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
), target as (
  select
    target_symbols.*,
    (
      select jsonb_agg(to_jsonb((item ->> 'path') || '#' || (item ->> 'name')) order by item ->> 'path', item ->> 'name')
      from jsonb_array_elements(target_symbols.symbols) symbols(item)
    ) as symbol_refs
  from target_symbols
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = target.symbol_refs,
  implementation_refs = target.surfaces,
  allowed_implementation_surfaces = target.surfaces,
  architecture_guards = target.guards,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(rail.raw_manifest, '{symbols}', target.symbols, true),
          '{allowedImplementationSurfaces}', target.surfaces, true
        ),
        '{architectureGuards}', target.guards, true
      ),
      '{redGreenCycles}',
      coalesce(rail.raw_manifest -> 'redGreenCycles', '[]'::jsonb) || target.red_green_cycles,
      true
    ),
    '{commandQueryRails}',
    coalesce(rail.raw_manifest -> 'commandQueryRails', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'name', 'SaveWorkspaceGraphDraft',
        'type', 'command',
        'dddOwner', 'WorkspaceGraphAuthoringDraft'
      )
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/676_canvas_authoring_authority_transactional_exclusion.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':phase3-transactional-closeout:676'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from target
where rail.rail_id = target.rail_id;
