-- Split the active API infrastructure bucket into adapter-owned leaves.
-- These files are live runtime infrastructure adapters; old or nonfunctional
-- files require explicit deprecation evidence before they can be marked
-- deprecated.

drop table if exists pg_temp.api_infrastructure_leaf_map;
drop table if exists pg_temp.api_infrastructure_dependency_map;

create temporary table api_infrastructure_leaf_map (
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
  port_kind text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

create temporary table api_infrastructure_dependency_map (
  source_component_id text not null,
  target_component_id text not null,
  relation_id text primary key,
  contract_id text,
  failure_mode text not null
);

insert into api_infrastructure_leaf_map (
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
  port_kind,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values
  (
    'SYS-API-INFRA-AUTH',
    'API auth infrastructure adapters',
    'ApiAuthInfrastructureAdapter',
    'VerifyAccessToken;ReadWorkspaceContext;ReadProjectOnboarding;EvaluateAccessDecision',
    'Owns OIDC, JWKS, embedded access-decision, workspace-context, and project-onboarding infrastructure adapters.',
    'Adapt authentication, authorization, workspace context, and onboarding facts into API application authorization ports without owning route or domain policy semantics.',
    'OIDC/JWKS verification, embedded access decision, workspace context, onboarding repository, or protected runtime auth adapter changes.',
    'Auth infrastructure must stay an adapter over authorization ports; it must not create a second command-scope policy or grant access outside the application authorization service.',
    'apps/api/src/infrastructure/auth/oidcAuthenticator.ts',
    'API auth infrastructure adapter contract.',
    'anti_corruption_layer',
    array['OidcAuthenticator', 'JwksJwtVerifier', 'EmbeddedAccessDecisionService', 'EmbeddedWorkspaceContextQuery', 'EmbeddedProjectOnboardingRepository']::text[],
    array[
      'apps/api/src/infrastructure/auth/embeddedAccessDecisionService.ts',
      'apps/api/src/infrastructure/auth/embeddedProjectOnboardingRepository.ts',
      'apps/api/src/infrastructure/auth/embeddedWorkspaceContextQuery.ts',
      'apps/api/src/infrastructure/auth/jwksJwtVerifier.ts',
      'apps/api/src/infrastructure/auth/oidcAuthenticator.ts'
    ]::text[],
    array[
      'apps/api/test/infrastructure/auth/embeddedAccessDecisionService.test.ts',
      'apps/api/test/infrastructure/auth/embeddedProjectOnboardingRepository.test.ts',
      'apps/api/test/infrastructure/auth/embeddedWorkspaceContextQuery.test.ts',
      'apps/api/test/infrastructure/auth/oidcAuthenticator.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter dvt-api test -- apps/api/test/infrastructure/auth/oidcAuthenticator.test.ts apps/api/test/infrastructure/auth/embeddedAccessDecisionService.test.ts apps/api/test/infrastructure/auth/embeddedWorkspaceContextQuery.test.ts apps/api/test/infrastructure/auth/embeddedProjectOnboardingRepository.test.ts',
    'VerifyAccessToken',
    'query',
    array['invalid token', 'missing project context', 'denied embedded decision']::text[],
    84,
    'critical',
    'AUTH'
  ),
  (
    'SYS-API-INFRA-BACKPRESSURE',
    'API backpressure and admission telemetry adapters',
    'ApiBackpressureInfrastructureAdapter',
    'ReadBackpressureCapacity;WriteBackpressureCapacity;EmitAdmissionTelemetry',
    'Owns backpressure stores, fallback/circuit/cache wrappers, metrics-emitting adapter, admission telemetry metrics, and safe warning behavior.',
    'Persist, read, wrap, and observe backpressure/admission facts behind start-run admission ports without deciding business admission policy.',
    'Backpressure store, capacity fallback, circuit breaking, metrics emission, admission telemetry, or safe warning behavior changes.',
    'Backpressure infrastructure may report capacity and failures only; admission accept/reject policy remains in the start-run admission application service.',
    'apps/api/src/infrastructure/backpressure/RawSqlBackpressureStore.ts',
    'API backpressure infrastructure adapter contract.',
    'hidden_authority',
    array['RawSqlBackpressureStore', 'CachedBackpressureStore', 'CircuitBreakingBackpressureStore', 'FileBackpressureFallbackStore', 'MetricsEmittingBackpressureStore', 'ObservabilityAdmissionTelemetry']::text[],
    array[
      'apps/api/src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.ts',
      'apps/api/src/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.ts',
      'apps/api/src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.ts',
      'apps/api/src/infrastructure/admissionTelemetry/safeWarn.ts',
      'apps/api/src/infrastructure/backpressure/CachedBackpressureStore.ts',
      'apps/api/src/infrastructure/backpressure/CircuitBreakingBackpressureStore.ts',
      'apps/api/src/infrastructure/backpressure/FileBackpressureFallbackStore.ts',
      'apps/api/src/infrastructure/backpressure/MetricsEmittingBackpressureStore.ts',
      'apps/api/src/infrastructure/backpressure/RawSqlBackpressureStore.ts',
      'apps/api/src/infrastructure/backpressure/types.ts'
    ]::text[],
    array[
      'apps/api/test/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.test.ts',
      'apps/api/test/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.test.ts',
      'apps/api/test/infrastructure/backpressure/CachedBackpressureStore.test.ts',
      'apps/api/test/infrastructure/backpressure/CircuitBreakingBackpressureStore.test.ts',
      'apps/api/test/infrastructure/backpressure/FileBackpressureFallbackStore.test.ts',
      'apps/api/test/infrastructure/backpressure/MetricsEmittingBackpressureStore.test.ts',
      'apps/api/test/infrastructure/backpressure/RawSqlBackpressureStore.test.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/infrastructure/backpressure/RawSqlBackpressureStore.test.ts apps/api/test/infrastructure/backpressure/MetricsEmittingBackpressureStore.test.ts apps/api/test/infrastructure/backpressure/FileBackpressureFallbackStore.test.ts apps/api/test/infrastructure/backpressure/CircuitBreakingBackpressureStore.test.ts apps/api/test/infrastructure/backpressure/CachedBackpressureStore.test.ts apps/api/test/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.test.ts apps/api/test/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.test.ts',
    'ReadBackpressureCapacity',
    'query',
    array['store unavailable', 'circuit open', 'stale fallback', 'metrics emit failure']::text[],
    86,
    'critical',
    'BACKPRESSURE'
  ),
  (
    'SYS-API-INFRA-START-RUN-ADMISSION',
    'API start-run admission infrastructure adapters',
    'ApiStartRunAdmissionInfrastructureAdapter',
    'ProbeDuplicateRun;ReadExecutionCapacity',
    'Owns duplicate-run probing and Temporal worker readyz execution-capacity infrastructure adapters.',
    'Provide duplicate and execution-capacity facts to start-run admission without owning admission policy, route translation, or engine dispatch.',
    'Duplicate probe SQL, worker-readyz capacity evaluation, timeout handling, or start-run admission adapter behavior changes.',
    'Start-run admission adapters must remain read-only fact providers; they must not admit, reject, or dispatch runs directly.',
    'apps/api/src/infrastructure/startRun/PostgresDuplicateRunProbe.ts',
    'API start-run admission infrastructure adapter contract.',
    'gateway',
    array['PostgresDuplicateRunProbe', 'TemporalWorkerReadyzExecutionCapacityPort']::text[],
    array[
      'apps/api/src/infrastructure/executionCapacity/TemporalWorkerReadyzExecutionCapacityPort.ts',
      'apps/api/src/infrastructure/startRun/PostgresDuplicateRunProbe.ts'
    ]::text[],
    array[
      'apps/api/test/infrastructure/executionCapacity/TemporalWorkerReadyzExecutionCapacityPort.test.ts',
      'apps/api/test/infrastructure/startRun/PostgresDuplicateRunProbe.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter dvt-api test -- apps/api/test/infrastructure/startRun/PostgresDuplicateRunProbe.test.ts apps/api/test/infrastructure/executionCapacity/TemporalWorkerReadyzExecutionCapacityPort.test.ts',
    'ProbeDuplicateRun',
    'query',
    array['duplicate run found', 'capacity endpoint unavailable', 'worker not ready']::text[],
    82,
    'critical',
    'START-RUN-ADMISSION'
  ),
  (
    'SYS-API-INFRA-RUNTIME-TELEMETRY',
    'API runtime telemetry adapters',
    'ApiRuntimeTelemetryAdapter',
    'RecordStartRunSla;RecordRunStatusStaleness;RecordWorkspaceGraphDraftTelemetry;ReadRunSnapshotStaleness',
    'Owns runtime telemetry emitters and snapshot-staleness reader adapters for start-run SLA, run status staleness, and workspace graph draft telemetry.',
    'Emit operational telemetry and read snapshot staleness through observability ports without becoming run lifecycle or workspace draft authority.',
    'SLA metric names, staleness reads, workspace draft telemetry, run-status telemetry, or Prometheus semantics changes.',
    'Runtime telemetry adapters must never mutate run, draft, or admission state; they report observations and unavailable telemetry paths only.',
    'apps/api/src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.ts',
    'API runtime telemetry adapter contract.',
    'observability_boundary',
    array['ObservabilityStartRunSlaTelemetry', 'ObservabilityRunStatusStalenessTelemetry', 'ObservabilityWorkspaceGraphDraftTelemetry', 'SafeRunSnapshotStalenessReader', 'START_RUN_SLA_METRICS']::text[],
    array[
      'apps/api/src/infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.ts',
      'apps/api/src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.ts',
      'apps/api/src/infrastructure/telemetry/ObservabilityWorkspaceGraphDraftTelemetry.ts',
      'apps/api/src/infrastructure/telemetry/SafeRunSnapshotStalenessReader.ts',
      'apps/api/src/infrastructure/telemetry/startRunSlaMetrics.ts'
    ]::text[],
    array[
      'apps/api/test/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.test.ts',
      'apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts',
      'apps/api/test/infrastructure/telemetry/SafeRunSnapshotStalenessReader.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter dvt-api test -- apps/api/test/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.test.ts apps/api/test/infrastructure/telemetry/PrometheusSlaSemantics.architecture.test.ts apps/api/test/infrastructure/telemetry/SafeRunSnapshotStalenessReader.test.ts',
    'RecordRuntimeTelemetry',
    'command',
    array['observability unavailable', 'stale snapshot read throws', 'metric cardinality drift']::text[],
    74,
    'high',
    'RUNTIME-TELEMETRY'
  ),
  (
    'SYS-API-INFRA-WORKSPACE-DRAFT',
    'API workspace graph draft persistence adapters',
    'ApiWorkspaceGraphDraftInfrastructureAdapter',
    'ReadWorkspaceGraphDraft;SaveWorkspaceGraphDraft;RecordWorkspaceGraphDraftAudit',
    'Owns Postgres workspace graph draft persistence and structured workspace graph draft audit logging adapters.',
    'Persist workspace graph draft state and audit facts behind tenant/project-scoped workspace draft application ports.',
    'Workspace graph draft persistence, migration, CAS behavior, audit logger, or protected runtime draft composition changes.',
    'Workspace draft infrastructure must remain tenant/project scoped and must not bypass draft capability authorization or CAS semantics.',
    'apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts',
    'API workspace graph draft persistence adapter contract.',
    'repository',
    array['PostgresWorkspaceGraphDraftStore', 'StructuredWorkspaceGraphDraftAuditLogger']::text[],
    array[
      'apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts',
      'apps/api/src/infrastructure/workspaceGraphDraft/StructuredWorkspaceGraphDraftAuditLogger.ts'
    ]::text[],
    array[
      'apps/api/test/integration/protectedRuntime.integration.test.ts',
      'apps/api/test/modules.test.ts'
    ]::text[],
    'integration',
    'flow',
    'pnpm --filter dvt-api test -- apps/api/test/modules.test.ts apps/api/test/integration/protectedRuntime.integration.test.ts',
    'PersistWorkspaceGraphDraft',
    'command',
    array['cross-project draft read', 'stale revision write', 'audit failure hidden']::text[],
    80,
    'critical',
    'WORKSPACE-DRAFT'
  ),
  (
    'SYS-API-INFRA-WORKSPACE-LOCAL-ADAPTERS',
    'API workspace local file, diff, and plugin adapters',
    'ApiWorkspaceLocalInfrastructureAdapter',
    'ListWorkspaceFiles;ReadWorkspaceFile;WriteWorkspaceFile;ListWorkspaceFileHistory;ListWorkspaceDiffChanges;ListWorkspacePlugins',
    'Owns local workspace file repository, file history repository, diff changes repository, workspace file root resolution, and embedded workspace plugin catalog repository.',
    'Expose workspace-local files, history, diff changes, and plugin catalog facts to protected runtime workspace application services.',
    'Workspace file root, local file repository, file history, diff changes, plugin catalog, or route-group adapter wiring changes.',
    'Workspace local adapters must not grant project access or decide workspace capability; they only provide repository facts to protected application services.',
    'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
    'API workspace local adapter contract.',
    'repository',
    array['LocalWorkspaceFileRepository', 'LocalWorkspaceFileHistoryRepository', 'LocalWorkspaceDiffChangesRepository', 'EmbeddedWorkspacePluginCatalogRepository', 'resolveWorkspaceFilesRoot']::text[],
    array[
      'apps/api/src/infrastructure/workspaceDiffChanges/LocalWorkspaceDiffChangesRepository.ts',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileHistoryRepository.ts',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
      'apps/api/src/infrastructure/workspaceFiles/resolveWorkspaceFilesRoot.ts',
      'apps/api/src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.ts'
    ]::text[],
    array[
      'apps/api/test/architecture/workspaceDiffChangesQueryRail.architecture.test.ts',
      'apps/api/test/architecture/workspaceFileHistoryQueryRail.architecture.test.ts',
      'apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts',
      'apps/api/test/entrypoints/http/workspaceDiffChangesRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceFileHistoryRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts',
      'apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter dvt-api test -- apps/api/test/architecture/workspaceFilesQueryRail.architecture.test.ts apps/api/test/architecture/workspaceFileHistoryQueryRail.architecture.test.ts apps/api/test/architecture/workspaceDiffChangesQueryRail.architecture.test.ts apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts apps/api/test/entrypoints/http/workspaceFileHistoryRoutes.test.ts apps/api/test/entrypoints/http/workspaceDiffChangesRoutes.test.ts apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts apps/api/test/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.test.ts',
    'ReadWorkspaceLocalAdapters',
    'query',
    array['path escapes workspace root', 'missing workspace file', 'diff reads outside project', 'plugin catalog migration failure']::text[],
    82,
    'high',
    'WORKSPACE-LOCAL-ADAPTERS'
  ),
  (
    'SYS-API-INFRA-WAREHOUSE-SOURCES',
    'API warehouse source infrastructure adapters',
    'ApiWarehouseSourceInfrastructureAdapter',
    'ListWarehouseConnections;ListWarehouseConnectionTables;ProbeWarehouseConnection',
    'Owns workspace warehouse connection catalog and warehouse connection probe infrastructure adapters.',
    'Read workspace-backed warehouse connection definitions and probe warehouse connections for source import flows without owning source YAML or HTTP route semantics.',
    'Warehouse connection catalog, warehouse connection probe, source import adapter wiring, or warehouse import fail-closed behavior changes.',
    'Warehouse source infrastructure must not define warehouse import command semantics; application services own import and source YAML behavior.',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
    'API warehouse source infrastructure adapter contract.',
    'gateway',
    array['WorkspaceWarehouseConnectionCatalog', 'WorkspaceWarehouseConnectionProbe']::text[],
    array[
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts'
    ]::text[],
    array[
      'apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts'
    ]::text[],
    'architecture',
    'negative',
    'pnpm --filter dvt-api test -- apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'ReadWarehouseConnectionCatalog',
    'query',
    array['connection not found', 'invalid catalog JSON', 'probe unavailable']::text[],
    82,
    'high',
    'WAREHOUSE-SOURCES'
  ),
  (
    'SYS-API-INFRA-RUNTIME-FOUNDATION',
    'API runtime foundation infrastructure',
    'ApiRuntimeFoundationInfrastructure',
    'OpenRuntimeDatabasePool;LoadRuntimeEnvironment;ConfigureRuntimeLogging;ConfigureRuntimeObservability;RecordStructuredAuditLog',
    'Owns API database pool construction, environment plugin, logger plugin, observability plugin, and structured audit logger foundation.',
    'Configure the runtime foundation used by API app, operational routes, protected runtime composition, and infrastructure adapters.',
    'Database pool configuration, environment loading, logger options, observability construction, or structured audit logging changes.',
    'Runtime foundation code may configure shared infrastructure only; it must not own product commands, workspace semantics, or run lifecycle decisions.',
    'apps/api/src/db/pool.ts',
    'API runtime foundation infrastructure contract.',
    'service_layer',
    array['getPgPool', 'loadEnv', 'buildLoggerOptions', 'buildObservability', 'StructuredAuditLogger']::text[],
    array[
      'apps/api/src/db/pool.ts',
      'apps/api/src/infrastructure/audit/structuredAuditLogger.ts',
      'apps/api/src/plugins/env.ts',
      'apps/api/src/plugins/logger.ts',
      'apps/api/src/plugins/observability.ts'
    ]::text[],
    array[
      'apps/api/test/app.test.ts',
      'apps/api/test/plugins/env.test.ts',
      'apps/api/test/plugins/observability.test.ts',
      'apps/api/test/server.test.ts'
    ]::text[],
    'integration',
    'behavior',
    'pnpm --filter dvt-api test -- apps/api/test/plugins/env.test.ts apps/api/test/plugins/observability.test.ts apps/api/test/app.test.ts apps/api/test/server.test.ts',
    'ConfigureRuntimeFoundation',
    'command',
    array['missing database URL', 'invalid environment', 'observability disabled unexpectedly', 'audit log emit failure']::text[],
    78,
    'high',
    'RUNTIME-FOUNDATION'
  );

insert into api_infrastructure_dependency_map (
  source_component_id,
  target_component_id,
  relation_id,
  contract_id,
  failure_mode
)
values
  (
    'SYS-API-INFRA-AUTH',
    'SYS-API-APPLICATION-PORTS',
    'REL-API-INFRA-AUTH-DEPENDS-ON-APPLICATION-PORTS',
    null,
    'Auth adapters can define local authorization semantics if they stop depending on application ports.'
  ),
  (
    'SYS-API-INFRA-AUTH',
    'SYS-API-APPLICATION-SERVICES-AUTHORIZATION',
    'REL-API-INFRA-AUTH-DEPENDS-ON-APPLICATION-AUTHORIZATION',
    null,
    'Auth adapters can bypass command-scope authorization if the application authorization relation is missing.'
  ),
  (
    'SYS-API-INFRA-BACKPRESSURE',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'REL-API-INFRA-BACKPRESSURE-DEPENDS-ON-START-RUN-ADMISSION',
    'CONTRACT-SYS-API-INFRA-BACKPRESSURE-API-INFRASTRUCTURE',
    'Backpressure infrastructure can become admission policy if the start-run admission relation is missing.'
  ),
  (
    'SYS-API-INFRA-START-RUN-ADMISSION',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'REL-API-INFRA-START-RUN-ADMISSION-DEPENDS-ON-START-RUN-ADMISSION',
    'CONTRACT-SYS-API-INFRA-START-RUN-ADMISSION-API-INFRASTRUCTURE',
    'Duplicate and capacity probes can admit runs directly if the application admission relation is missing.'
  ),
  (
    'SYS-API-INFRA-RUNTIME-TELEMETRY',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'REL-API-INFRA-RUNTIME-TELEMETRY-DEPENDS-ON-START-RUN-ADMISSION',
    null,
    'Runtime telemetry can drift from start-run admission facts if the relation is missing.'
  ),
  (
    'SYS-API-INFRA-RUNTIME-TELEMETRY',
    'SYS-API-APPLICATION-SERVICES-WORKSPACE',
    'REL-API-INFRA-RUNTIME-TELEMETRY-DEPENDS-ON-WORKSPACE-SERVICES',
    null,
    'Workspace graph draft telemetry can become workspace authority if the workspace service relation is missing.'
  ),
  (
    'SYS-API-INFRA-WORKSPACE-DRAFT',
    'SYS-API-APPLICATION-SERVICES-WORKSPACE',
    'REL-API-INFRA-WORKSPACE-DRAFT-DEPENDS-ON-WORKSPACE-SERVICES',
    'CONTRACT-SYS-API-INFRA-WORKSPACE-DRAFT-API-INFRASTRUCTURE',
    'Workspace draft persistence can bypass capability and CAS rules if the workspace service relation is missing.'
  ),
  (
    'SYS-API-INFRA-WORKSPACE-LOCAL-ADAPTERS',
    'SYS-API-APPLICATION-SERVICES-WORKSPACE',
    'REL-API-INFRA-WORKSPACE-LOCAL-ADAPTERS-DEPENDS-ON-WORKSPACE-SERVICES',
    'CONTRACT-SYS-API-INFRA-WORKSPACE-LOCAL-ADAPTERS-API-INFRASTRUCTURE',
    'Workspace local adapters can become route-owned repository semantics if the workspace service relation is missing.'
  ),
  (
    'SYS-API-INFRA-WAREHOUSE-SOURCES',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'REL-API-INFRA-WAREHOUSE-SOURCES-DEPENDS-ON-WAREHOUSE-SERVICES',
    'CONTRACT-SYS-API-INFRA-WAREHOUSE-SOURCES-API-INFRASTRUCTURE',
    'Warehouse adapters can duplicate source import command semantics if the warehouse application service relation is missing.'
  ),
  (
    'SYS-API-INFRA-RUNTIME-FOUNDATION',
    'SYS-API-RUNTIME-COMPOSITION',
    'REL-API-INFRA-RUNTIME-FOUNDATION-DEPENDS-ON-RUNTIME-COMPOSITION',
    null,
    'Runtime foundation configuration can become hidden composition authority if the runtime composition relation is missing.'
  ),
  (
    'SYS-API-INFRA-RUNTIME-FOUNDATION',
    'SYS-API-BOOTSTRAP',
    'REL-API-INFRA-RUNTIME-FOUNDATION-DEPENDS-ON-BOOTSTRAP',
    null,
    'Database, env, logging, and observability bootstrap can drift if the API bootstrap relation is missing.'
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
  'PLANNING-DB-API-INFRASTRUCTURE-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'API infrastructure leaf component mapping',
  'Architecture / Planning DB / API',
  'review',
  'SYS-API-INFRASTRUCTURE owned 36 active infrastructure and plugin files directly. The files are not obsolete; they implement auth, backpressure, start-run admission probes, runtime telemetry, workspace draft persistence, workspace local repositories, warehouse source adapters, and runtime foundation responsibilities. This migration keeps the existing component as the aggregate infrastructure boundary and maps concrete files to responsibility-owned leaves with component graph relations, ports, contracts, tests, observability, and Fowler/DDD basis.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;VerifyAccessToken;ReadBackpressureCapacity;ProbeDuplicateRun;RecordRuntimeTelemetry;PersistWorkspaceGraphDraft;ReadWorkspaceLocalAdapters;ReadWarehouseConnectionCatalog;ConfigureRuntimeFoundation',
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
  'PLANNING-DB-API-INFRASTRUCTURE-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-API-INFRASTRUCTURE'::text, 'may_update'::text
  union all
  select 'path', 'apps/api/src/infrastructure/**', 'may_update'
  union all
  select 'path', 'apps/api/src/db/pool.ts', 'may_update'
  union all
  select 'path', 'apps/api/src/plugins/**', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from api_infrastructure_leaf_map
  union all
  select 'component', target_component_id, 'may_reference'
  from api_infrastructure_dependency_map
  union all
  select 'path', pattern, 'may_update'
  from api_infrastructure_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'ReadApiInfrastructureCatalog;ReadComponentProfile;ValidateComponentIntegrity',
  fowler_signals = jsonb_build_array('responsibility_overload', 'adapter_boundary', 'component_split'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'ReadApiInfrastructureCatalog;ReadComponentProfile;ValidateComponentIntegrity',
    'reconciledBy',
    '221_api_infrastructure_leaf_components',
    'ownedConcern',
    'Owns the aggregate API infrastructure boundary; concrete adapter and plugin files resolve to responsibility-owned child components.'
  )
where component.component_id = 'SYS-API-INFRASTRUCTURE';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/221_api_infrastructure_leaf_components.sql',
  source_content_sha256 = md5('SYS-API-INFRASTRUCTURE:221')
    || md5('api-infrastructure-parent:221'),
  children_required = true,
  owned_concern = 'Owns the aggregate API infrastructure boundary; concrete adapter and plugin files resolve to responsibility-owned child components.',
  ddd_owner = 'ApiInfrastructureCatalog',
  cq_rails = 'ReadApiInfrastructureCatalog;ReadComponentProfile;ValidateComponentIntegrity'
where component_id = 'SYS-API-INFRASTRUCTURE';

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
  'SYS-API-INFRASTRUCTURE',
  'tools/planning-db/migrations/221_api_infrastructure_leaf_components.sql',
  md5('SYS-API-INFRASTRUCTURE:221') || md5('api-infrastructure-parent:221'),
  0,
  'API infrastructure adapters',
  'component',
  'SYS-API-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate API infrastructure boundary; concrete adapter and plugin files resolve to responsibility-owned child components.',
  'ApiInfrastructureCatalog',
  'ReadApiInfrastructureCatalog;ReadComponentProfile;ValidateComponentIntegrity',
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
  'tools/planning-db/migrations/221_api_infrastructure_leaf_components.sql',
  md5(component_id || ':221') || md5(repo_path || cq_rails || ':api-infrastructure-leaf'),
  0,
  name,
  'component',
  'SYS-API-INFRASTRUCTURE',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from api_infrastructure_leaf_map
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
from api_infrastructure_leaf_map
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
      'SYS-API-INFRASTRUCTURE',
      'responsibility',
      'Own the aggregate API infrastructure boundary and delegate concrete adapter, plugin, and database-pool ownership to responsibility leaves.',
      0
    ),
    (
      'SYS-API-INFRASTRUCTURE',
      'reason_to_change',
      'API infrastructure taxonomy, adapter ownership, command/query grouping, or API infrastructure component hierarchy changes.',
      0
    ),
    (
      'SYS-API-INFRASTRUCTURE',
      'invariant',
      'The aggregate must own no concrete apps/api/src/infrastructure, apps/api/src/db, or apps/api/src/plugins files directly once API infrastructure leaves are applied.',
      0
    ),
    (
      'SYS-API-INFRASTRUCTURE',
      'non_goal',
      'Do not deprecate active API infrastructure files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-API-INFRASTRUCTURE',
      'governance_ref',
      'docs/planning/proposals/mandatory/runtime-and-contracts/api-governance-subdivision-plan-20260502.md',
      0
    )
) item(component_id, item_kind, item_value, item_order)
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
  from api_infrastructure_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from api_infrastructure_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from api_infrastructure_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-API-INFRASTRUCTURE owns no direct files and the leaf validation command passes.', 0
  from api_infrastructure_leaf_map
  union all
  select component_id, 'consumer', 'API application services, protected runtime composition, HTTP route adapters, component-profile, component-integrity, and governance coverage readers', 0
  from api_infrastructure_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/runtime-and-contracts/api-governance-subdivision-plan-20260502.md', 0
  from api_infrastructure_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 1
  from api_infrastructure_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from api_infrastructure_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from api_infrastructure_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  repo_path = 'apps/api/src/infrastructure',
  public_contract = 'Aggregate API infrastructure adapter boundary; concrete adapter, plugin, and database-pool files resolve to responsibility-owned child components.',
  maturity_score = greatest(coalesce(maturity_score, 0), 84),
  parent_component_id = 'SYS-API-ROOT',
  updated_at = now()
where component_id = 'SYS-API-INFRASTRUCTURE';

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
  'adapter',
  'adapter',
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  criticality,
  'review',
  maturity_score,
  'SYS-API-INFRASTRUCTURE'
from api_infrastructure_leaf_map
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
from api_infrastructure_leaf_map
union all
select
  'RESP-SYS-API-INFRASTRUCTURE',
  'SYS-API-INFRASTRUCTURE',
  'Own the aggregate API infrastructure boundary and delegate concrete adapter ownership to API infrastructure leaves.',
  'API infrastructure taxonomy, adapter ownership, command/query grouping, or API infrastructure component hierarchy changes.',
  'ApiInfrastructureCatalog',
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
  'CONTRACT-' || component_id || '-API-INFRASTRUCTURE',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from api_infrastructure_leaf_map
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
  'REL-API-INFRASTRUCTURE-CONTAINS-' || relation_suffix,
  'SYS-API-INFRASTRUCTURE',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this API infrastructure leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local API infrastructure governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/runtime-and-contracts/api-governance-subdivision-plan-20260502.md',
    repo_path
  ),
  'implemented'
from api_infrastructure_leaf_map
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
  relation_id,
  source_component_id,
  target_component_id,
  'depends_on',
  'outbound',
  'sync',
  contract_id,
  failure_mode,
  'tenant/project scoped API infrastructure',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/runtime-and-contracts/api-governance-subdivision-plan-20260502.md',
    'tools/planning-db/migrations/221_api_infrastructure_leaf_components.sql'
  ),
  'implemented'
from api_infrastructure_dependency_map
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
  'CONTRACT-' || component_id || '-API-INFRASTRUCTURE',
  'CONTRACT-' || component_id || '-API-INFRASTRUCTURE',
  negative_tests,
  'implemented'
from api_infrastructure_leaf_map
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
from api_infrastructure_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-API-INFRASTRUCTURE-COMPONENT-PROFILE',
  'SYS-API-INFRASTRUCTURE',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-API-INFRASTRUCTURE --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-API-INFRASTRUCTURE --no-refresh --limit 20'
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
  'OBS-' || component_id || '-API-INFRASTRUCTURE',
  component_id,
  name || ' health is observable through component-profile, component-quality, and focused dvt-api infrastructure tests.',
  'log',
  true,
  'implemented'
from api_infrastructure_leaf_map
union all
select
  'OBS-SYS-API-INFRASTRUCTURE-COMPONENT-QUALITY',
  'SYS-API-INFRASTRUCTURE',
  'API infrastructure aggregate health is observable through component-quality direct-file count and child coverage.',
  'log',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.api_infrastructure_dependency_map;
drop table if exists pg_temp.api_infrastructure_leaf_map;
