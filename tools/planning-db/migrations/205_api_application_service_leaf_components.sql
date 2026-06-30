-- Split the active API application-service bucket into responsibility-owned
-- leaves. The services are live runtime application code; no active service
-- file is deprecated in this slice.

drop table if exists pg_temp.api_application_service_leaf_map;

create temporary table api_application_service_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  port_kind text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

insert into api_application_service_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_id,
  test_path,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  port_kind,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values
  (
    'SYS-API-APPLICATION-SERVICES-AUTHORIZATION',
    'API application authorization services',
    'ApiApplicationAuthorizationPolicy',
    'AuthorizeCommandScope;AuthorizeProtectedRuntimeTenant',
    'Owns application-level command scope and protected runtime tenant authorization services.',
    'Authorize API commands and tenant-scoped runtime access before route adapters call use cases.',
    'Command scope vocabulary, tenant authorization, protected runtime security posture, or fail-closed access behavior changes.',
    'apps/api/src/application/services/authorizeCommandScopeService.ts',
    'API application authorization service boundary.',
    'hidden_authority',
    array['AuthorizeCommandScope', 'AuthorizeProtectedRuntimeTenant']::text[],
    array[
      'apps/api/src/application/services/authorizeCommandScopeService.ts',
      'apps/api/src/application/services/protectedRuntimeTenantAuthorizer.ts'
    ]::text[],
    'TEST-SYS-API-APPLICATION-SERVICES-AUTHORIZATION',
    'apps/api/test/application/services/authorizeCommandScopeService.test.ts',
    'unit',
    'negative',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/authorizeCommandScopeService.test.ts apps/api/test/application/services/protectedSecurityAccessDecision.architecture.test.ts',
    'AuthorizeApiApplicationCommand',
    'command',
    array['unknown scope', 'unauthorized tenant', 'missing access decision']::text[],
    82,
    'critical',
    'AUTHORIZATION'
  ),
  (
    'SYS-API-APPLICATION-SERVICES-RUN-LIFECYCLE',
    'API application run lifecycle services',
    'ApiRunLifecycleApplicationService',
    'CancelRun;SignalRun;RecoverRun;GetRunStatus;GetRunEvents;ListRuns',
    'Owns run lifecycle use cases, run read evidence, and run metadata to engine run reference mapping.',
    'Expose run lifecycle command and query use cases to protected runtime HTTP adapters.',
    'Run command use case, run status/events/list read model, recovery, signal, cancellation, or run read evidence changes.',
    'apps/api/src/application/services/getRunStatusUseCase.ts',
    'API run lifecycle application service boundary.',
    'bounded_context',
    array['CancelRun', 'SignalRun', 'RecoverRun', 'GetRunStatus', 'GetRunEvents', 'ListRuns']::text[],
    array[
      'apps/api/src/application/services/cancelRunUseCase.ts',
      'apps/api/src/application/services/getRunEventsUseCase.ts',
      'apps/api/src/application/services/getRunStatusUseCase.ts',
      'apps/api/src/application/services/listRunsUseCase.ts',
      'apps/api/src/application/services/recoverRunUseCase.ts',
      'apps/api/src/application/services/runMetadataToEngineRunRef.ts',
      'apps/api/src/application/services/runReadEvidenceModel.ts',
      'apps/api/src/application/services/signalRunUseCase.ts'
    ]::text[],
    'TEST-SYS-API-APPLICATION-SERVICES-RUN-LIFECYCLE',
    'apps/api/test/application/services/getRunStatusUseCase.test.ts',
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/getRunStatusUseCase.test.ts apps/api/test/application/services/getRunEventsUseCase.test.ts apps/api/test/application/services/listRunsUseCase.test.ts apps/api/test/application/services/cancelRunUseCase.test.ts apps/api/test/application/services/recoverRunUseCase.test.ts apps/api/test/application/services/signalRunUseCase.test.ts',
    'ExecuteApiRunLifecycle',
    'api',
    array['missing run', 'unauthorized run scope', 'invalid command payload']::text[],
    84,
    'critical',
    'RUN-LIFECYCLE'
  ),
  (
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'API application start-run admission services',
    'ApiStartRunAdmissionService',
    'StartRun;AdmitStartRun;ResolveExecutableSubgraph;BindDbtRunExecutionContext',
    'Owns start-run admission, execution capacity, duplicate probing, execution context binding, engine bridge, planner-backed start-run, target adapter registry, SLA timing, and start-run facade services.',
    'Authorize, admit, enrich, and dispatch start-run commands from protected runtime routes into planner and engine boundaries.',
    'Start-run admission, backpressure, duplicate detection, execution-context binding, engine bridge, adapter target registry, SLA telemetry, or facade behavior changes.',
    'apps/api/src/application/services/startRunAuthorizedFacade.ts',
    'API start-run admission and dispatch service boundary.',
    'responsibility_overload',
    array['StartRun', 'AdmitStartRun', 'ResolveExecutableSubgraph', 'BindDbtRunExecutionContext']::text[],
    array[
      'apps/api/src/application/services/BackpressureAwareStartRunUseCase.ts',
      'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts',
      'apps/api/src/application/services/defaultStartRunExecutionCapacityPort.ts',
      'apps/api/src/application/services/engineStartRunUseCase.ts',
      'apps/api/src/application/services/NoopAdmissionTelemetry.ts',
      'apps/api/src/application/services/NoopDuplicateRunProbe.ts',
      'apps/api/src/application/services/notImplementedStartRunUseCase.ts',
      'apps/api/src/application/services/PlannerBackedStartRunUseCase.ts',
      'apps/api/src/application/services/plannerExecutionPlanBridge.ts',
      'apps/api/src/application/services/resolveAuthorizedExecutableSubgraph.ts',
      'apps/api/src/application/services/slaTiming.ts',
      'apps/api/src/application/services/startRunAdmissionDecisions.ts',
      'apps/api/src/application/services/startRunAuthorizedFacade.ts',
      'apps/api/src/application/services/startRunEngineBridge.ts',
      'apps/api/src/application/services/startRunTargetAdapterRegistry.ts',
      'apps/api/src/application/services/storedExecutablePlan.ts'
    ]::text[],
    'TEST-SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'apps/api/test/application/services/startRunAuthorizedFacade.auth.test.ts',
    'unit',
    'flow',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/startRunAuthorizedFacade.auth.test.ts apps/api/test/application/services/BackpressureAwareStartRunUseCase.admissionModes.test.ts apps/api/test/application/services/BackpressureAwareStartRunUseCase.duplicateFlow.test.ts apps/api/test/application/services/engineStartRunUseCase.commandPath.test.ts apps/api/test/application/services/resolveAuthorizedExecutableSubgraph.test.ts apps/api/test/application/services/startRunTargetAdapterRegistry.test.ts',
    'ExecuteApiStartRunAdmission',
    'command',
    array['duplicate run', 'capacity unavailable', 'unauthorized executable subgraph', 'invalid target adapter']::text[],
    86,
    'critical',
    'START-RUN-ADMISSION'
  ),
  (
    'SYS-API-APPLICATION-SERVICES-PLAN-COMMANDS',
    'API application plan command services',
    'ApiPlanCommandApplicationService',
    'CompilePlan;ImportPlan;PreviewPlan;ResolvePlannerInputEnvelope',
    'Owns compile, import, preview, and planner input envelope resolution services for plan-command HTTP adapters.',
    'Validate and translate plan command intent into planner-ready input envelopes and use-case results.',
    'Plan compile/import/preview use cases, route policy catalog, planner input envelope authorization, or canonical planner envelope changes.',
    'apps/api/src/application/services/PreviewPlanUseCase.ts',
    'API plan command application service boundary.',
    'anemic_domain',
    array['CompilePlan', 'ImportPlan', 'PreviewPlan', 'ResolvePlannerInputEnvelope']::text[],
    array[
      'apps/api/src/application/services/CompilePlanUseCase.ts',
      'apps/api/src/application/services/ImportPlanUseCase.ts',
      'apps/api/src/application/services/planRoutePolicyCatalog.ts',
      'apps/api/src/application/services/PreviewPlanUseCase.ts',
      'apps/api/src/application/services/resolveAuthorizedPlannerInputEnvelope.ts',
      'apps/api/src/application/services/resolveCanonicalPlannerInputEnvelope.ts'
    ]::text[],
    'TEST-SYS-API-APPLICATION-SERVICES-PLAN-COMMANDS',
    'apps/api/test/application/services/CompilePlanUseCase.test.ts',
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/CompilePlanUseCase.test.ts apps/api/test/application/services/planRoutePolicyCatalog.test.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts',
    'ExecuteApiPlanCommand',
    'command',
    array['invalid plan source', 'unauthorized planner input', 'malformed preview policy']::text[],
    80,
    'high',
    'PLAN-COMMANDS'
  ),
  (
    'SYS-API-APPLICATION-SERVICES-WORKSPACE',
    'API application workspace services',
    'ApiWorkspaceApplicationService',
    'GetWorkspaceGraphDraft;SaveWorkspaceGraphDraft;ListWorkspaceFiles;GetWorkspaceFileContent;SaveWorkspaceFileContent;ListWorkspaceFileHistory;ListWorkspaceDiffChanges;ListWorkspacePlugins',
    'Owns workspace graph draft, workspace file content/history/diff, workspace plugin catalog, and graph draft capability policy services.',
    'Read and mutate workspace-oriented application state behind protected runtime route adapters.',
    'Workspace graph draft capability, graph draft persistence, file content, file history, diff change, or plugin catalog use-case changes.',
    'apps/api/src/application/services/getWorkspaceGraphDraftUseCase.ts',
    'API workspace application service boundary.',
    'bounded_context',
    array['GetWorkspaceGraphDraft', 'SaveWorkspaceGraphDraft', 'ListWorkspaceFiles', 'GetWorkspaceFileContent', 'SaveWorkspaceFileContent', 'ListWorkspaceFileHistory', 'ListWorkspaceDiffChanges', 'ListWorkspacePlugins']::text[],
    array[
      'apps/api/src/application/services/authorizeWorkspaceGraphDraftCapabilityService.ts',
      'apps/api/src/application/services/getWorkspaceFileContentUseCase.ts',
      'apps/api/src/application/services/getWorkspaceGraphDraftUseCase.ts',
      'apps/api/src/application/services/listWorkspaceDiffChangesUseCase.ts',
      'apps/api/src/application/services/listWorkspaceFileHistoryUseCase.ts',
      'apps/api/src/application/services/listWorkspaceFilesUseCase.ts',
      'apps/api/src/application/services/listWorkspacePluginsUseCase.ts',
      'apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts',
      'apps/api/src/application/services/saveWorkspaceGraphDraftUseCase.ts',
      'apps/api/src/application/services/workspaceGraphDraftCapabilityPolicy.ts'
    ]::text[],
    'TEST-SYS-API-APPLICATION-SERVICES-WORKSPACE',
    'apps/api/test/application/services/workspaceGraphDraftCapabilityPolicy.test.ts',
    'unit',
    'boundary',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts apps/api/test/application/services/workspaceGraphDraftCapabilityPolicy.test.ts apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts apps/api/test/architecture/workspaceFileHistoryQueryRail.architecture.test.ts apps/api/test/architecture/workspaceDiffChangesQueryRail.architecture.test.ts',
    'ExecuteApiWorkspaceUseCases',
    'api',
    array['graph draft capability denied', 'missing workspace file', 'unauthorized workspace read']::text[],
    82,
    'high',
    'WORKSPACE'
  ),
  (
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'API application warehouse source services',
    'ApiWarehouseSourceApplicationService',
    'CreateWarehouseConnection;ListWarehouseConnections;ListWarehouseConnectionTables;TestWarehouseConnection;ImportWarehouseSources;SerializeWarehouseSourceYaml',
    'Owns warehouse connection use cases, warehouse source import, and source YAML parsing, identity, merge, descriptor, binding, and serializer utilities.',
    'Coordinate warehouse source import and source YAML document semantics for protected runtime adapters and canvas source import flows.',
    'Warehouse connection lifecycle, source import behavior, warehouse table listing, test connection, or warehouse source YAML representation changes.',
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'API warehouse source application service boundary.',
    'data_clump',
    array['CreateWarehouseConnection', 'ListWarehouseConnections', 'ListWarehouseConnectionTables', 'TestWarehouseConnection', 'ImportWarehouseSources']::text[],
    array[
      'apps/api/src/application/services/createWarehouseConnectionUseCase.ts',
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
      'apps/api/src/application/services/listWarehouseConnectionsUseCase.ts',
      'apps/api/src/application/services/listWarehouseConnectionTablesUseCase.ts',
      'apps/api/src/application/services/testWarehouseConnectionUseCase.ts',
      'apps/api/src/application/services/warehouseSourceYaml.ts',
      'apps/api/src/application/services/warehouseSourceYamlBindings.ts',
      'apps/api/src/application/services/warehouseSourceYamlDescriptor.ts',
      'apps/api/src/application/services/warehouseSourceYamlDocument.ts',
      'apps/api/src/application/services/warehouseSourceYamlIdentity.ts',
      'apps/api/src/application/services/warehouseSourceYamlMerge.ts',
      'apps/api/src/application/services/warehouseSourceYamlSerializer.ts',
      'apps/api/src/application/services/warehouseSourceYamlTypes.ts'
    ]::text[],
    'TEST-SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'apps/api/test/application/services/warehouseSourceYaml.test.ts',
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/warehouseSourceYaml.test.ts apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'ExecuteApiWarehouseSourceUseCases',
    'api',
    array['invalid warehouse connection', 'unsupported source YAML', 'unauthorized source import']::text[],
    80,
    'high',
    'WAREHOUSE-SOURCES'
  ),
  (
    'SYS-API-APPLICATION-SERVICES-PROJECTS-COST',
    'API application project and cost services',
    'ApiProjectCostApplicationService',
    'CreateProject;ListProjects;GetCostAttributionSummary',
    'Owns project onboarding use cases and cost attribution summary read use case.',
    'Expose project onboarding and cost-attribution read intent to protected runtime route adapters.',
    'Project onboarding, project listing, or cost attribution summary behavior changes.',
    'apps/api/src/application/services/createProjectUseCase.ts',
    'API project and cost application service boundary.',
    'bounded_context',
    array['CreateProject', 'ListProjects', 'GetCostAttributionSummary']::text[],
    array[
      'apps/api/src/application/services/createProjectUseCase.ts',
      'apps/api/src/application/services/getCostAttributionSummaryUseCase.ts',
      'apps/api/src/application/services/listProjectsUseCase.ts'
    ]::text[],
    'TEST-SYS-API-APPLICATION-SERVICES-PROJECTS-COST',
    'apps/api/test/application/services/getCostAttributionSummaryUseCase.test.ts',
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/getCostAttributionSummaryUseCase.test.ts apps/api/test/entrypoints/http/projectOnboardingRoutes.test.ts',
    'ExecuteApiProjectCostUseCases',
    'api',
    array['missing project', 'unauthorized cost summary', 'invalid project onboarding input']::text[],
    76,
    'high',
    'PROJECTS-COST'
  );

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
  'PLANNING-DB-API-APPLICATION-SERVICES-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'API application service leaf component mapping',
  'Architecture / Planning DB / API',
  'review',
  'SYS-API-APPLICATION-SERVICES owned 58 active application service files directly. The files are not obsolete; they represent distinct application responsibilities: authorization, run lifecycle, start-run admission, plan commands, workspace operations, warehouse source import/YAML semantics, and project/cost use cases. This migration turns the existing component into an aggregate and maps each live service file to a responsibility-owned child so Planning DB component profiles can answer files, commands, queries, ports, adapters, contracts, tests, docs, relations, Fowler/DDD basis, and maturity without a side inventory.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;AuthorizeCommandScope;StartRun;CancelRun;SignalRun;RecoverRun;GetRunStatus;GetRunEvents;ListRuns;CompilePlan;ImportPlan;PreviewPlan;GetWorkspaceGraphDraft;SaveWorkspaceGraphDraft;ImportWarehouseSources;CreateProject;GetCostAttributionSummary',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select distinct
  'PLANNING-DB-API-APPLICATION-SERVICES-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-API-APPLICATION-SERVICES'::text, 'may_update'::text
  union all
  select 'path', 'apps/api/src/application/services/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from api_application_service_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from api_application_service_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
  union all
  select 'test', test_id, 'may_create' from api_application_service_leaf_map
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'ReadApiApplicationServiceCatalog;ReadComponentProfile;ValidateComponentIntegrity',
  fowler_signals = jsonb_build_array('responsibility_overload', 'bounded_context', 'component_split'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'ReadApiApplicationServiceCatalog;ReadComponentProfile;ValidateComponentIntegrity',
    'reconciledBy',
    '205_api_application_service_leaf_components',
    'ownedConcern',
    'Owns the aggregate API application-services boundary; concrete service files resolve to responsibility-owned child components.'
  )
where component.component_id = 'SYS-API-APPLICATION-SERVICES';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/205_api_application_service_leaf_components.sql',
  source_content_sha256 = md5('SYS-API-APPLICATION-SERVICES:205')
    || md5('api-application-services-parent:205'),
  children_required = true,
  owned_concern = 'Owns the aggregate API application-services boundary; concrete service files resolve to responsibility-owned child components.',
  ddd_owner = 'ApiApplicationServiceCatalog',
  cq_rails = 'ReadApiApplicationServiceCatalog;ReadComponentProfile;ValidateComponentIntegrity'
where component_id = 'SYS-API-APPLICATION-SERVICES';

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
select
  component_id,
  'tools/planning-db/migrations/205_api_application_service_leaf_components.sql',
  md5(component_id || ':205') || md5(repo_path || cq_rails || ':api-application-service-leaf'),
  0,
  name,
  'component',
  'SYS-API-APPLICATION-SERVICES',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from api_application_service_leaf_map
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
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from api_application_service_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  values
    (
      'SYS-API-APPLICATION-SERVICES',
      'responsibility',
      'Own the aggregate API application-services boundary and delegate concrete service ownership to responsibility-owned leaves.',
      0
    ),
    (
      'SYS-API-APPLICATION-SERVICES',
      'reason_to_change',
      'API application-service taxonomy, service ownership, command/query grouping, or API application component hierarchy changes.',
      0
    ),
    (
      'SYS-API-APPLICATION-SERVICES',
      'invariant',
      'The aggregate must own no concrete apps/api/src/application/services files directly once application-service leaves are applied.',
      0
    ),
    (
      'SYS-API-APPLICATION-SERVICES',
      'non_goal',
      'Do not deprecate active API service files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-API-APPLICATION-SERVICES',
      'governance_ref',
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      0
    )
) item(component_id, item_kind, item_value, item_order)
where exists (
  select 1
  from planning_query_store.governance_component_local_definitions local_definition
  where local_definition.component_id = item.component_id
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from api_application_service_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from api_application_service_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Tracked files claimed by this API application-service leaf must resolve here rather than to SYS-API-APPLICATION-SERVICES.',
    0
  from api_application_service_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows SYS-API-APPLICATION-SERVICES owns no direct files and the leaf validation command passes.',
    0
  from api_application_service_leaf_map
  union all
  select component_id, 'consumer', 'Protected runtime route adapters, API runtime composition, component-profile, component-integrity, and governance coverage readers', 0
  from api_application_service_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from api_application_service_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from api_application_service_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from api_application_service_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  repo_path = 'apps/api/src/application/services',
  public_contract = 'Aggregate API application-services boundary; concrete service files resolve to responsibility-owned child components.',
  maturity_score = greatest(coalesce(maturity_score, 0), 82),
  parent_component_id = 'SYS-API-ROOT',
  updated_at = now()
where component_id = 'SYS-API-APPLICATION-SERVICES';

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
  maturity_score,
  parent_component_id
)
select
  component_id,
  name,
  'service',
  'application',
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  criticality,
  'review',
  maturity_score,
  'SYS-API-APPLICATION-SERVICES'
from api_application_service_leaf_map
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
  maturity_score = excluded.maturity_score,
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
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'implemented'
from api_application_service_leaf_map
union all
select
  'RESP-SYS-API-APPLICATION-SERVICES',
  'SYS-API-APPLICATION-SERVICES',
  'Own the aggregate API application-services boundary and delegate concrete service ownership to application-service leaves.',
  'API application-service taxonomy, service ownership, command/query grouping, or API application component hierarchy changes.',
  'ApiApplicationServiceCatalog',
  'implemented'
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-API-APPLICATION-SERVICE',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from api_application_service_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-API-APPLICATION-SERVICES-CONTAINS-' || relation_suffix,
  'SYS-API-APPLICATION-SERVICES',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this API application-service leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local API application governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from api_application_service_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  port_kind,
  'inbound',
  'CONTRACT-' || component_id || '-API-APPLICATION-SERVICE',
  'CONTRACT-' || component_id || '-API-APPLICATION-SERVICE',
  negative_tests,
  'implemented'
from api_application_service_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  true,
  validation_command
from api_application_service_leaf_map
union all
select
  'TEST-SYS-API-APPLICATION-SERVICES-COMPONENT-PROFILE',
  'SYS-API-APPLICATION-SERVICES',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-API-APPLICATION-SERVICES --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-API-APPLICATION-SERVICES --no-refresh --limit 20'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-API-APPLICATION-SERVICE-TESTS',
  component_id,
  name || ' health is observable through focused dvt-api service and architecture tests.',
  'log',
  true,
  'implemented'
from api_application_service_leaf_map
union all
select
  'OBS-SYS-API-APPLICATION-SERVICES-COMPONENT-QUALITY',
  'SYS-API-APPLICATION-SERVICES',
  'API application-services aggregate health is observable through component-quality and files query output.',
  'log',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.api_application_service_leaf_map;
