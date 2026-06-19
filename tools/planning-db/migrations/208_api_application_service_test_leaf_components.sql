-- Split the broad API application-service test evidence component into
-- responsibility-owned leaves. These files are active validation assets; no
-- application-service test file is deprecated in this slice.

drop table if exists pg_temp.api_application_service_test_leaf_map;

create temporary table api_application_service_test_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null,
  target_components text[] not null
);

insert into api_application_service_test_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix,
  target_components
)
values
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-AUTHORIZATION',
    'API application authorization service tests',
    'ApiApplicationAuthorizationTestEvidence',
    'ValidateApiApplicationAuthorizationEvidence;AuthorizeCommandScope',
    'Owns authorization and access-decision test evidence for API application services and ports.',
    'Validate command-scope authorization and protected runtime access decisions before application services are exposed through route adapters.',
    'Command scope vocabulary, protected runtime access policy, authorization negative path, or access decision port test changes.',
    'Authorization test files must resolve to this leaf instead of the broad API application-service test component.',
    'apps/api/test/application/services/authorizeCommandScopeService.test.ts',
    'API application authorization test evidence boundary.',
    'test_only_confidence',
    array['AuthorizeCommandScope test evidence', 'Protected runtime access decision architecture evidence']::text[],
    array[
      'apps/api/test/application/ports/accessDecision.test.ts',
      'apps/api/test/application/services/authorizeCommandScopeService.test.ts',
      'apps/api/test/application/services/protectedSecurityAccessDecision.architecture.test.ts'
    ]::text[],
    array[
      'apps/api/test/application/ports/accessDecision.test.ts',
      'apps/api/test/application/services/authorizeCommandScopeService.test.ts',
      'apps/api/test/application/services/protectedSecurityAccessDecision.architecture.test.ts'
    ]::text[],
    'architecture',
    'negative',
    'pnpm --filter dvt-api test -- apps/api/test/application/ports/accessDecision.test.ts apps/api/test/application/services/authorizeCommandScopeService.test.ts apps/api/test/application/services/protectedSecurityAccessDecision.architecture.test.ts',
    'ValidateApiApplicationAuthorizationEvidence',
    array['unknown command scope', 'missing access decision', 'unauthorized protected runtime tenant']::text[],
    82,
    'critical',
    'AUTHORIZATION',
    array['SYS-API-APPLICATION-SERVICES-AUTHORIZATION', 'SYS-API-APPLICATION-PORTS']::text[]
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-RUN-LIFECYCLE',
    'API application run lifecycle service tests',
    'ApiRunLifecycleTestEvidence',
    'ValidateApiRunLifecycleEvidence;CancelRun;SignalRun;RecoverRun;GetRunStatus;GetRunEvents;ListRuns',
    'Owns run lifecycle command and query use-case test evidence.',
    'Validate run cancellation, recovery, signaling, status, events, and listing semantics independently from HTTP adapters.',
    'Run lifecycle use case, run read model, run command rejection, or run lifecycle test harness changes.',
    'Run lifecycle tests must resolve to this leaf and guard the matching API application-service leaf.',
    'apps/api/test/application/services/getRunStatusUseCase.test.ts',
    'API run lifecycle test evidence boundary.',
    'test_only_confidence',
    array['CancelRun tests', 'SignalRun tests', 'RecoverRun tests', 'GetRunStatus tests', 'GetRunEvents tests', 'ListRuns tests']::text[],
    array[
      'apps/api/test/application/services/cancelRunUseCase.test.ts',
      'apps/api/test/application/services/getRunEventsUseCase.test.ts',
      'apps/api/test/application/services/getRunStatusUseCase.test.ts',
      'apps/api/test/application/services/listRunsUseCase.test.ts',
      'apps/api/test/application/services/recoverRunUseCase.test.ts',
      'apps/api/test/application/services/signalRunUseCase.test.ts'
    ]::text[],
    array[
      'apps/api/test/application/services/cancelRunUseCase.test.ts',
      'apps/api/test/application/services/getRunEventsUseCase.test.ts',
      'apps/api/test/application/services/getRunStatusUseCase.test.ts',
      'apps/api/test/application/services/listRunsUseCase.test.ts',
      'apps/api/test/application/services/recoverRunUseCase.test.ts',
      'apps/api/test/application/services/signalRunUseCase.test.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/cancelRunUseCase.test.ts apps/api/test/application/services/getRunEventsUseCase.test.ts apps/api/test/application/services/getRunStatusUseCase.test.ts apps/api/test/application/services/listRunsUseCase.test.ts apps/api/test/application/services/recoverRunUseCase.test.ts apps/api/test/application/services/signalRunUseCase.test.ts',
    'ValidateApiRunLifecycleEvidence',
    array['missing run', 'invalid lifecycle command', 'unauthorized run read']::text[],
    84,
    'critical',
    'RUN-LIFECYCLE',
    array['SYS-API-APPLICATION-SERVICES-RUN-LIFECYCLE']::text[]
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'API application start-run admission service tests',
    'ApiStartRunAdmissionTestEvidence',
    'ValidateApiStartRunAdmissionEvidence;StartRun;AdmitStartRun;ResolveExecutableSubgraph;BindDbtRunExecutionContext',
    'Owns start-run admission, capacity, duplicate-probe, executable-subgraph, engine bridge, and facade test evidence.',
    'Validate admission and dispatch decisions for start-run before protected runtime routes reach planner, engine, and target adapter boundaries.',
    'Backpressure, duplicate run probing, capacity, dbt execution context binding, executable subgraph resolution, start-run facade, engine pass-through, or target adapter registry test changes.',
    'Start-run admission test files must resolve to this leaf and guard the matching API application-service leaf.',
    'apps/api/test/application/services/startRunAuthorizedFacade.auth.test.ts',
    'API start-run admission test evidence boundary.',
    'responsibility_overload',
    array['StartRun admission tests', 'Backpressure tests', 'Executable subgraph tests', 'Target adapter registry tests']::text[],
    array[
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.admissionModes.test.ts',
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.duplicateFlow.test.ts',
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacityReadyzBinding.test.ts',
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts',
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.test.support.ts',
      'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.test.ts',
      'apps/api/test/application/services/defaultStartRunExecutionCapacityPort.test.ts',
      'apps/api/test/application/services/engineStartRunUseCase.commandPath.test.ts',
      'apps/api/test/application/services/engineStartRunUseCase.errorMapping.test.ts',
      'apps/api/test/application/services/engineStartRunUseCase.test.support.ts',
      'apps/api/test/application/services/executableSubgraphResolutionArchitecture.support.ts',
      'apps/api/test/application/services/executableSubgraphResolutionComponent.architecture.test.ts',
      'apps/api/test/application/services/NoopAdmissionTelemetry.test.ts',
      'apps/api/test/application/services/NoopDuplicateRunProbe.test.ts',
      'apps/api/test/application/services/PlannerBackedStartRunUseCase.test.ts',
      'apps/api/test/application/services/resolveAuthorizedExecutableSubgraph.test.ts',
      'apps/api/test/application/services/startRunAdmissionDecisions.test.ts',
      'apps/api/test/application/services/startRunAdmissionTelemetry.architecture.test.ts',
      'apps/api/test/application/services/startRunApplicationComponent.architecture.test.ts',
      'apps/api/test/application/services/startRunAuthorizedFacade.auth.test.ts',
      'apps/api/test/application/services/startRunAuthorizedFacade.enginePassThrough.test.ts',
      'apps/api/test/application/services/startRunAuthorizedFacade.test.support.ts',
      'apps/api/test/application/services/startRunExecutionCapacityAdmission.architecture.test.ts',
      'apps/api/test/application/services/startRunTargetAdapterRegistry.test.ts'
    ]::text[],
    array[
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.admissionModes.test.ts',
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.duplicateFlow.test.ts',
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacityReadyzBinding.test.ts',
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts',
      'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.test.ts',
      'apps/api/test/application/services/defaultStartRunExecutionCapacityPort.test.ts',
      'apps/api/test/application/services/engineStartRunUseCase.commandPath.test.ts',
      'apps/api/test/application/services/engineStartRunUseCase.errorMapping.test.ts',
      'apps/api/test/application/services/executableSubgraphResolutionComponent.architecture.test.ts',
      'apps/api/test/application/services/NoopAdmissionTelemetry.test.ts',
      'apps/api/test/application/services/NoopDuplicateRunProbe.test.ts',
      'apps/api/test/application/services/PlannerBackedStartRunUseCase.test.ts',
      'apps/api/test/application/services/resolveAuthorizedExecutableSubgraph.test.ts',
      'apps/api/test/application/services/startRunAdmissionDecisions.test.ts',
      'apps/api/test/application/services/startRunAdmissionTelemetry.architecture.test.ts',
      'apps/api/test/application/services/startRunApplicationComponent.architecture.test.ts',
      'apps/api/test/application/services/startRunAuthorizedFacade.auth.test.ts',
      'apps/api/test/application/services/startRunAuthorizedFacade.enginePassThrough.test.ts',
      'apps/api/test/application/services/startRunExecutionCapacityAdmission.architecture.test.ts',
      'apps/api/test/application/services/startRunTargetAdapterRegistry.test.ts'
    ]::text[],
    'architecture',
    'flow',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/startRunAuthorizedFacade.auth.test.ts apps/api/test/application/services/BackpressureAwareStartRunUseCase.admissionModes.test.ts apps/api/test/application/services/BackpressureAwareStartRunUseCase.duplicateFlow.test.ts apps/api/test/application/services/engineStartRunUseCase.commandPath.test.ts apps/api/test/application/services/resolveAuthorizedExecutableSubgraph.test.ts apps/api/test/application/services/startRunTargetAdapterRegistry.test.ts',
    'ValidateApiStartRunAdmissionEvidence',
    array['duplicate run', 'capacity unavailable', 'unauthorized executable subgraph', 'invalid target adapter']::text[],
    86,
    'critical',
    'START-RUN-ADMISSION',
    array['SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION']::text[]
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-PLAN-COMMANDS',
    'API application plan command service tests',
    'ApiPlanCommandTestEvidence',
    'ValidateApiPlanCommandEvidence;CompilePlan;ImportPlan;PreviewPlan;ResolvePlannerInputEnvelope',
    'Owns compile-plan use case and plan route policy catalog test evidence.',
    'Validate plan command semantics and policy catalog behavior before HTTP plan command adapters reuse the application services.',
    'Compile plan use case, plan route policy catalog, planner input policy, or plan command evidence changes.',
    'Plan command test files must resolve to this leaf and guard the matching API application-service leaf.',
    'apps/api/test/application/services/CompilePlanUseCase.test.ts',
    'API plan command test evidence boundary.',
    'test_only_confidence',
    array['CompilePlan tests', 'Plan route policy catalog tests']::text[],
    array[
      'apps/api/test/application/services/CompilePlanUseCase.test.ts',
      'apps/api/test/application/services/planRoutePolicyCatalog.test.ts'
    ]::text[],
    array[
      'apps/api/test/application/services/CompilePlanUseCase.test.ts',
      'apps/api/test/application/services/planRoutePolicyCatalog.test.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/CompilePlanUseCase.test.ts apps/api/test/application/services/planRoutePolicyCatalog.test.ts',
    'ValidateApiPlanCommandEvidence',
    array['invalid plan source', 'missing policy catalog entry', 'unauthorized planner input']::text[],
    80,
    'high',
    'PLAN-COMMANDS',
    array['SYS-API-APPLICATION-SERVICES-PLAN-COMMANDS']::text[]
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-WORKSPACE',
    'API application workspace service tests',
    'ApiWorkspaceApplicationTestEvidence',
    'ValidateApiWorkspaceServiceEvidence;GetWorkspaceGraphDraft;SaveWorkspaceGraphDraft',
    'Owns workspace graph draft capability and application component architecture test evidence.',
    'Validate workspace graph draft capability checks and architecture boundaries independently from HTTP workspace adapters.',
    'Workspace graph draft capability, workspace policy, graph draft component architecture, or workspace application evidence changes.',
    'Workspace application-service test files must resolve to this leaf and guard the matching API application-service leaf.',
    'apps/api/test/application/services/workspaceGraphDraftCapabilityPolicy.test.ts',
    'API workspace application-service test evidence boundary.',
    'boundary_drift',
    array['Workspace graph draft capability tests', 'Workspace graph draft application architecture tests']::text[],
    array[
      'apps/api/test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts',
      'apps/api/test/application/services/workspaceGraphDraftApplicationComponent.architecture.test.ts',
      'apps/api/test/application/services/workspaceGraphDraftCapabilityPolicy.test.ts'
    ]::text[],
    array[
      'apps/api/test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts',
      'apps/api/test/application/services/workspaceGraphDraftApplicationComponent.architecture.test.ts',
      'apps/api/test/application/services/workspaceGraphDraftCapabilityPolicy.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts apps/api/test/application/services/workspaceGraphDraftApplicationComponent.architecture.test.ts apps/api/test/application/services/workspaceGraphDraftCapabilityPolicy.test.ts',
    'ValidateApiWorkspaceServiceEvidence',
    array['graph draft capability denied', 'workspace policy mismatch', 'component architecture drift']::text[],
    82,
    'high',
    'WORKSPACE',
    array['SYS-API-APPLICATION-SERVICES-WORKSPACE']::text[]
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'API application warehouse source service tests',
    'ApiWarehouseSourceTestEvidence',
    'ValidateApiWarehouseSourceEvidence;ImportWarehouseSources;SerializeWarehouseSourceYaml',
    'Owns warehouse source YAML and source import service test evidence.',
    'Validate warehouse source YAML document behavior used by protected runtime and canvas source import flows.',
    'Warehouse source YAML parsing, serialization, merge, identity, descriptor, binding, or import evidence changes.',
    'Warehouse source test files must resolve to this leaf and guard the matching API application-service leaf.',
    'apps/api/test/application/services/warehouseSourceYaml.test.ts',
    'API warehouse source test evidence boundary.',
    'data_clump',
    array['Warehouse source YAML tests']::text[],
    array['apps/api/test/application/services/warehouseSourceYaml.test.ts']::text[],
    array['apps/api/test/application/services/warehouseSourceYaml.test.ts']::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/warehouseSourceYaml.test.ts',
    'ValidateApiWarehouseSourceEvidence',
    array['invalid source YAML', 'unsupported merge input', 'warehouse source identity collision']::text[],
    80,
    'high',
    'WAREHOUSE-SOURCES',
    array['SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES']::text[]
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-PROJECTS-COST',
    'API application project and cost service tests',
    'ApiProjectCostTestEvidence',
    'ValidateApiProjectCostEvidence;CreateProject;ListProjects;GetCostAttributionSummary',
    'Owns project and cost-attribution application-service test evidence.',
    'Validate cost attribution summary behavior and keep project/cost evidence out of broad API application test ownership.',
    'Cost attribution read model, project onboarding evidence, or project/cost application-service test changes.',
    'Project/cost test files must resolve to this leaf and guard the matching API application-service leaf.',
    'apps/api/test/application/services/getCostAttributionSummaryUseCase.test.ts',
    'API project and cost test evidence boundary.',
    'test_only_confidence',
    array['GetCostAttributionSummary tests']::text[],
    array['apps/api/test/application/services/getCostAttributionSummaryUseCase.test.ts']::text[],
    array['apps/api/test/application/services/getCostAttributionSummaryUseCase.test.ts']::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/getCostAttributionSummaryUseCase.test.ts',
    'ValidateApiProjectCostEvidence',
    array['missing project', 'unauthorized cost summary', 'empty attribution source']::text[],
    76,
    'high',
    'PROJECTS-COST',
    array['SYS-API-APPLICATION-SERVICES-PROJECTS-COST']::text[]
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-PLANSTORE',
    'API application PlanStore service tests',
    'ApiPlanStoreApplicationTestEvidence',
    'ValidateApiPlanStoreApplicationEvidence;ResolveStoredExecutablePlan;ValidateStoredPlanExecutability;CreateWorkflowEngineForStoredPlan',
    'Owns API-side PlanStore resolver, executability, and workflow engine factory test evidence under the API application test tree.',
    'Validate stored plan resolution, executability cases, and workflow engine factory wiring while relating the evidence back to PlanStore implementation leaves.',
    'Stored executable plan resolver, stored plan executability, registry/fetch/capability cases, workflow engine factory, or PlanStore API evidence changes.',
    'PlanStore API test files under apps/api/test/application must resolve to this evidence leaf and guard the PlanStore API leaves.',
    'apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts',
    'API PlanStore application test evidence boundary.',
    'published_language',
    array['Stored executable plan resolver tests', 'Stored plan executability tests', 'Workflow engine factory tests']::text[],
    array[
      'apps/api/test/application/services/StoredExecutablePlanResolver.test.ts',
      'apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts',
      'apps/api/test/application/services/WorkflowEngineFactory.test.ts',
      'apps/api/test/application/services/storedPlanExecutabilityValidator/capabilities.cases.ts',
      'apps/api/test/application/services/storedPlanExecutabilityValidator/fetchAndAlignment.cases.ts',
      'apps/api/test/application/services/storedPlanExecutabilityValidator/harness.ts',
      'apps/api/test/application/services/storedPlanExecutabilityValidator/registry.cases.ts'
    ]::text[],
    array[
      'apps/api/test/application/services/StoredExecutablePlanResolver.test.ts',
      'apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts',
      'apps/api/test/application/services/WorkflowEngineFactory.test.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/StoredExecutablePlanResolver.test.ts apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts apps/api/test/application/services/WorkflowEngineFactory.test.ts',
    'ValidateApiPlanStoreApplicationEvidence',
    array['missing stored plan', 'capability mismatch', 'registry binding failure', 'workflow engine dependency gap']::text[],
    84,
    'critical',
    'PLANSTORE',
    array[
      'SYS-PLANSTORE-API-STORED-PLAN-RESOLUTION',
      'SYS-PLANSTORE-API-EXECUTABILITY-VALIDATION',
      'SYS-PLANSTORE-API-WORKFLOW-ENGINE-FACTORY'
    ]::text[]
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-ARCHITECTURE-HARNESS',
    'API application service architecture test harness',
    'ApiApplicationArchitectureHarnessEvidence',
    'ValidateApiApplicationArchitectureHarness;ValidateComponentIntegrity',
    'Owns shared AST artifacts and support helpers used by API application-service architecture tests.',
    'Keep architecture-test support assets explicit so component profiles can distinguish harness files from product use-case evidence.',
    'Application architecture AST support, artifact helper, or architecture test harness changes.',
    'Shared architecture harness files must resolve to this leaf and not hide inside broad application-service test ownership.',
    'apps/api/test/application/services/applicationArchitectureAst.support.ts',
    'API application-service architecture harness evidence boundary.',
    'test_only_confidence',
    array['Application architecture AST support', 'Application architecture artifact helpers']::text[],
    array[
      'apps/api/test/application/services/applicationArchitectureAst.artifacts.ts',
      'apps/api/test/application/services/applicationArchitectureAst.support.ts'
    ]::text[],
    array[
      'apps/api/test/application/services/startRunApplicationComponent.architecture.test.ts',
      'apps/api/test/application/services/workspaceGraphDraftApplicationComponent.architecture.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter dvt-api test -- apps/api/test/application/services/startRunApplicationComponent.architecture.test.ts apps/api/test/application/services/workspaceGraphDraftApplicationComponent.architecture.test.ts',
    'ValidateApiApplicationArchitectureHarness',
    array['missing AST support import', 'architecture helper drift', 'component profile evidence gap']::text[],
    74,
    'high',
    'ARCHITECTURE-HARNESS',
    array[
      'SYS-API-APPLICATION-SERVICES',
      'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
      'SYS-API-APPLICATION-SERVICES-WORKSPACE'
    ]::text[]
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
  'PLANNING-DB-API-APPLICATION-SERVICE-TEST-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'API application service test evidence leaf mapping',
  'Architecture / Planning DB / API Tests',
  'review',
  'SYS-API-TESTS-APPLICATION-SERVICES owned 49 active API application test files directly after the API application service implementation leaves were split. The files are functional evidence, not obsolete paths. This migration turns the existing application-service test component into an aggregate and maps each current test or support file to a responsibility-owned evidence leaf with guards relations to the implementation components it validates.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ValidateApiApplicationServices',
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
  'PLANNING-DB-API-APPLICATION-SERVICE-TEST-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-API-TESTS-APPLICATION-SERVICES'::text, 'may_update'::text
  union all
  select 'component', 'SYS-API-APPLICATION-SERVICES', 'may_reference'
  union all
  select 'path', 'apps/api/test/application/**', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from api_application_service_test_leaf_map
  union all
  select 'component', target_component, 'may_reference'
  from api_application_service_test_leaf_map
  cross join lateral unnest(target_components) as target(target_component)
  union all
  select 'path', pattern, 'may_update'
  from api_application_service_test_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'ValidateApiApplicationServices;ReadComponentProfile;ValidateComponentIntegrity',
  fowler_signals = jsonb_build_array('responsibility_overload', 'test_evidence_boundary', 'component_split'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'ValidateApiApplicationServices;ReadComponentProfile;ValidateComponentIntegrity',
    'reconciledBy',
    '208_api_application_service_test_leaf_components',
    'ownedConcern',
    'Owns the aggregate API application-service test evidence boundary; concrete files resolve to responsibility-owned child evidence components.'
  )
where component.component_id = 'SYS-API-TESTS-APPLICATION-SERVICES';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/208_api_application_service_test_leaf_components.sql',
  source_content_sha256 = md5('SYS-API-TESTS-APPLICATION-SERVICES:208')
    || md5('api-application-service-tests-parent:208'),
  children_required = true,
  owned_concern = 'Owns the aggregate API application-service test evidence boundary; concrete files resolve to responsibility-owned child evidence components.',
  ddd_owner = 'ApiApplicationServiceTestEvidenceCatalog',
  cq_rails = 'ValidateApiApplicationServices;ReadComponentProfile;ValidateComponentIntegrity'
where component_id = 'SYS-API-TESTS-APPLICATION-SERVICES';

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
  'tools/planning-db/migrations/208_api_application_service_test_leaf_components.sql',
  md5(component_id || ':208') || md5(repo_path || cq_rails || ':api-application-service-test-leaf'),
  0,
  name,
  'component',
  'SYS-API-TESTS-APPLICATION-SERVICES',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from api_application_service_test_leaf_map
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
from api_application_service_test_leaf_map
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
      'SYS-API-TESTS-APPLICATION-SERVICES',
      'responsibility',
      'Own the aggregate API application-service test evidence boundary and delegate concrete test/support files to responsibility-owned evidence leaves.',
      0
    ),
    (
      'SYS-API-TESTS-APPLICATION-SERVICES',
      'reason_to_change',
      'API application-service test taxonomy, evidence ownership, implementation guard relation, or component hierarchy changes.',
      0
    ),
    (
      'SYS-API-TESTS-APPLICATION-SERVICES',
      'invariant',
      'The aggregate must own no concrete apps/api/test/application files directly once application-service test leaves are applied.',
      0
    ),
    (
      'SYS-API-TESTS-APPLICATION-SERVICES',
      'non_goal',
      'Do not deprecate active API application-service test files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-API-TESTS-APPLICATION-SERVICES',
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
  from api_application_service_test_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from api_application_service_test_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from api_application_service_test_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-API-TESTS-APPLICATION-SERVICES owns no direct files and the leaf validation command passes.', 0
  from api_application_service_test_leaf_map
  union all
  select component_id, 'consumer', 'API maintainers, Planning DB component-profile readers, component-integrity, and CI changed-slice checks', 0
  from api_application_service_test_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from api_application_service_test_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from api_application_service_test_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from api_application_service_test_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'module',
  layer = 'infra',
  owner = 'ApiApplicationServiceTestEvidenceCatalog',
  repo_path = 'apps/api/test/application',
  public_contract = 'Aggregate API application-service test evidence boundary; concrete test/support files resolve to responsibility-owned child evidence components.',
  runtime = 'node',
  criticality = 'high',
  status = 'review',
  maturity_score = greatest(coalesce(maturity_score, 0), 82),
  parent_component_id = 'SYS-API-TESTS',
  updated_at = now()
where component_id = 'SYS-API-TESTS-APPLICATION-SERVICES';

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
  'module',
  'infra',
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  criticality,
  'review',
  maturity_score,
  'SYS-API-TESTS-APPLICATION-SERVICES'
from api_application_service_test_leaf_map
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
from api_application_service_test_leaf_map
union all
select
  'RESP-SYS-API-TESTS-APPLICATION-SERVICES',
  'SYS-API-TESTS-APPLICATION-SERVICES',
  'Own the aggregate API application-service test evidence boundary and delegate concrete test/support files to evidence leaves.',
  'API application-service test taxonomy, evidence ownership, implementation guard relation, or component hierarchy changes.',
  'ApiApplicationServiceTestEvidenceCatalog',
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
  'CONTRACT-' || component_id || '-EVIDENCE',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from api_application_service_test_leaf_map
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
  'REL-API-TESTS-APPLICATION-SERVICES-CONTAINS-' || relation_suffix,
  'SYS-API-TESTS-APPLICATION-SERVICES',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this API application-service test evidence leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local API test governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from api_application_service_test_leaf_map
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
  'REL-' || component_id || '-GUARDS-' ||
    replace(replace(target_component.target_component_id, 'SYS-', ''), '_', '-'),
  component_id,
  target_component.target_component_id,
  'guards',
  'outbound',
  'build_time',
  'CONTRACT-' || component_id || '-EVIDENCE',
  'Implementation component can drift without this test evidence being visible in the Planning DB component graph.',
  'repo-local API test evidence',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from api_application_service_test_leaf_map
cross join lateral unnest(target_components) as target_component(target_component_id)
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
  'query',
  'inbound',
  'CONTRACT-' || component_id || '-EVIDENCE',
  'CONTRACT-' || component_id || '-EVIDENCE',
  negative_tests,
  'implemented'
from api_application_service_test_leaf_map
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
  'TEST-' || component_id || '-' || test_path.test_order,
  component_id,
  test_path.path,
  test_kind,
  coverage_level,
  true,
  validation_command
from api_application_service_test_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-API-TESTS-APPLICATION-SERVICES-COMPONENT-PROFILE',
  'SYS-API-TESTS-APPLICATION-SERVICES',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-API-TESTS-APPLICATION-SERVICES --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-API-TESTS-APPLICATION-SERVICES --no-refresh --limit 20'
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
  'OBS-' || component_id || '-API-APPLICATION-SERVICE-TEST-EVIDENCE',
  component_id,
  name || ' is observable through component-profile, component-quality, and focused dvt-api test output.',
  'log',
  true,
  'implemented'
from api_application_service_test_leaf_map
union all
select
  'OBS-SYS-API-TESTS-APPLICATION-SERVICES-COMPONENT-QUALITY',
  'SYS-API-TESTS-APPLICATION-SERVICES',
  'API application-service test aggregate health is observable through component-quality and files query output.',
  'log',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.api_application_service_test_leaf_map;
