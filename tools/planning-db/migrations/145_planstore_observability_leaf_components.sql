-- Split remaining PlanStore and Observability child-required buckets into
-- explicit leaves. Normalize the docs/risk placeholder as designed but not yet
-- implemented instead of forcing a fake filesystem component.

drop table if exists pg_temp.planstore_observability_parent_map;
drop table if exists pg_temp.planstore_observability_leaf_map;

create temporary table planstore_observability_parent_map (
  component_id text primary key,
  name text not null,
  kind text not null,
  layer text not null,
  owner text not null,
  repo_path text not null,
  public_contract text not null,
  criticality text not null,
  status text not null
);

insert into planstore_observability_parent_map (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  criticality,
  status
)
values
  (
    'SYS-PLANSTORE-ARTIFACTS-PORTS',
    'Plan-store artifacts ports and runtime readers',
    'port',
    'contracts',
    'Architecture / PlanStore',
    'packages/@dvt/artifacts/src/index.ts',
    'Artifacts package ports and runtime readers for compiled code, bundles, run execution context, and plan artifacts.',
    'high',
    'review'
  ),
  (
    'SYS-PLANSTORE-API-COMPOSITION',
    'API plan-store composition and resolvers',
    'service',
    'application',
    'Architecture / PlanStore API',
    'apps/api/src/application/services/StoredExecutablePlanResolver.ts',
    'API application composition for stored executable plans, plan refs, artifact resolution, and workflow engine factory wiring.',
    'high',
    'review'
  ),
  (
    'SYS-PLANSTORE-POSTGRES',
    'Postgres plan-store adapter implementation',
    'adapter',
    'adapter',
    'Architecture / PlanStore Postgres',
    'packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts',
    'Postgres plan-store adapter with schema, repositories, SQL, transactions, and integration tests.',
    'high',
    'review'
  ),
  (
    'SYS-PLANSTORE-TEMPORAL-COMPOSITION',
    'Temporal plan-store composition and plan-ref workflow boundary',
    'adapter',
    'adapter',
    'Architecture / PlanStore Temporal',
    'packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts',
    'Temporal plan artifact reader, workflow helper, and plan-ref capacity SLA policy boundary.',
    'high',
    'review'
  ),
  (
    'SYS-PLANSTORE-ENGINE-FETCH',
    'Engine plan artifact fetch and plan-ref policy',
    'port',
    'application',
    'Architecture / Engine PlanStore',
    'packages/@dvt/engine/src/security/planRefPolicy.ts',
    'Engine plan-ref policy and integrity validation port boundary.',
    'critical',
    'review'
  ),
  (
    'SYS-PLANSTORE-CONTRACTS',
    'Plan-store contracts',
    'port',
    'contracts',
    'Architecture / PlanStore Contracts',
    'packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts',
    'Plan-store reader and writer port contracts.',
    'high',
    'review'
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'Plan-store docs, reviews, risk, and evidence',
    'module',
    'infra',
    'Architecture / PlanStore Docs',
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
    'PlanStore governance docs, ADRs, evidence, risk entries, and command/query matrix sources.',
    'medium',
    'review'
  ),
  (
    'SYS-OBSERVABILITY-ROOT',
    'Observability root component',
    'port',
    'contracts',
    'Architecture / Observability',
    'packages/@dvt/observability/src/contracts/IObservability.ts',
    'Composite observability contract and OpenTelemetry adapter package boundary.',
    'high',
    'review'
  );

create temporary table planstore_observability_leaf_map (
  component_id text primary key,
  parent_id text not null,
  name text not null,
  kind text not null,
  layer text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  port_name text not null,
  port_kind text not null,
  port_direction text not null,
  negative_tests text[] not null,
  public_api text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  validation_command text not null
);

insert into planstore_observability_leaf_map (
  component_id,
  parent_id,
  name,
  kind,
  layer,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  repo_path,
  public_contract,
  fowler_signal,
  port_name,
  port_kind,
  port_direction,
  negative_tests,
  public_api,
  owns,
  test_id,
  test_path,
  validation_command
)
values
  (
    'SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL',
    'SYS-PLANSTORE-ARTIFACTS-PORTS',
    'Artifacts package shell and exports',
    'package',
    'contracts',
    'ArtifactsPackageShell',
    'RunArtifactsPackageBuild;ReadArtifactsPublicApi',
    'Owns artifacts package metadata, root exports, package test harness, and surface smoke tests.',
    'Expose artifact storage and reader ports through a package boundary without owning individual adapter/runtime semantics.',
    'Artifacts package exports, package config, root surface tests, or TS/vitest config change.',
    'packages/@dvt/artifacts/src/index.ts',
    'Artifacts package public export boundary',
    'boundary_drift',
    'RunArtifactsPackageBuild',
    'command',
    'inbound',
    array['packages/@dvt/artifacts/test/artifactSurface.test.ts']::text[],
    array['packages/@dvt/artifacts/src/index.ts']::text[],
    array[
      'packages/@dvt/artifacts/package.json',
      'packages/@dvt/artifacts/src/index.ts',
      'packages/@dvt/artifacts/test/artifactSurface.test.ts',
      'packages/@dvt/artifacts/tsconfig.json',
      'packages/@dvt/artifacts/vitest.config.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL',
    'packages/@dvt/artifacts/test/artifactSurface.test.ts',
    'pnpm --filter @dvt/artifacts test -- artifactSurface.test.ts'
  ),
  (
    'SYS-PLANSTORE-ARTIFACTS-COMPILED-CODE-STORAGE',
    'SYS-PLANSTORE-ARTIFACTS-PORTS',
    'Artifacts compiled-code storage adapters',
    'adapter',
    'adapter',
    'CompiledCodeStorage',
    'AttachCompiledCodeRefs;StoreCompiledCodeArtifact;ReadCompiledCodeArtifact',
    'Owns compiled-code storage ports, SHA-256 helper, attach refs helper, and in-memory/filesystem/S3/Minio/noop adapters.',
    'Store, attach, and read compiled-code artifacts behind explicit artifact storage ports.',
    'Compiled-code storage adapter, SHA computation, attach refs behavior, or compatibility evidence changes.',
    'packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts',
    'Compiled-code artifact storage boundary',
    'hidden_authority',
    'AttachCompiledCodeRefs',
    'storage',
    'outbound',
    array[
      'packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts',
      'packages/@dvt/planner/test/compiledCode/FileSystemCompiledCodeStorage.test.ts'
    ]::text[],
    array[
      'packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts',
      'packages/@dvt/artifacts/src/ports/ICompiledCodeStorage.ts'
    ]::text[],
    array[
      'packages/@dvt/artifacts/src/compiledCode/**',
      'packages/@dvt/artifacts/src/ports/ICompiledCodeStorage.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-ARTIFACTS-COMPILED-CODE-STORAGE',
    'packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts',
    'pnpm --filter @dvt/planner test -- test/compiledCode/attachCompiledCodeRefs.test.ts test/compiledCode/FileSystemCompiledCodeStorage.test.ts'
  ),
  (
    'SYS-PLANSTORE-ARTIFACTS-RUNTIME-READERS',
    'SYS-PLANSTORE-ARTIFACTS-PORTS',
    'Artifacts runtime readers and integrity checks',
    'module',
    'application',
    'ArtifactRuntimeReaders',
    'ReadDbtProjectBundleArtifact;ReadRunExecutionContextArtifact;ValidateArtifactIntegrity',
    'Owns artifact-backed runtime readers, plan artifact store port, read errors, binding assertions, bytes reader, and integrity validation.',
    'Read and validate stored runtime artifacts for plan execution boundaries.',
    'Artifact runtime reader, binding assertion, integrity validation, artifact bytes, or reader tests change.',
    'packages/@dvt/artifacts/src/runtime/ArtifactBackedRunExecutionContextReader.ts',
    'Runtime artifact reader and integrity boundary',
    'published_language',
    'ReadRunExecutionContextArtifact',
    'query',
    'outbound',
    array[
      'packages/@dvt/artifacts/test/runExecutionContextReaders.test.ts',
      'packages/@dvt/artifacts/test/validateArtifactIntegrity.test.ts'
    ]::text[],
    array[
      'packages/@dvt/artifacts/src/runtime/ArtifactBackedRunExecutionContextReader.ts',
      'packages/@dvt/artifacts/src/runtime/validateArtifactIntegrity.ts'
    ]::text[],
    array[
      'packages/@dvt/artifacts/src/ports/IDbtProjectBundleReader.ts',
      'packages/@dvt/artifacts/src/ports/IRunExecutionContextReader.ts',
      'packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts',
      'packages/@dvt/artifacts/src/runtime/**',
      'packages/@dvt/artifacts/test/runExecutionContextReaders.test.ts',
      'packages/@dvt/artifacts/test/validateArtifactIntegrity.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-ARTIFACTS-RUNTIME-READERS',
    'packages/@dvt/artifacts/test/runExecutionContextReaders.test.ts',
    'pnpm --filter @dvt/artifacts test -- runExecutionContextReaders.test.ts validateArtifactIntegrity.test.ts'
  ),
  (
    'SYS-PLANSTORE-API-STORED-PLAN-RESOLUTION',
    'SYS-PLANSTORE-API-COMPOSITION',
    'API stored executable plan resolution',
    'service',
    'application',
    'StoredExecutablePlanResolver',
    'ResolveStoredExecutablePlan',
    'Owns stored executable plan resolution and its application-service tests.',
    'Resolve stored executable plans for API execution flows through explicit PlanStore ports.',
    'Stored executable plan resolver, resolution errors, or resolver tests change.',
    'apps/api/src/application/services/StoredExecutablePlanResolver.ts',
    'Stored executable plan resolution command boundary',
    'hidden_authority',
    'ResolveStoredExecutablePlan',
    'query',
    'inbound',
    array['apps/api/test/application/services/StoredExecutablePlanResolver.test.ts']::text[],
    array['apps/api/src/application/services/StoredExecutablePlanResolver.ts']::text[],
    array[
      'apps/api/src/application/services/StoredExecutablePlanResolver.ts',
      'apps/api/test/application/services/StoredExecutablePlanResolver.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-API-STORED-PLAN-RESOLUTION',
    'apps/api/test/application/services/StoredExecutablePlanResolver.test.ts',
    'pnpm --filter @dvt/api test -- application/services/StoredExecutablePlanResolver.test.ts'
  ),
  (
    'SYS-PLANSTORE-API-EXECUTABILITY-VALIDATION',
    'SYS-PLANSTORE-API-COMPOSITION',
    'API stored plan executability validation',
    'service',
    'application',
    'StoredPlanExecutabilityValidator',
    'ValidateStoredPlanExecutability',
    'Owns stored plan executability validation and focused capability/fetch/registry test cases.',
    'Validate stored plan capabilities, fetch alignment, and registry binding before execution.',
    'Stored plan executability validation, capability alignment, registry cases, or validator tests change.',
    'apps/api/src/application/services/StoredPlanExecutabilityValidator.ts',
    'Stored plan executability validation boundary',
    'published_language',
    'ValidateStoredPlanExecutability',
    'query',
    'inbound',
    array[
      'apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts',
      'apps/api/test/application/services/storedPlanExecutabilityValidator/fetchAndAlignment.cases.ts'
    ]::text[],
    array['apps/api/src/application/services/StoredPlanExecutabilityValidator.ts']::text[],
    array[
      'apps/api/src/application/services/StoredPlanExecutabilityValidator.ts',
      'apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts',
      'apps/api/test/application/services/storedPlanExecutabilityValidator/**'
    ]::text[],
    'TEST-SYS-PLANSTORE-API-EXECUTABILITY-VALIDATION',
    'apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts',
    'pnpm --filter @dvt/api test -- application/services/StoredPlanExecutabilityValidator.test.ts'
  ),
  (
    'SYS-PLANSTORE-API-ARTIFACT-RESOLUTION-ADAPTERS',
    'SYS-PLANSTORE-API-COMPOSITION',
    'API manifest and run-context artifact resolution adapters',
    'adapter',
    'adapter',
    'PlanStoreArtifactResolvers',
    'ResolveManifestArtifact;ResolveRunExecutionContextArtifact;BindArtifactStoreDbtProjectBundle',
    'Owns API infrastructure adapters for manifest artifact resolution, run execution context resolution, and dbt project bundle binding policy.',
    'Resolve stored artifacts for planner and start-run flows without embedding storage details in API services.',
    'Manifest artifact resolver, run context resolver, binding policy, resolution error, or adapter tests change.',
    'apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts',
    'API artifact resolver adapter boundary',
    'boundary_drift',
    'ResolveManifestArtifact',
    'query',
    'outbound',
    array[
      'apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts',
      'apps/api/test/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.test.ts'
    ]::text[],
    array[
      'apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts',
      'apps/api/src/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.ts'
    ]::text[],
    array[
      'apps/api/src/application/errors/ManifestArtifactResolutionError.ts',
      'apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts',
      'apps/api/src/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.ts',
      'apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts',
      'apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts',
      'apps/api/test/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-API-ARTIFACT-RESOLUTION-ADAPTERS',
    'apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts',
    'pnpm --filter @dvt/api test -- infrastructure/planner/ManifestArtifactResolver.test.ts infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.test.ts'
  ),
  (
    'SYS-PLANSTORE-API-PLANREF-HTTP',
    'SYS-PLANSTORE-API-COMPOSITION',
    'API plan-ref HTTP mapping and parsing',
    'api',
    'adapter',
    'PlanRefHttpBoundary',
    'ParsePlanRefHttpInput;MapPlanRefHttpResponse;ValidatePlanRoutePlanSourcePolicy',
    'Owns plan-ref HTTP mapper, parser, and plan route plan-source policy evidence.',
    'Translate plan-ref HTTP inputs and outputs while keeping route semantics aligned with plan-source policy.',
    'Plan-ref parser, HTTP mapper, plan-source policy behavior, or route tests change.',
    'apps/api/src/entrypoints/http/planRefHttpMapper.ts',
    'Plan-ref HTTP adapter boundary',
    'published_language',
    'ParsePlanRefHttpInput',
    'api',
    'inbound',
    array['apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts']::text[],
    array[
      'apps/api/src/entrypoints/http/planRefHttpMapper.ts',
      'apps/api/src/entrypoints/http/planRoutePlanRefParser.ts'
    ]::text[],
    array[
      'apps/api/src/entrypoints/http/planRefHttpMapper.ts',
      'apps/api/src/entrypoints/http/planRoutePlanRefParser.ts',
      'apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-API-PLANREF-HTTP',
    'apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts',
    'pnpm --filter @dvt/api test -- entrypoints/http/planRoutePlanSourcePolicy.test.ts'
  ),
  (
    'SYS-PLANSTORE-API-WORKFLOW-ENGINE-FACTORY',
    'SYS-PLANSTORE-API-COMPOSITION',
    'API workflow engine factory composition',
    'service',
    'application',
    'WorkflowEngineFactory',
    'CreateWorkflowEngineForStoredPlan',
    'Owns API workflow engine factory composition for stored-plan execution wiring.',
    'Create workflow engines with stored-plan dependencies without duplicating execution semantics in API routes.',
    'Workflow engine factory wiring, dependency composition, or factory tests change.',
    'apps/api/src/application/services/WorkflowEngineFactory.ts',
    'Workflow engine factory composition boundary',
    'hidden_authority',
    'CreateWorkflowEngineForStoredPlan',
    'command',
    'inbound',
    array['apps/api/test/application/services/WorkflowEngineFactory.test.ts']::text[],
    array['apps/api/src/application/services/WorkflowEngineFactory.ts']::text[],
    array[
      'apps/api/src/application/services/WorkflowEngineFactory.ts',
      'apps/api/test/application/services/WorkflowEngineFactory.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-API-WORKFLOW-ENGINE-FACTORY',
    'apps/api/test/application/services/WorkflowEngineFactory.test.ts',
    'pnpm --filter @dvt/api test -- application/services/WorkflowEngineFactory.test.ts'
  ),
  (
    'SYS-PLANSTORE-POSTGRES-SCHEMA-SQL',
    'SYS-PLANSTORE-POSTGRES',
    'Postgres plan-store schema SQL and transactions',
    'adapter',
    'adapter',
    'PostgresPlanStoreSchemaSql',
    'MigratePostgresPlanStoreSchema;ExecutePostgresPlanStoreSql',
    'Owns Postgres schema manager, SQL constants, transaction wrapper, mapper utilities, and SQL/lifecycle/invariant tests.',
    'Maintain plan-store schema, SQL, transactions, and invariants as a cohesive Postgres adapter boundary.',
    'Schema migration, SQL query, transaction behavior, mapper, invariant, or lifecycle tests change.',
    'packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts',
    'Postgres plan-store schema and SQL boundary',
    'hidden_authority',
    'MigratePostgresPlanStoreSchema',
    'storage',
    'outbound',
    array[
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.sql.test.ts',
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.invariants.unit.test.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.schema-manager.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.schema-manager.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.tx.ts',
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.invariants.unit.test.ts',
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.lifecycle.integration.test.ts',
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.sql.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-POSTGRES-SCHEMA-SQL',
    'packages/@dvt/adapter-postgres/test/PostgresPlanStore.sql.test.ts',
    'pnpm --filter @dvt/adapter-postgres test -- PostgresPlanStore.sql.test.ts PostgresPlanStore.invariants.unit.test.ts'
  ),
  (
    'SYS-PLANSTORE-POSTGRES-REPOSITORIES',
    'SYS-PLANSTORE-POSTGRES',
    'Postgres plan-store repositories and composer',
    'adapter',
    'adapter',
    'PostgresPlanStoreRepositories',
    'WritePostgresPlanRecord;ReadPostgresExecutableBlob;RecordPlanAdmission;ComposePostgresPlanStore',
    'Owns Postgres plan-store repositories, main adapter, composer, integration helpers, and record guard/core tests.',
    'Persist and read plan records, executable blobs, admission records, and executability state through repository adapters.',
    'Repository persistence, adapter composition, integration helpers, or record guard/core tests change.',
    'packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts',
    'Postgres plan-store repository adapter boundary',
    'published_language',
    'WritePostgresPlanRecord',
    'storage',
    'outbound',
    array[
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts',
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-guards.integration.test.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStoreComposer.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.admission-repository.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.executability-repository.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.executable-blob-repository.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.plan-record-repository.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStoreComposer.ts',
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.integration.helpers.ts',
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts',
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-guards.integration.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-POSTGRES-REPOSITORIES',
    'packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts',
    'pnpm --filter @dvt/adapter-postgres test -- PostgresPlanStore.records-core.integration.test.ts PostgresPlanStore.records-guards.integration.test.ts'
  ),
  (
    'SYS-PLANSTORE-TEMPORAL-ARTIFACT-READER',
    'SYS-PLANSTORE-TEMPORAL-COMPOSITION',
    'Temporal plan artifact reader activity',
    'adapter',
    'adapter',
    'TemporalPlanArtifactReader',
    'ReadTemporalPlanArtifact',
    'Owns Temporal activity plan artifact reader and its unit evidence.',
    'Read plan artifacts inside Temporal activity boundaries without leaking storage adapter semantics into workflows.',
    'Temporal plan artifact reader behavior or tests change.',
    'packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts',
    'Temporal plan artifact reader activity boundary',
    'boundary_drift',
    'ReadTemporalPlanArtifact',
    'query',
    'outbound',
    array['packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts']::text[],
    array['packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts']::text[],
    array[
      'packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts',
      'packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-TEMPORAL-ARTIFACT-READER',
    'packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts',
    'pnpm --filter @dvt/adapter-temporal test -- temporalPlanArtifactReader.test.ts'
  ),
  (
    'SYS-PLANSTORE-TEMPORAL-CAPACITY-SLA',
    'SYS-PLANSTORE-TEMPORAL-COMPOSITION',
    'Temporal plan-ref capacity SLA policy',
    'module',
    'application',
    'TemporalPlanRefCapacitySlaPolicy',
    'ValidateTemporalPlanRefCapacitySla',
    'Owns Temporal plan-ref capacity SLA policy and its Fowler-linked tests.',
    'Guard plan-ref Temporal capacity and SLA decisions before workflow execution.',
    'Temporal plan-ref capacity policy, SLA thresholds, or policy tests change.',
    'packages/@dvt/adapter-temporal/src/temporalPlanRefCapacitySlaPolicy.ts',
    'Temporal plan-ref capacity SLA policy boundary',
    'published_language',
    'ValidateTemporalPlanRefCapacitySla',
    'query',
    'inbound',
    array['packages/@dvt/adapter-temporal/test/temporalPlanRefCapacitySlaPolicy.test.ts']::text[],
    array['packages/@dvt/adapter-temporal/src/temporalPlanRefCapacitySlaPolicy.ts']::text[],
    array[
      'packages/@dvt/adapter-temporal/src/temporalPlanRefCapacitySlaPolicy.ts',
      'packages/@dvt/adapter-temporal/test/temporalPlanRefCapacitySlaPolicy.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-TEMPORAL-CAPACITY-SLA',
    'packages/@dvt/adapter-temporal/test/temporalPlanRefCapacitySlaPolicy.test.ts',
    'pnpm --filter @dvt/adapter-temporal test -- temporalPlanRefCapacitySlaPolicy.test.ts'
  ),
  (
    'SYS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS',
    'SYS-PLANSTORE-TEMPORAL-COMPOSITION',
    'Temporal workflow artifact helpers',
    'module',
    'adapter',
    'TemporalWorkflowArtifactHelpers',
    'ResolveWorkflowArtifactRefs',
    'Owns workflow artifact helper semantics and workflow component architecture evidence.',
    'Keep Temporal workflow artifact helper behavior explicit inside workflow-safe code paths.',
    'Workflow artifact helper semantics or workflow component architecture tests change.',
    'packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts',
    'Temporal workflow artifact helper boundary',
    'evolutionary_architecture',
    'ResolveWorkflowArtifactRefs',
    'query',
    'inbound',
    array['packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts']::text[],
    array['packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts']::text[],
    array[
      'packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts',
      'packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS',
    'packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts',
    'pnpm --filter @dvt/adapter-temporal test -- workflow-component-semantics.architecture.test.ts'
  ),
  (
    'SYS-PLANSTORE-ENGINE-PLANREF-POLICY',
    'SYS-PLANSTORE-ENGINE-FETCH',
    'Engine plan-ref security policy',
    'module',
    'application',
    'EnginePlanRefPolicy',
    'AuthorizePlanRefExecution;ValidatePlanRefPolicyRules',
    'Owns engine plan-ref security policy and workflow-engine plan-ref tests.',
    'Authorize stored plan references before engine execution through explicit policy rules.',
    'Plan-ref policy, security rules, authorization behavior, or engine plan-ref tests change.',
    'packages/@dvt/engine/src/security/planRefPolicy.ts',
    'Engine plan-ref policy boundary',
    'published_language',
    'AuthorizePlanRefExecution',
    'query',
    'inbound',
    array[
      'packages/@dvt/engine/test/core/WorkflowEngine.planRef.test.ts',
      'packages/@dvt/engine/test/security/planRefPolicy.test.ts'
    ]::text[],
    array[
      'packages/@dvt/engine/src/security/planRefPolicy.ts',
      'packages/@dvt/engine/src/security/planRefPolicyRules.ts'
    ]::text[],
    array[
      'packages/@dvt/engine/src/security/planRefPolicy.ts',
      'packages/@dvt/engine/src/security/planRefPolicyRules.ts',
      'packages/@dvt/engine/test/core/WorkflowEngine.planRef.test.ts',
      'packages/@dvt/engine/test/security/planRefPolicy.test.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-ENGINE-PLANREF-POLICY',
    'packages/@dvt/engine/test/security/planRefPolicy.test.ts',
    'pnpm --filter @dvt/engine test -- test/security/planRefPolicy.test.ts test/core/WorkflowEngine.planRef.test.ts'
  ),
  (
    'SYS-PLANSTORE-ENGINE-INTEGRITY-PORT',
    'SYS-PLANSTORE-ENGINE-FETCH',
    'Engine plan integrity validation port',
    'port',
    'application',
    'EnginePlanIntegrityPort',
    'ValidatePlanIntegrityForExecution',
    'Owns engine plan integrity validator port used by stored-plan execution flows.',
    'Keep plan integrity validation explicit at the engine boundary.',
    'Plan integrity validator port or engine plan-ref validation tests change.',
    'packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts',
    'Engine plan integrity validation port',
    'published_language',
    'ValidatePlanIntegrityForExecution',
    'query',
    'inbound',
    array['packages/@dvt/engine/test/core/WorkflowEngine.planRef.test.ts']::text[],
    array['packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts']::text[],
    array['packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts']::text[],
    'TEST-SYS-PLANSTORE-ENGINE-INTEGRITY-PORT',
    'packages/@dvt/engine/test/core/WorkflowEngine.planRef.test.ts',
    'pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.planRef.test.ts'
  ),
  (
    'SYS-PLANSTORE-CONTRACTS-READER-WRITER-PORTS',
    'SYS-PLANSTORE-CONTRACTS',
    'Plan-store reader and writer ports',
    'port',
    'contracts',
    'PlanStoreReaderWriterPorts',
    'ReadPlanStoreRecord;WritePlanStoreRecord',
    'Owns plan-store reader and writer port contracts.',
    'Keep PlanStore reader/writer capabilities explicit for adapters and API composition.',
    'PlanStore reader port, writer port, or contract-level PlanStore usage changes.',
    'packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts',
    'PlanStore reader/writer port contract',
    'published_language',
    'ReadPlanStoreRecord',
    'query',
    'inbound',
    array['scripts/planning-db-query.test.cjs']::text[],
    array[
      'packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts',
      'packages/@dvt/artifacts/src/ports/IPlanStoreWriter.ts'
    ]::text[],
    array[
      'packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts',
      'packages/@dvt/artifacts/src/ports/IPlanStoreWriter.ts'
    ]::text[],
    'TEST-SYS-PLANSTORE-CONTRACTS-READER-WRITER-PORTS',
    'scripts/planning-db-query.test.cjs',
    'pnpm planning:db:query component-profile --component SYS-PLANSTORE-CONTRACTS --no-refresh --limit 80'
  ),
  (
    'SYS-OBSERVABILITY-CONTRACTS-NOOP',
    'SYS-OBSERVABILITY-ROOT',
    'Observability contracts noop implementation and policy',
    'port',
    'contracts',
    'ObservabilityContracts',
    'RecordObservabilityEvent;ApplyObservabilityCardinalityPolicy',
    'Owns observability contracts, context types, noop implementation, cardinality policy, package metadata, and tests.',
    'Define the observability port language and safe default implementation for runtime packages.',
    'Observability contract, context, noop behavior, cardinality policy, package metadata, or tests change.',
    'packages/@dvt/observability/src/contracts/IObservability.ts',
    'Observability port contract boundary',
    'published_language',
    'RecordObservabilityEvent',
    'event',
    'inbound',
    array['packages/@dvt/observability/test/cardinalityPolicy.test.ts']::text[],
    array[
      'packages/@dvt/observability/src/contracts/IObservability.ts',
      'packages/@dvt/observability/src/noopObservability.ts'
    ]::text[],
    array[
      'packages/@dvt/observability/package.json',
      'packages/@dvt/observability/README.md',
      'packages/@dvt/observability/src/**',
      'packages/@dvt/observability/test/cardinalityPolicy.test.ts',
      'packages/@dvt/observability/tsconfig.json'
    ]::text[],
    'TEST-SYS-OBSERVABILITY-CONTRACTS-NOOP',
    'packages/@dvt/observability/test/cardinalityPolicy.test.ts',
    'pnpm --filter @dvt/observability test -- cardinalityPolicy.test.ts'
  ),
  (
    'SYS-OBSERVABILITY-OTEL-ADAPTER',
    'SYS-OBSERVABILITY-ROOT',
    'OpenTelemetry observability adapter',
    'adapter',
    'adapter',
    'OtelObservabilityAdapter',
    'ExportObservabilityToOpenTelemetry',
    'Owns the OpenTelemetry observability adapter package, exports, README, and tests.',
    'Adapt DVT observability events to OpenTelemetry without changing the observability contract package.',
    'OpenTelemetry adapter behavior, package metadata, README, or tests change.',
    'packages/@dvt/observability-otel/src/OtelObservability.ts',
    'OpenTelemetry observability adapter boundary',
    'boundary_drift',
    'ExportObservabilityToOpenTelemetry',
    'event',
    'outbound',
    array['packages/@dvt/observability-otel/test/OtelObservability.test.ts']::text[],
    array[
      'packages/@dvt/observability-otel/src/OtelObservability.ts',
      'packages/@dvt/observability-otel/src/index.ts'
    ]::text[],
    array[
      'packages/@dvt/observability-otel/package.json',
      'packages/@dvt/observability-otel/README.md',
      'packages/@dvt/observability-otel/src/**',
      'packages/@dvt/observability-otel/test/OtelObservability.test.ts',
      'packages/@dvt/observability-otel/tsconfig.json'
    ]::text[],
    'TEST-SYS-OBSERVABILITY-OTEL-ADAPTER',
    'packages/@dvt/observability-otel/test/OtelObservability.test.ts',
  'pnpm --filter @dvt/observability-otel test -- OtelObservability.test.ts'
  );

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
  'planning_query_store.governance_component_local_definitions',
  '1451451451451451451451451451451451451451451451451451451451451451',
  0,
  name,
  'component',
  case
    when component_id = 'SYS-OBSERVABILITY-ROOT' then 'SYS-OBSERVABILITY'
    else 'SYS-PLANSTORE'
  end,
  'SYS-DVT',
  'SYS-DVT',
  case when status = 'proposed' then 'review' else status end,
  case when component_id = 'SYS-PLANSTORE-DOCS-RISK' then false else true end,
  public_contract,
  owner,
  case
    when component_id = 'SYS-PLANSTORE-DOCS-RISK' then 'ReadPlanStoreDocsRiskStatus'
    when component_id = 'SYS-OBSERVABILITY-ROOT' then 'RecordObservabilitySignal;ReadObservabilityPolicy'
    else 'ReadPlanStoreComponentProfile'
  end,
  'codex'
from planstore_observability_parent_map
on conflict (component_id) do nothing;

update planning_query_store.governance_component_local_definitions
set
  children_required = false,
  status = 'review',
  owned_concern = 'PlanStore docs, ADRs, evidence, risk entries, command/query matrix, and status sources that govern runtime PlanStore implementation components.',
  ddd_owner = 'PlanStoreDocsRiskEvidence',
  cq_rails = 'ReadPlanStoreDocsRiskStatus;ReadPlanStoreCommandQueryMatrix'
where component_id = 'SYS-PLANSTORE-DOCS-RISK';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
    0
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-record-plan-store-execution-plan-20260402.md',
    1
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/planning/reviews/20260402-s08-plan-record-plan-store-gap-review.md',
    2
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/planning/status/system-governance-planstore-file-ownership-20260501.md',
    3
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md',
    4
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/adr/ADR-0054-plan-store-scoped-record-identity.md',
    5
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/adr/adr-0052-planref-continuation-safety.md',
    6
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/contracts/planner/plan-store-records-v1.md',
    7
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/guides/postgres-plan-store-user-manual-20260403.md',
    8
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/guides/postgres-plan-store-technical-manual-20260403.md',
    9
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/evidence/ed-20260526-dbt-authoring-run-plan-store-reuse.md',
    10
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/evidence/ed-20260514-s08-plan-store-inventory-drift.md',
    11
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/risk-register/quality/R-20260526-DBT-PLAN-STORE-REUSE.yaml',
    12
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/risk-register/quality/R-20260514-S08-PLAN-STORE-INVENTORY-DRIFT.yaml',
    13
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'transition',
    'docs-risk-governance: owns tracked PlanStore docs, ADRs, evidence, and risks; runtime implementation files remain owned by specific PlanStore leaves.',
    0
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'governance_ref',
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
    0
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'governance_ref',
    'docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md',
    1
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'governance_ref',
    'docs/contracts/planner/plan-store-records-v1.md',
    2
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  'planning_query_store.governance_component_local_definitions',
  '1451451451451451451451451451451451451451451451451451451451451451',
  0,
  name,
  'component',
  parent_id,
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from planstore_observability_leaf_map
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
from planstore_observability_leaf_map
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
  from planstore_observability_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from planstore_observability_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Files claimed by this leaf must not fall through to the PlanStore or Observability parent bucket.',
    0
  from planstore_observability_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows no direct files owned by the parent component and package tests remain green.',
    0
  from planstore_observability_leaf_map
  union all
  select
    component_id,
    'consumer',
    'API plan routes, engine execution, Temporal workflows, Postgres adapters, artifacts package consumers, and observability adapters',
    0
  from planstore_observability_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    0
  from planstore_observability_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    1
  from planstore_observability_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from planstore_observability_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from planstore_observability_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
select
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  'node',
  criticality,
  status,
  null
from planstore_observability_parent_map
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
select
  component_id,
  name,
  kind,
  layer,
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  case when parent_id like 'SYS-PLANSTORE-%' then 'high' else 'medium' end,
  'review',
  parent_id
from planstore_observability_leaf_map
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(port_kind),
  component_id,
  port_name,
  port_kind,
  port_direction,
  negative_tests,
  'implemented'
from planstore_observability_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

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
from planstore_observability_leaf_map
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
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-' || replace(parent_id, 'SYS-', '') || '-CONTAINS-' || replace(component_id, parent_id || '-', ''),
  parent_id,
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this leaf is remapped without a governed Planning DB component update.',
  'repo-local component governance',
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from planstore_observability_leaf_map
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
  'unit',
  'behavior',
  true,
  validation_command
from planstore_observability_leaf_map
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.planstore_observability_leaf_map;
drop table if exists pg_temp.planstore_observability_parent_map;
