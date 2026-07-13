-- Record the implemented phase-two contracts and protected API projection
-- without claiming the still-pending Web/Canvas consumer.

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING',
  'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
  'SYS-API-INFRA-DBT-PROJECT-ANALYZER'
);

update architecture.component_responsibility
set status = 'implemented'
where responsibility_id in (
  'RESP-CANVAS-AUTHORITY-BINDING-CONTRACT',
  'RESP-DBT-PROJECT-GRAPH-QUERY',
  'RESP-DBT-CLI-PROJECT-ANALYZER'
);

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-DBT-PROJECT-GRAPH-USES-AUTHORITY-CONTRACT',
  'REL-DBT-PROJECT-GRAPH-USES-ANALYZER'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'responsibility', 'Define mutually exclusive Canvas semantic authority and the versioned dbt graph projection wire contract.', 0),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'non_goal', 'Persist authority bindings or mutate dbt project files.', 0),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'reason_to_change', 'The cross-boundary authority or projection contract changes.', 0),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'public_api', 'CanvasAuthoringAuthorityBindingSchema', 0),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'public_api', 'DbtProjectGraphProjectionSchema', 1),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'invariant', 'Exactly one graph-draft or dbt-project-files authority is present for a canvas.', 0),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'invariant', 'Projection edges reference existing unique_id nodes and non-fresh projections are not executable.', 1),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'transition', 'Contract evolution requires a new schema version; v1 is never widened with shadow authority.', 0),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'consumer', 'ProjectDbtGraphFromFilesUseCase', 0),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'consumer', 'Canvas dbt file projection', 1),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'governance_ref', 'ADR-0060', 0),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'fowler_signal', 'Hidden authority', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'responsibility', 'Orchestrate one authorized dbt analysis into a validated deterministic graph projection.', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'non_goal', 'Execute dbt CLI, parse manifest JSON, or persist projected semantic nodes.', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'reason_to_change', 'Projection policy or file-authority query orchestration changes.', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'public_api', 'ProjectDbtGraphFromFilesUseCase.execute', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'invariant', 'Graph-draft authority is rejected and never inferred as file authority.', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'invariant', 'Phase-two projections remain code-only and do not advertise Preview or Run.', 1),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'transition', 'Analyzer valid, invalid, or unavailable states map to fresh, invalid, or unavailable projection states.', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'consumer', 'Protected dbt project graph HTTP adapter', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'governance_ref', 'ProjectDbtGraphFromFiles', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'fowler_signal', 'Responsibility overload', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'responsibility', 'Execute server-owned dbt parse and normalize a fresh isolated manifest.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'non_goal', 'Authorize HTTP requests, build Canvas layout, or consume project credentials from the workspace.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'reason_to_change', 'dbt CLI invocation, isolation policy, content hashing, or manifest normalization changes.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'public_api', 'IDbtProjectAnalyzerPort.analyze', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'invariant', 'Only an isolated target manifest produced by the current invocation is authoritative.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'invariant', 'Workspace credentials and project profiles are excluded from analyzer process authority.', 1),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'transition', 'dbt parse success yields valid; parse rejection yields invalid; boundary failure yields unavailable.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'consumer', 'ProjectDbtGraphFromFilesUseCase', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'governance_ref', 'ADR-0060', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'fowler_signal', 'Boundary drift', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/645_dbt_project_file_projection_phase2_api_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented:645'), 2),
  status = 'canonical',
  revision = revision + 1
where component_id in (
  'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING',
  'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
  'SYS-API-INFRA-DBT-PROJECT-ANALYZER'
);

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING',
  'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
  'SYS-API-INFRA-DBT-PROJECT-ANALYZER'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'owns', 'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts', 0),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'owns', 'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts', 1),
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'owns', 'packages/@dvt/contracts/test/dbt-project-file-projection.contract.test.ts', 2),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'owns', 'apps/api/src/application/ports/dbtProjectAnalysis.ts', 0),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'owns', 'apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts', 1),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'owns', 'apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts', 2),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/src/infrastructure/dbt/dbtAnalysisHash.ts', 1),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts', 2),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/src/infrastructure/dbt/dbtManifestProjection.ts', 3),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts', 4),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts', 5)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'owns', 'apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts', 40),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'owns', 'apps/api/src/entrypoints/http/dbtProjectGraphRouteGroup.ts', 41),
  ('SYS-API-HTTP-ENTRYPOINT-TESTS-WORKSPACE-ROUTES', 'owns', 'apps/api/test/entrypoints/http/dbtProjectGraphRoutes.test.ts', 40)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

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
values
  (
    'REL-HTTP-WORKSPACE-ROUTES-CALLS-DBT-PROJECTION',
    'SYS-API-HTTP-WORKSPACE-ROUTES',
    'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
    'calls',
    'outbound',
    'async',
    'Invalid input is rejected before analysis; invalid or unavailable dbt analysis remains an explicit projection state.',
    'workspace:graph-draft:view with tenant/project/environment scope',
    jsonb_build_array(
      'apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts',
      'apps/api/src/entrypoints/http/dbtProjectGraphRouteGroup.ts'
    ),
    'implemented'
  ),
  (
    'REL-DBT-ANALYZER-IMPLEMENTS-PROJECT-ANALYSIS-PORT',
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
    'implements_port',
    'inbound',
    'async',
    'The adapter returns normalized invalid or unavailable analysis instead of a stale manifest or graph-draft fallback.',
    'authorized workspace scope and contained project root',
    jsonb_build_array(
      'apps/api/src/application/ports/dbtProjectAnalysis.ts',
      'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts'
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
    'TEST-DBT-PROJECT-GRAPH-HTTP',
    'SYS-API-HTTP-WORKSPACE-ROUTES',
    'apps/api/test/entrypoints/http/dbtProjectGraphRoutes.test.ts',
    'integration',
    'negative',
    true,
    'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/dbtProjectGraphRoutes.test.ts'
  ),
  (
    'TEST-DBT-PROJECT-GRAPH-RUNTIME-CATALOG',
    'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
    'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts#CanvasAuthoringAuthorityBindingSchema',
    'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts#DbtProjectGraphProjectionSchema',
    'apps/api/src/application/ports/dbtProjectAnalysis.ts#IDbtProjectAnalyzerPort',
    'apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts#ProjectDbtGraphFromFilesUseCase',
    'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts#DbtCliProjectAnalyzer',
    'apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts#registerDbtProjectGraphRoutes'
  ),
  implementation_refs = jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts',
    'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts',
    'packages/@dvt/contracts/src/index.ts',
    'packages/@dvt/contracts/test/dbt-project-file-projection.contract.test.ts',
    'apps/api/src/application/ports/dbtProjectAnalysis.ts',
    'apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts',
    'apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts',
    'apps/api/src/application/ports/protectedRuntimeWorkspaceCommandQueryRails.ts',
    'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts',
    'apps/api/src/infrastructure/dbt/dbtAnalysisHash.ts',
    'apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts',
    'apps/api/src/infrastructure/dbt/dbtManifestProjection.ts',
    'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts',
    'apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts',
    'apps/api/src/entrypoints/http/dbtProjectGraphRouteGroup.ts',
    'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts',
    'apps/api/src/entrypoints/http/runtimeRoutes.constants.ts',
    'apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts',
    'apps/api/src/plugins/env.ts',
    'apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts',
    'apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts',
    'apps/api/test/entrypoints/http/dbtProjectGraphRoutes.test.ts',
    'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts'
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';
