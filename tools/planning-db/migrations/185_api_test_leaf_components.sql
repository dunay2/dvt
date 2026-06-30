-- Split the aggregate API test component into semantic evidence leaves.
-- These files are active validation assets; no legacy test path is deprecated
-- in this slice.

drop table if exists pg_temp.api_test_leaf_map;

create temporary table api_test_leaf_map (
  component_id text primary key,
  name text not null,
  kind text not null,
  layer text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  transition text not null,
  consumer text not null,
  repo_path text not null,
  criticality text not null,
  maturity_score numeric not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null
);

insert into api_test_leaf_map (
  component_id,
  name,
  kind,
  layer,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  transition,
  consumer,
  repo_path,
  criticality,
  maturity_score,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command,
  port_name
)
values
  (
    'SYS-API-TESTS-APP-ROUTE-SHELL',
    'API app shell and health route tests',
    'module',
    'infra',
    'ApiAppShellTestEvidence',
    'ValidateApiAppShell',
    'Owns API app bootstrap, health/readiness, protected route mounting, server, route, and test TypeScript configuration evidence.',
    'Validate API app composition, operational route registration, and health/readiness behavior without mixing those tests into application-service or integration evidence.',
    'API app bootstrap, health/readiness policy wiring, operational route registration, server startup, or API test config changes.',
    'App shell tests must remain separate from domain use-case tests and from protected runtime integration scenarios.',
    'review -> implemented once SYS-API-TESTS has no direct app, route, server, or test-config files.',
    'API server bootstrap, protected runtime route composition, and operational health checks.',
    'apps/api/test/app',
    'high',
    72,
    'API app shell and health route validation evidence surface.',
    'test_evidence_boundary',
    array['healthReadiness.test', 'protectedRouteMounting.test', 'registerOperationalRoutes.test']::text[],
    array[
      'apps/api/test/app/**',
      'apps/api/test/app.test.ts',
      'apps/api/test/server.test.ts',
      'apps/api/test/routes/**',
      'apps/api/test/tsconfig.json'
    ]::text[],
    array[
      'apps/api/test/app/healthReadiness.test.ts',
      'apps/api/test/app/protectedRouteMounting.test.ts',
      'apps/api/test/routes/registerOperationalRoutes.test.ts',
      'apps/api/test/server.test.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- healthReadiness.test.ts protectedRouteMounting.test.ts registerOperationalRoutes.test.ts server.test.ts',
    'ValidateApiAppShell'
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES',
    'API application service tests',
    'module',
    'application',
    'ApiApplicationServiceTestEvidence',
    'ValidateApiApplicationServices',
    'Owns use-case, command/query service, application-port, admission, authorization, executable plan, and workspace graph application tests.',
    'Validate API application service semantics independently from HTTP adapters, modules, and infrastructure adapters.',
    'Application service command/query semantics, authorization policies, admission behavior, executable plan validation, or application test harness changes.',
    'Application service tests must prove domain/application behavior without becoming route adapter or persistence adapter tests.',
    'review -> implemented once application service tests resolve to this leaf and API test aggregate owns no direct application files.',
    'API application services, ports, and domain-facing use cases.',
    'apps/api/test/application',
    'high',
    78,
    'API application service validation evidence surface.',
    'service_layer_test_boundary',
    array['StartRunUseCase tests', 'WorkspaceGraphDraft tests', 'StoredPlanExecutability tests']::text[],
    array['apps/api/test/application/**']::text[],
    array[
      'apps/api/test/application/ports/accessDecision.test.ts',
      'apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts',
      'apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts',
      'apps/api/test/application/services/startRunApplicationComponent.architecture.test.ts',
      'apps/api/test/application/services/workspaceGraphDraftApplicationComponent.architecture.test.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- application',
    'ValidateApiApplicationServices'
  ),
  (
    'SYS-API-TESTS-ARCHITECTURE-CONTRACTS',
    'API architecture and contract tests',
    'module',
    'infra',
    'ApiArchitectureContractTestEvidence',
    'ValidateApiArchitectureContracts',
    'Owns API architecture guard tests and API contract-specific test evidence outside HTTP adapter tests.',
    'Keep architecture and contract tests visible as governed evidence instead of burying them in the aggregate API test bucket.',
    'API architecture boundary, runtime composition guard, workspace query rail architecture, snapshot fixture contract, or contract test changes.',
    'Architecture tests must remain evidence for boundaries and contracts, not product command/query implementations.',
    'review -> implemented once architecture and contract test files resolve to this leaf.',
    'Architecture reviewers, CI changed-slice checks, and API contract owners.',
    'apps/api/test/architecture',
    'high',
    74,
    'API architecture and contract validation evidence surface.',
    'architecture_fitness_function',
    array['architecture tests', 'adminRebuildSnapshotAccessContract.test']::text[],
    array['apps/api/test/architecture/**', 'apps/api/test/contracts/**']::text[],
    array[
      'apps/api/test/architecture/stateStoreRoleBoundary.architecture.test.ts',
      'apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts',
      'apps/api/test/contracts/adminRebuildSnapshotAccessContract.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter dvt-api test -- architecture contracts',
    'ValidateApiArchitectureContracts'
  ),
  (
    'SYS-API-TESTS-FIXTURES',
    'API test fixtures',
    'module',
    'infra',
    'ApiTestFixtureEvidence',
    'ValidateApiTestFixtures',
    'Owns reusable API test manifests and graph/snapshot fixtures used by integration, route, and architecture tests.',
    'Keep reusable test fixtures declared as evidence support assets instead of treating them as production application components.',
    'Planner manifest fixture, workflow snapshot fixture, workspace graph draft fixture, or shared fixture shape changes.',
    'Fixtures must remain test support assets and must not become runtime authority.',
    'review -> implemented once fixture files resolve to this leaf.',
    'API tests that need stable planner, workflow snapshot, or workspace draft fixtures.',
    'apps/api/test/fixtures',
    'medium',
    66,
    'API test fixture support surface.',
    'test_fixture_boundary',
    array['basic-manifest.json', 'workflowSnapshotFixture', 'workspaceGraphDraftFixture']::text[],
    array['apps/api/test/fixtures/**']::text[],
    array[
      'apps/api/test/fixtures/workflowSnapshotFixture.ts',
      'apps/api/test/fixtures/workspaceGraphDraftFixture.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- workflowSnapshotFixtureSemantics.architecture.test.ts workspaceGraphDraftRoutes.test.ts',
    'ValidateApiTestFixtures'
  ),
  (
    'SYS-API-TESTS-INFRASTRUCTURE',
    'API infrastructure adapter tests',
    'module',
    'infra',
    'ApiInfrastructureAdapterTestEvidence',
    'ValidateApiInfrastructureAdapters',
    'Owns tests for API infrastructure adapters: auth, backpressure, planner artifact resolution, start-run persistence, telemetry, warehouse import, and workspace plugin repositories.',
    'Validate API infrastructure adapters behind ports without mixing their evidence with application services or HTTP route tests.',
    'Infrastructure adapter behavior, telemetry adapter semantics, auth repository doubles, warehouse import repository, or planner artifact resolver changes.',
    'Infrastructure tests must prove adapter behavior behind ports and must not own application command/query semantics.',
    'review -> implemented once infrastructure test files resolve to this leaf.',
    'API infrastructure adapters and port implementations.',
    'apps/api/test/infrastructure',
    'high',
    76,
    'API infrastructure adapter validation evidence surface.',
    'ports_and_adapters_test_boundary',
    array['auth adapter tests', 'backpressure store tests', 'telemetry tests', 'warehouse import tests']::text[],
    array['apps/api/test/infrastructure/**']::text[],
    array[
      'apps/api/test/infrastructure/auth/oidcAuthenticator.test.ts',
      'apps/api/test/infrastructure/backpressure/CircuitBreakingBackpressureStore.test.ts',
      'apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts',
      'apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts',
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts'
    ]::text[],
    'unit',
    'boundary',
    'pnpm --filter dvt-api test -- infrastructure',
    'ValidateApiInfrastructureAdapters'
  ),
  (
    'SYS-API-TESTS-INTEGRATION',
    'API protected runtime integration tests',
    'module',
    'infra',
    'ApiProtectedRuntimeIntegrationEvidence',
    'ValidateApiProtectedRuntimeIntegration',
    'Owns API integration harness, protected runtime scenarios, planner-engine contract integration, auth, persistence, HTTP, runtime, and workspace draft scenario files.',
    'Validate protected runtime flows end to end while keeping integration harness files separate from unit and architecture evidence.',
    'Protected runtime integration harness, selected closure scenarios, planner-engine contract flow, or integration persistence/runtime scenario changes.',
    'Integration tests must exercise end-to-end behavior and must not be used as the only evidence for lower-level components.',
    'review -> implemented once integration files resolve to this leaf.',
    'Protected runtime API integration validation and planner-engine contract checks.',
    'apps/api/test/integration',
    'high',
    78,
    'API protected runtime integration validation surface.',
    'integration_test_boundary',
    array['protectedRuntime.integration.test', 'plannerEngineContract.test']::text[],
    array['apps/api/test/integration/**']::text[],
    array[
      'apps/api/test/integration/plannerEngineContract.test.ts',
      'apps/api/test/integration/protectedRuntime.integration.test.ts'
    ]::text[],
    'integration',
    'behavior',
    'pnpm --filter dvt-api test -- protectedRuntime.integration.test.ts plannerEngineContract.test.ts',
    'ValidateApiProtectedRuntimeIntegration'
  ),
  (
    'SYS-API-TESTS-MODULE-COMPOSITION',
    'API module composition tests',
    'module',
    'infra',
    'ApiModuleCompositionTestEvidence',
    'ValidateApiModuleComposition',
    'Owns API module composition tests, module architecture supports, protected runtime dependency builder cases, provider adapter factory tests, state-store role tests, and module test harnesses.',
    'Validate runtime module assembly and provider adapter composition separately from HTTP and application service evidence.',
    'API module dependency builders, provider adapter composition, operational hook registration, state-store role binding, or module architecture source changes.',
    'Module tests must validate composition and dependency wiring without hiding concrete runtime behavior in module fixtures.',
    'review -> implemented once module test files resolve to this leaf.',
    'API runtime module composition and provider adapter factories.',
    'apps/api/test/modules',
    'high',
    74,
    'API module composition validation surface.',
    'composition_root_test_boundary',
    array['modules.test', 'buildProtectedRuntimeModule cases', 'stateStoreRoles.test']::text[],
    array['apps/api/test/modules/**', 'apps/api/test/modules.test.ts']::text[],
    array[
      'apps/api/test/modules.test.ts',
      'apps/api/test/modules/buildProtectedExecutionCapacityPort.test.ts',
      'apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts',
      'apps/api/test/modules/stateStoreRoles.test.ts'
    ]::text[],
    'unit',
    'boundary',
    'pnpm --filter dvt-api test -- modules.test.ts stateStoreRoles.test.ts createTemporalProviderAdapterFactory.test.ts',
    'ValidateApiModuleComposition'
  ),
  (
    'SYS-API-TESTS-PLUGIN-CONFIG',
    'API plugin tests',
    'module',
    'infra',
    'ApiPluginTestEvidence',
    'ValidateApiPlugins',
    'Owns API plugin tests for environment and observability plugin behavior.',
    'Validate API plugin wiring without mixing plugin evidence into app shell or module composition test components.',
    'API plugin configuration, observability plugin, environment plugin, or plugin test support changes.',
    'Plugin tests must stay focused on plugin behavior and not duplicate module composition evidence.',
    'review -> implemented once plugin test files resolve to this leaf.',
    'API plugin owners and runtime module composition.',
    'apps/api/test/plugins',
    'medium',
    68,
    'API plugin validation evidence surface.',
    'plugin_test_boundary',
    array['env.test', 'observability.test']::text[],
    array['apps/api/test/plugins/**']::text[],
    array[
      'apps/api/test/plugins/env.test.ts',
      'apps/api/test/plugins/observability.test.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- env.test.ts observability.test.ts',
    'ValidateApiPlugins'
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
  'PLANNING-DB-API-TEST-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB API test leaf component mapping',
  'Architecture / API / Planning DB',
  'review',
  'SYS-API-TESTS owned more than one hundred direct files across app shell, application services, architecture contracts, fixtures, infrastructure, integration, module, and plugin evidence. This split keeps tests queryable by responsibility while preserving SYS-API-HTTP-ENTRYPOINT-TESTS as the existing HTTP test component.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ValidateApiTestEvidence',
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
select
  'PLANNING-DB-API-TEST-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text as subject_kind, 'SYS-API-TESTS'::text as subject_id, 'may_update'::text as scope_kind
  union all
  select 'path', 'apps/api/test', 'may_update'
  union all
  select 'component', component_id, 'may_create' from api_test_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from api_test_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
values (
  'SYS-API-TESTS',
  'tools/planning-db/migrations/185_api_test_leaf_components.sql',
  md5('SYS-API-TESTS:185') || md5('api-test-parent:185'),
  0,
  'API app, integration, module, infrastructure, and fixture tests',
  'component',
  'SYS-API-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate API test evidence boundary while concrete non-HTTP test files resolve to semantic evidence leaves.',
  'Architecture / API Tests',
  'ValidateApiBehavior;ValidateApiTestEvidence',
  'codex'
)
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
  'tools/planning-db/migrations/185_api_test_leaf_components.sql',
  md5(component_id || ':185') || md5(name || ':api-test-leaf:185'),
  0,
  name,
  'component',
  'SYS-API-TESTS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from api_test_leaf_map
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
from api_test_leaf_map
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
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from api_test_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from api_test_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from api_test_leaf_map
  union all
  select component_id, 'transition', transition, 0
  from api_test_leaf_map
  union all
  select component_id, 'consumer', consumer, 0
  from api_test_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 0
  from api_test_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 1
  from api_test_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from api_test_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from api_test_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-API-TESTS',
    'responsibility',
    'Own aggregate API validation evidence and delegate non-HTTP test files to semantic leaves.',
    0
  ),
  (
    'SYS-API-TESTS',
    'reason_to_change',
    'API test topology, evidence grouping, or cross-cutting test ownership changes.',
    0
  ),
  (
    'SYS-API-TESTS',
    'invariant',
    'Non-HTTP API test files must be owned by semantic leaves rather than the aggregate test component.',
    0
  ),
  (
    'SYS-API-TESTS',
    'transition',
    'review -> implemented once component-quality shows SYS-API-TESTS owns no direct non-HTTP test files.',
    0
  ),
  (
    'SYS-API-TESTS',
    'consumer',
    'API maintainers, CI changed-slice checks, and component-profile readers.',
    0
  ),
  (
    'SYS-API-TESTS',
    'fowler_signal',
    'responsibility_overload',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'module',
  layer = 'infra',
  owner = 'Architecture / API Tests',
  repo_path = 'apps/api/test',
  public_contract = 'Aggregate API test evidence boundary; non-HTTP concrete test files are owned by semantic evidence leaves.',
  runtime = 'node',
  criticality = 'high',
  status = 'review',
  maturity_score = 72,
  parent_component_id = 'SYS-API-ROOT',
  updated_at = now()
where component_id = 'SYS-API-TESTS';

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
  kind,
  layer,
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  criticality,
  'review',
  maturity_score,
  'SYS-API-TESTS'
from api_test_leaf_map
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
from api_test_leaf_map
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
from api_test_leaf_map
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
  status
)
select
  'REL-API-TESTS-CONTAINS-' ||
    replace(replace(component_id, 'SYS-API-TESTS-', ''), '_', '-'),
  'SYS-API-TESTS',
  component_id,
  'contains',
  'outbound',
  'sync',
  null,
  'not_applicable',
  'implemented'
from api_test_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
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
  'PORT-' || component_id || '-' ||
    upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  'query',
  'inbound',
  'CONTRACT-' || component_id || '-EVIDENCE',
  'CONTRACT-' || component_id || '-EVIDENCE',
  array[
    'missing evidence ownership',
    'misclassified test responsibility',
    'component-profile evidence gap'
  ]::text[],
  'implemented'
from api_test_leaf_map
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
from api_test_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
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
  'OBS-' || component_id || '-TEST-EVIDENCE',
  component_id,
  'API test evidence component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
from api_test_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
