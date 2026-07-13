-- Govern phase two of file-backed dbt authoring before implementation. The
-- query projects authoritative project files and never merges graph-draft
-- semantics or introduces a second save/run rail.

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
  'DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'dbt analysis and read-only file projection',
  'dbt Project Analysis / Canvas Authoring',
  'approved',
  'Phase one made workspace-file writes revision safe. Phase two adds one server-owned analysis query and one read-only Canvas projection while WorkspaceGraphAuthoringDraft.v1 remains unchanged and graph-draft only.',
  'hidden_authority',
  'ProjectDbtGraphFromFiles',
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
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'decision', 'ADR-0060', 'must_prove', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'query', 'ProjectDbtGraphFromFiles', 'may_create', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'contract', 'CanvasAuthoringAuthorityBinding.v1', 'may_create', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'contract', 'DbtProjectGraphProjection.v1', 'may_create', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'component', 'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'may_create', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'component', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'may_create', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'component', 'SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'may_create', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'component', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'may_create', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
values (
  'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
  'E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713',
  'implemented',
  'ProjectDbtGraphFromFiles',
  'projectdbtgraphfromfiles',
  'query',
  'DbtProjectGraphProjection',
  'accepted',
  jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts#CanvasAuthoringAuthorityBinding',
    'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts#DbtProjectGraphProjection',
    'apps/api/src/application/ports/dbtProjectAnalysis.ts#IDbtProjectAnalyzerPort',
    'apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts#ProjectDbtGraphFromFilesUseCase'
  ),
  jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts',
    'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts',
    'apps/api/src/application/ports/dbtProjectAnalysis.ts',
    'apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts',
    'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts',
    'apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts',
    'apps/web/src/app/views/canvas/dbtProjectFileProjection.ts'
  ),
  jsonb_build_array(
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts',
    'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts',
    'packages/@dvt/contracts/src/index.ts',
    'packages/@dvt/contracts/test/**',
    'apps/api/src/application/ports/dbtProjectAnalysis.ts',
    'apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts',
    'apps/api/src/infrastructure/dbt/**',
    'apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts',
    'apps/api/src/entrypoints/http/dbtProjectGraphRouteGroup.ts',
    'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts',
    'apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts',
    'apps/api/src/plugins/env.ts',
    'apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts',
    'apps/api/test/infrastructure/dbt/**',
    'apps/api/test/entrypoints/http/dbtProjectGraphRoutes.test.ts',
    'apps/web/src/app/ports/dbtProjectGraph.ts',
    'apps/web/src/app/services/dbtProject/**',
    'apps/web/src/app/queries/dbtProjectQueries.ts',
    'apps/web/src/app/views/canvas/**',
    'apps/web/src/app/plugins/dbt/**',
    'apps/web/cypress/e2e/dbt/**',
    'docs/architecture/components/web/**',
    'docs/evidence/**',
    'docs/risk-register/quality/**',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/644_dbt_project_file_projection_phase2_design.sql',
    'tools/planning-db/migrations/645_dbt_project_file_projection_phase2_api_closeout.sql',
    'tools/planning-db/migrations/646_dbt_project_file_projection_phase2_web_closeout.sql',
    'tools/planning-db/migrations/647_dbt_project_file_projection_phase2_live_closeout.sql'
  ),
  jsonb_build_array(
    'WorkspaceGraphAuthoringDraft.v1 remains unchanged and graph-draft only',
    'no browser-owned dbt or Jinja parsing',
    'no graph-draft semantic merge in file-backed projection',
    'no .dvt sidecar',
    'no dbt-specific save, readiness, or run synonym'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/contracts test',
    'pnpm --filter dvt-api test',
    'pnpm --filter @dvt/web test:unit:run',
    'pnpm docs:feature-mechanization:implementation -- --feature E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/644_dbt_project_file_projection_phase2_design.sql',
  repeat(md5('ProjectDbtGraphFromFiles:planned:644'), 2),
  jsonb_build_object(
    'name', 'ProjectDbtGraphFromFiles',
    'type', 'query',
    'boundedContext', 'dbt Project Analysis',
    'dddObject', 'DbtProjectGraphProjection',
    'inputValueObjects', jsonb_build_array('WorkspaceStorageScope', 'CanvasAuthoringAuthorityBinding'),
    'outputReadModel', 'DbtProjectGraphProjection.v1',
    'applicationPort', 'ProjectDbtGraphFromFilesUseCase',
    'outboundPort', 'IDbtProjectAnalyzerPort',
    'adapterSurface', 'protected GET /workspace/dbt/graph and server dbt parse adapter',
    'scopeAndAuthorization', 'workspace:graph-draft:view with tenant/project/environment scope and bound project-root containment',
    'consistency', 'fresh analysis for deterministic project revision; invalid and unavailable are explicit read states',
    'errorVocabulary', jsonb_build_array('dbt_project_not_found', 'dbt_project_invalid', 'dbt_project_analysis_failed', 'dbt_project_root_invalid', 'dbt_adapter_unavailable'),
    'negativeTests', jsonb_build_array(
      'deny unauthenticated query',
      'deny unauthorized workspace scope',
      'reject project-root traversal and symlink escape',
      'return dbt_project_invalid with normalized diagnostics',
      'return dbt_project_analysis_failed without graph-draft fallback',
      'reject duplicate dbt unique_id resources',
      'ignore pre-existing target manifest and use isolated analysis output'
    ),
    'status', 'accepted'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Implement server dbt analysis and read-only file-backed Canvas projection without authority fallback or visual mutation.',
    'componentGuides', jsonb_build_array('docs/adr/ADR-0060-dbt-project-authoring-authority.md'),
    'userStories', jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
    'governingSources', jsonb_build_array('AGENTS.md', 'docs/adr/ADR-0060-dbt-project-authoring-authority.md', 'docs/architecture/command-query-rail-governance.md', 'docs/architecture/fowler-opportunity-planning-governance.md'),
    'allowedImplementationSurfaces', jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts',
      'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts',
      'packages/@dvt/contracts/src/index.ts',
      'packages/@dvt/contracts/test/**',
      'apps/api/src/application/ports/dbtProjectAnalysis.ts',
      'apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts',
      'apps/api/src/infrastructure/dbt/**',
      'apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts',
      'apps/api/src/entrypoints/http/dbtProjectGraphRouteGroup.ts',
      'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts',
      'apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts',
      'apps/api/src/plugins/env.ts',
      'apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts',
      'apps/api/test/infrastructure/dbt/**',
      'apps/api/test/entrypoints/http/dbtProjectGraphRoutes.test.ts',
      'apps/web/src/app/ports/dbtProjectGraph.ts',
      'apps/web/src/app/services/dbtProject/**',
      'apps/web/src/app/queries/dbtProjectQueries.ts',
      'apps/web/src/app/views/canvas/**',
      'apps/web/src/app/plugins/dbt/**',
      'apps/web/cypress/e2e/dbt/**',
      'docs/architecture/components/web/**',
      'docs/evidence/**',
      'docs/risk-register/quality/**',
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/644_dbt_project_file_projection_phase2_design.sql',
      'tools/planning-db/migrations/645_dbt_project_file_projection_phase2_api_closeout.sql',
      'tools/planning-db/migrations/646_dbt_project_file_projection_phase2_web_closeout.sql',
      'tools/planning-db/migrations/647_dbt_project_file_projection_phase2_live_closeout.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array('packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts', 'packages/@dvt/engine/**', 'packages/@dvt/planner/**', 'packages/@dvt/adapter-*/**', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts', 'apps/web/src/app/views/canvas/useCanvasExecutionActions.ts'),
    'commandQueryRails', jsonb_build_array(jsonb_build_object('name', 'ProjectDbtGraphFromFiles', 'type', 'query', 'dddOwner', 'DbtProjectGraphProjection')),
    'domainObjects', jsonb_build_array(
      jsonb_build_object('name', 'CanvasAuthoringAuthorityBinding', 'type', 'value object', 'owner', 'Canvas Authoring'),
      jsonb_build_object('name', 'DbtProjectAnalysis', 'type', 'read model', 'owner', 'dbt Project Analysis'),
      jsonb_build_object('name', 'DbtProjectGraphProjection', 'type', 'projection', 'owner', 'dbt Project Analysis')
    ),
    'fowlerSignals', jsonb_build_array('Boundary drift', 'Hidden authority', 'Responsibility overload', 'Primitive obsession', 'Test-only confidence'),
    'architectureGuards', jsonb_build_array('pnpm --filter dvt-api test:arch', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts'),
    'cypressFlows', jsonb_build_array('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'),
    'completionGate', jsonb_build_array('pnpm --filter @dvt/contracts test', 'pnpm --filter dvt-api test', 'pnpm --filter dvt-api typecheck', 'pnpm --filter dvt-api lint', 'pnpm --filter @dvt/web test:unit:run', 'pnpm --filter @dvt/web test:presentation:run', 'pnpm --filter @dvt/web typecheck', 'pnpm --filter @dvt/web lint', 'node --test scripts/planning-db-migrate.test.cjs', 'pnpm docs:feature-mechanization:implementation -- --feature E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'pnpm verify:prepush'),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object('id', 'dbt-project-analysis-contract', 'redTest', 'pnpm --filter @dvt/contracts test -- CanvasAuthoringAuthorityBinding DbtProjectGraphProjection', 'expectedFailure', 'contracts absent', 'patchSurfaces', jsonb_build_array('packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts', 'packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts'), 'greenTest', 'pnpm --filter @dvt/contracts test -- CanvasAuthoringAuthorityBinding DbtProjectGraphProjection'),
      jsonb_build_object('id', 'dbt-server-analyzer', 'redTest', 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts', 'expectedFailure', 'server analyzer absent', 'patchSurfaces', jsonb_build_array('apps/api/src/application/ports/dbtProjectAnalysis.ts', 'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts'), 'greenTest', 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts'),
      jsonb_build_object('id', 'dbt-project-graph-query', 'redTest', 'pnpm --filter dvt-api exec vitest run test/application/projectDbtGraphFromFilesUseCase.test.ts test/entrypoints/http/dbtProjectGraphRoutes.test.ts', 'expectedFailure', 'protected query absent', 'patchSurfaces', jsonb_build_array('apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts', 'apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts'), 'greenTest', 'pnpm --filter dvt-api exec vitest run test/application/projectDbtGraphFromFilesUseCase.test.ts test/entrypoints/http/dbtProjectGraphRoutes.test.ts'),
      jsonb_build_object('id', 'dbt-file-backed-canvas-projection', 'redTest', 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtProjectFileProjection.test.ts', 'expectedFailure', 'authority-aware projection absent', 'patchSurfaces', jsonb_build_array('apps/web/src/app/views/canvas/dbtProjectFileProjection.ts'), 'greenTest', 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtProjectFileProjection.test.ts')
    ),
    'symbols', jsonb_build_array()
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
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

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'tools/planning-db/migrations/644_dbt_project_file_projection_phase2_design.sql', repeat(md5('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING:planned:644'), 2), 0, 'Canvas authoring authority binding contract', 'component', 'SYS-CONTRACTS-ROOT', 'SYS-DVT', 'SYS-CONTRACTS', 'review', false, 'Define the versioned mutually exclusive graph-draft or dbt-project-files authority binding and dbt graph projection read model.', 'CanvasAuthoringAuthorityBinding', 'ProjectDbtGraphFromFiles', 'codex'),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'tools/planning-db/migrations/644_dbt_project_file_projection_phase2_design.sql', repeat(md5('SYS-API-APPLICATION-DBT-PROJECT-GRAPH:planned:644'), 2), 0, 'dbt project graph query service', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Authorize and orchestrate one dbt project analysis into the ProjectDbtGraphFromFiles read model.', 'DbtProjectGraphProjection', 'ProjectDbtGraphFromFiles', 'codex'),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'tools/planning-db/migrations/644_dbt_project_file_projection_phase2_design.sql', repeat(md5('SYS-API-INFRA-DBT-PROJECT-ANALYZER:planned:644'), 2), 0, 'Server dbt project analyzer adapter', 'component', 'SYS-API-INFRASTRUCTURE', 'SYS-DVT', 'SYS-API-ROOT', 'review', false, 'Run scoped dbt parse in isolated target and log directories and normalize its manifest into deterministic analysis.', 'IDbtProjectAnalyzerPort', 'ProjectDbtGraphFromFiles', 'codex'),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'tools/planning-db/migrations/644_dbt_project_file_projection_phase2_design.sql', repeat(md5('SYS-WEB-CANVAS-DBT-FILE-PROJECTION:planned:644'), 2), 0, 'Canvas dbt file projection', 'component', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'SYS-DVT', 'SYS-WEB', 'review', false, 'Project the authoritative dbt read model into read-only Canvas nodes and edges keyed by unique_id and route-local layout.', 'DbtProjectGraphProjection', 'ProjectDbtGraphFromFiles;GetCanvasLayout', 'codex')
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
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
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING',
  'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
  'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
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
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/src/infrastructure/dbt/**', 0),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'owns', 'apps/api/test/infrastructure/dbt/**', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/ports/dbtProjectGraph.ts', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/services/dbtProject/**', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/queries/dbtProjectQueries.ts', 2),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileProjection*.ts', 3)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
values
  ('SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'Canvas authoring authority binding contract', 'module', 'contracts', 'Canvas Authoring', 'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts', 'CanvasAuthoringAuthorityBinding.v1 and DbtProjectGraphProjection.v1', 'shared', 'critical', 'proposed', 'SYS-CONTRACTS-ROOT'),
  ('SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'dbt project graph query service', 'service', 'application', 'dbt Project Analysis', 'apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts', 'ProjectDbtGraphFromFiles', 'node', 'critical', 'proposed', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'Server dbt project analyzer adapter', 'adapter', 'adapter', 'dbt Project Analysis', 'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts', 'IDbtProjectAnalyzerPort', 'node', 'critical', 'proposed', 'SYS-API-INFRASTRUCTURE'),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'Canvas dbt file projection', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 'DbtProjectGraphProjection read-only Canvas strategy', 'browser', 'critical', 'proposed', 'SYS-WEB-CANVAS-GRAPH-SURFACE')
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
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values
  ('RESP-CANVAS-AUTHORITY-BINDING-CONTRACT', 'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'Define one versioned Canvas semantic authority and one dbt graph projection contract.', 'The cross-boundary authority or projection wire contract changes.', 'CanvasAuthoringAuthorityBinding', 'proposed'),
  ('RESP-DBT-PROJECT-GRAPH-QUERY', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'Authorize and orchestrate one ProjectDbtGraphFromFiles query.', 'The query policy, read-model orchestration, or failure mapping changes.', 'DbtProjectGraphProjection', 'proposed'),
  ('RESP-DBT-CLI-PROJECT-ANALYZER', 'SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'Execute isolated dbt analysis and normalize one fresh manifest.', 'The supported dbt CLI, manifest version, process isolation, or normalization changes.', 'IDbtProjectAnalyzerPort', 'proposed'),
  ('RESP-WEB-DBT-FILE-PROJECTION', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'Render file-authoritative dbt resources without merging graph-draft semantics.', 'The read-only Canvas projection or route-local layout mapping changes.', 'DbtProjectGraphProjection', 'proposed')
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
values
  ('REL-DBT-PROJECT-GRAPH-USES-AUTHORITY-CONTRACT', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'depends_on', 'outbound', 'sync', 'A project root is analyzed without an explicit file-backed authority binding.', 'tenant/project/environment workspace scope', jsonb_build_array('docs/adr/ADR-0060-dbt-project-authoring-authority.md'), 'proposed'),
  ('REL-DBT-PROJECT-GRAPH-USES-ANALYZER', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'calls', 'outbound', 'async', 'Analyzer unavailable or invalid returns an explicit non-fresh read state.', 'tenant/project/environment workspace scope', jsonb_build_array('apps/api/src/application/ports/dbtProjectAnalysis.ts'), 'proposed'),
  ('REL-WEB-DBT-FILE-PROJECTION-QUERIES-API', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'calls', 'outbound', 'async', 'Canvas shows diagnostics and does not fall back to graph-draft semantics.', 'workspace:graph-draft:view', jsonb_build_array('apps/web/src/app/ports/dbtProjectGraph.ts'), 'proposed'),
  ('REL-WEB-DBT-FILE-PROJECTION-USES-CONTRACT', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'depends_on', 'outbound', 'sync', 'Browser invents a parallel projection shape or authority vocabulary.', 'tenant/project/environment workspace scope', jsonb_build_array('packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts'), 'proposed')
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
  ('TEST-CANVAS-AUTHORITY-BINDING-CONTRACT', 'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'packages/@dvt/contracts/test/dbt-project-file-projection.contract.test.ts', 'contract', 'negative', true, 'pnpm --filter @dvt/contracts test -- CanvasAuthoringAuthorityBinding DbtProjectGraphProjection'),
  ('TEST-DBT-CLI-PROJECT-ANALYZER', 'SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts', 'unit', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts'),
  ('TEST-DBT-PROJECT-GRAPH-QUERY', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts', 'unit', 'behavior', true, 'pnpm --filter dvt-api exec vitest run test/application/projectDbtGraphFromFilesUseCase.test.ts test/entrypoints/http/dbtProjectGraphRoutes.test.ts'),
  ('TEST-WEB-DBT-FILE-PROJECTION', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtProjectFileProjection.test.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
