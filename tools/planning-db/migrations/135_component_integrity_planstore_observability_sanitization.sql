-- Continue component integrity baseline sanitization for PlanStore and
-- observability component profiles exposed by the pre-push gate. This records
-- DB-first ownership, test, relation, and observability facts only; it does not
-- relax validation and does not change runtime product code.

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
  status
)
values
  ('SYS-OBSERVABILITY-ROOT', 'Observability root component', 'port', 'contracts', 'Architecture / Observability', 'packages/@dvt/observability/src', 'Composite observability contract and OpenTelemetry adapter package boundary.', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-API-ARTIFACT-RESOLUTION-ADAPTERS', 'API manifest and run-context artifact resolution adapters', 'adapter', 'adapter', 'PlanStoreArtifactResolvers', 'apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts', 'API artifact resolver adapter boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-API-COMPOSITION', 'API plan-store composition and resolvers', 'service', 'application', 'Architecture / PlanStore API', 'apps/api/src/application/services', 'API application composition for stored executable plans, plan refs, artifact resolution, and workflow engine factory wiring.', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-API-EXECUTABILITY-VALIDATION', 'API stored plan executability validation', 'service', 'application', 'StoredPlanExecutabilityValidator', 'apps/api/src/application/services/StoredPlanExecutabilityValidator.ts', 'Stored plan executability validation boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-API-PLANREF-HTTP', 'API plan-ref HTTP mapping and parsing', 'api', 'adapter', 'PlanRefHttpBoundary', 'apps/api/src/entrypoints/http/planRefHttpMapper.ts', 'Plan-ref HTTP adapter boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-API-STORED-PLAN-RESOLUTION', 'API stored executable plan resolution', 'service', 'application', 'StoredExecutablePlanResolver', 'apps/api/src/application/services/StoredExecutablePlanResolver.ts', 'Stored executable plan resolution command boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-API-WORKFLOW-ENGINE-FACTORY', 'API workflow engine factory composition', 'service', 'application', 'WorkflowEngineFactory', 'apps/api/src/application/services/WorkflowEngineFactory.ts', 'Workflow engine factory composition boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-ARTIFACTS-COMPILED-CODE-STORAGE', 'Artifacts compiled-code storage adapters', 'adapter', 'adapter', 'CompiledCodeStorage', 'packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts', 'Compiled-code artifact storage boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL', 'Artifacts package shell and exports', 'package', 'contracts', 'ArtifactsPackageShell', 'packages/@dvt/artifacts/src', 'Artifacts package public export boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-ARTIFACTS-PORTS', 'Plan-store artifacts ports and runtime readers', 'port', 'contracts', 'Architecture / PlanStore', 'packages/@dvt/artifacts/src/index.ts', 'Artifacts package ports and runtime readers for compiled code, bundles, run execution context, and plan artifacts.', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-ARTIFACTS-RUNTIME-READERS', 'Artifacts runtime readers and integrity checks', 'module', 'application', 'ArtifactRuntimeReaders', 'packages/@dvt/artifacts/src/runtime/ArtifactBackedRunExecutionContextReader.ts', 'Runtime artifact reader and integrity boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-CONTRACTS', 'Plan-store contracts', 'port', 'contracts', 'Architecture / PlanStore Contracts', 'packages/@dvt/artifacts/src/ports', 'Plan-store reader and writer port contracts.', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-CONTRACTS-READER-WRITER-PORTS', 'Plan-store reader and writer ports', 'port', 'contracts', 'PlanStoreReaderWriterPorts', 'packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts', 'PlanStore reader/writer port contract', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-DOCS-RISK', 'Plan-store docs, reviews, risk, and evidence', 'module', 'infra', 'Architecture / PlanStore Docs', 'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md', 'PlanStore governance docs, ADRs, evidence, risk entries, and command/query matrix sources.', 'node', 'medium', 'review'),
  ('SYS-PLANSTORE-ENGINE-FETCH', 'Engine plan artifact fetch and plan-ref policy', 'port', 'application', 'Architecture / Engine PlanStore', 'packages/@dvt/engine/src/security', 'Engine plan-ref policy and integrity validation port boundary.', 'node', 'critical', 'review'),
  ('SYS-PLANSTORE-ENGINE-INTEGRITY-PORT', 'Engine plan integrity validation port', 'port', 'application', 'EnginePlanIntegrityPort', 'packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts', 'Engine plan integrity validation port', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-ENGINE-PLANREF-POLICY', 'Engine plan-ref security policy', 'module', 'application', 'EnginePlanRefPolicy', 'packages/@dvt/engine/src/security/planRefPolicy.ts', 'Engine plan-ref policy boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-POSTGRES', 'Postgres plan-store adapter implementation', 'adapter', 'adapter', 'Architecture / PlanStore Postgres', 'packages/@dvt/adapter-postgres/src', 'Postgres plan-store adapter with schema, repositories, SQL, transactions, and integration tests.', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-POSTGRES-REPOSITORIES', 'Postgres plan-store repositories and composer', 'adapter', 'adapter', 'PostgresPlanStoreRepositories', 'packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts', 'Postgres plan-store repository adapter boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-POSTGRES-SCHEMA-SQL', 'Postgres plan-store schema SQL and transactions', 'adapter', 'adapter', 'PostgresPlanStoreSchemaSql', 'packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts', 'Postgres plan-store schema and SQL boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-TEMPORAL-ARTIFACT-READER', 'Temporal plan artifact reader activity', 'adapter', 'adapter', 'TemporalPlanArtifactReader', 'packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts', 'Temporal plan artifact reader activity boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-TEMPORAL-CAPACITY-SLA', 'Temporal plan-ref capacity SLA policy', 'module', 'application', 'TemporalPlanRefCapacitySlaPolicy', 'packages/@dvt/adapter-temporal/src/temporalPlanRefCapacitySlaPolicy.ts', 'Temporal plan-ref capacity SLA policy boundary', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-TEMPORAL-COMPOSITION', 'Temporal plan-store composition and plan-ref workflow boundary', 'adapter', 'adapter', 'Architecture / PlanStore Temporal', 'packages/@dvt/adapter-temporal/src', 'Temporal plan artifact reader, workflow helper, and plan-ref capacity SLA policy boundary.', 'node', 'high', 'review'),
  ('SYS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS', 'Temporal workflow artifact helpers', 'module', 'adapter', 'TemporalWorkflowArtifactHelpers', 'packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts', 'Temporal workflow artifact helper boundary', 'node', 'high', 'review')
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
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-OBSERVABILITY-ROOT', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-API-ARTIFACT-RESOLUTION-ADAPTERS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-API-COMPOSITION', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-API-EXECUTABILITY-VALIDATION', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-API-PLANREF-HTTP', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-API-STORED-PLAN-RESOLUTION', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-API-WORKFLOW-ENGINE-FACTORY', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-ARTIFACTS-COMPILED-CODE-STORAGE', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-ARTIFACTS-PORTS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-ARTIFACTS-RUNTIME-READERS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-CONTRACTS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-CONTRACTS-READER-WRITER-PORTS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-DOCS-RISK', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-ENGINE-FETCH', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-ENGINE-INTEGRITY-PORT', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-ENGINE-PLANREF-POLICY', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-POSTGRES', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-POSTGRES-REPOSITORIES', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-POSTGRES-SCHEMA-SQL', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-TEMPORAL-ARTIFACT-READER', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-TEMPORAL-CAPACITY-SLA', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-TEMPORAL-COMPOSITION', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = case component_id
    when 'SYS-OBSERVABILITY-ROOT' then 'packages/@dvt/observability/src'
    when 'SYS-PLANSTORE-API-COMPOSITION' then 'apps/api/src/application/services'
    when 'SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL' then 'packages/@dvt/artifacts/src'
    when 'SYS-PLANSTORE-CONTRACTS' then 'packages/@dvt/artifacts/src/ports'
    when 'SYS-PLANSTORE-ENGINE-FETCH' then 'packages/@dvt/engine/src/security'
    when 'SYS-PLANSTORE-POSTGRES' then 'packages/@dvt/adapter-postgres/src'
    when 'SYS-PLANSTORE-TEMPORAL-COMPOSITION' then 'packages/@dvt/adapter-temporal/src'
    else repo_path
  end,
  updated_at = now()
where component_id in (
  'SYS-OBSERVABILITY-ROOT',
  'SYS-PLANSTORE-API-COMPOSITION',
  'SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL',
  'SYS-PLANSTORE-CONTRACTS',
  'SYS-PLANSTORE-ENGINE-FETCH',
  'SYS-PLANSTORE-POSTGRES',
  'SYS-PLANSTORE-TEMPORAL-COMPOSITION'
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
  ('RESP-SYS-OBSERVABILITY-ROOT', 'SYS-OBSERVABILITY-ROOT', 'Own the observability package boundary and canonical observability contract entrypoints.', 'Observability contract, adapter, or cardinality policy changes.', 'Architecture / Observability', 'implemented'),
  ('RESP-SYS-PLANSTORE-API-COMPOSITION', 'SYS-PLANSTORE-API-COMPOSITION', 'Own API-side composition across stored executable plan resolution, artifact resolution, and workflow engine factory wiring.', 'API plan-store composition, resolver wiring, or plan-ref integration changes.', 'Architecture / PlanStore API', 'implemented'),
  ('RESP-SYS-PLANSTORE-ARTIFACTS-PORTS', 'SYS-PLANSTORE-ARTIFACTS-PORTS', 'Own artifacts package ports and runtime readers for compiled code, dbt bundles, execution context, and stored plan artifacts.', 'Artifact port, reader, integrity, or compiled-code storage contract changes.', 'Architecture / PlanStore', 'implemented'),
  ('RESP-SYS-PLANSTORE-CONTRACTS', 'SYS-PLANSTORE-CONTRACTS', 'Own canonical PlanStore reader and writer port contracts.', 'PlanStore reader/writer contract shape or compatibility changes.', 'Architecture / PlanStore Contracts', 'implemented'),
  ('RESP-SYS-PLANSTORE-DOCS-RISK', 'SYS-PLANSTORE-DOCS-RISK', 'Own PlanStore governance documents, evidence, risks, and command/query matrix traceability.', 'PlanStore governance posture, risk, evidence, or CQ catalog changes.', 'Architecture / PlanStore Docs', 'implemented'),
  ('RESP-SYS-PLANSTORE-ENGINE-FETCH', 'SYS-PLANSTORE-ENGINE-FETCH', 'Own engine-side plan-ref policy and plan integrity validation port ownership.', 'Engine plan-ref policy or plan integrity validation boundary changes.', 'Architecture / Engine PlanStore', 'implemented'),
  ('RESP-SYS-PLANSTORE-POSTGRES', 'SYS-PLANSTORE-POSTGRES', 'Own the Postgres PlanStore adapter aggregate boundary across SQL, schema, repositories, and transaction helpers.', 'Postgres PlanStore adapter storage, schema, repository, or transaction changes.', 'Architecture / PlanStore Postgres', 'implemented'),
  ('RESP-SYS-PLANSTORE-TEMPORAL-COMPOSITION', 'SYS-PLANSTORE-TEMPORAL-COMPOSITION', 'Own Temporal plan-store composition across artifact reader activities, workflow artifact helpers, and plan-ref capacity policy.', 'Temporal plan-ref artifact loading, workflow helper, or capacity SLA changes.', 'Architecture / PlanStore Temporal', 'implemented')
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
  'REL-PLANSTORE-DOCS-RISK-GUARDS-PLANSTORE-CONTRACTS',
  'SYS-PLANSTORE-DOCS-RISK',
  'SYS-PLANSTORE-CONTRACTS',
  'guards',
  'outbound',
  'build_time',
  'Stale PlanStore evidence or risk records can hide contract drift during governance review.',
  'architecture-governance',
  jsonb_build_array(
    'docs/planning/status/system-governance-planstore-file-ownership-20260501.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md'
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
  ('TEST-SYS-OBSERVABILITY-ROOT-CARDINALITY', 'SYS-OBSERVABILITY-ROOT', 'packages/@dvt/observability/test/cardinalityPolicy.test.ts', 'unit', 'boundary', true, 'pnpm --filter @dvt/observability test'),
  ('TEST-SYS-PLANSTORE-API-COMPOSITION-RESOLUTION', 'SYS-PLANSTORE-API-COMPOSITION', 'apps/api/test/application/services/StoredExecutablePlanResolver.test.ts', 'unit', 'behavior', true, 'pnpm --filter dvt-api test -- apps/api/test/application/services/StoredExecutablePlanResolver.test.ts'),
  ('TEST-SYS-PLANSTORE-ARTIFACTS-PORTS-SURFACE', 'SYS-PLANSTORE-ARTIFACTS-PORTS', 'packages/@dvt/artifacts/test/artifactSurface.test.ts', 'contract', 'boundary', true, 'pnpm --filter @dvt/artifacts test -- packages/@dvt/artifacts/test/artifactSurface.test.ts'),
  ('TEST-SYS-PLANSTORE-CONTRACTS-ARTIFACT-SURFACE', 'SYS-PLANSTORE-CONTRACTS', 'packages/@dvt/artifacts/test/artifactSurface.test.ts', 'contract', 'boundary', true, 'pnpm --filter @dvt/artifacts test -- packages/@dvt/artifacts/test/artifactSurface.test.ts'),
  ('TEST-SYS-PLANSTORE-DOCS-RISK-PROFILE', 'SYS-PLANSTORE-DOCS-RISK', 'scripts/planning-db-query.test.cjs', 'architecture', 'boundary', true, 'pnpm planning:db:query component-profile --component SYS-PLANSTORE-DOCS-RISK --no-refresh --limit 80 && pnpm planning:db:integrity:check'),
  ('TEST-SYS-PLANSTORE-ENGINE-FETCH-POLICY', 'SYS-PLANSTORE-ENGINE-FETCH', 'packages/@dvt/engine/test/security/planRefPolicy.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/engine test -- packages/@dvt/engine/test/security/planRefPolicy.test.ts'),
  ('TEST-SYS-PLANSTORE-POSTGRES-INVARIANTS', 'SYS-PLANSTORE-POSTGRES', 'packages/@dvt/adapter-postgres/test/PostgresPlanStore.invariants.unit.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/adapter-postgres test -- packages/@dvt/adapter-postgres/test/PostgresPlanStore.invariants.unit.test.ts'),
  ('TEST-SYS-PLANSTORE-TEMPORAL-COMPOSITION-ARTIFACT-READER', 'SYS-PLANSTORE-TEMPORAL-COMPOSITION', 'packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/adapter-temporal test -- packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts')
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
values
  ('OBS-OBSERVABILITY-ROOT-CARDINALITY', 'SYS-OBSERVABILITY-ROOT', 'Observability root health is governed by package cardinality policy tests and the concrete package contract.', 'metric', true, 'implemented'),
  ('OBS-PLANSTORE-API-ARTIFACT-RESOLUTION-ADAPTERS-ERRORS', 'SYS-PLANSTORE-API-ARTIFACT-RESOLUTION-ADAPTERS', 'Artifact resolution failures surface through API resolver errors and are validated by ManifestArtifactResolver tests.', 'log', true, 'implemented'),
  ('OBS-PLANSTORE-API-COMPOSITION-CALLER-OWNED', 'SYS-PLANSTORE-API-COMPOSITION', 'Composite API wiring has no independent runtime loop; route and use-case callers own operational telemetry.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-API-EXECUTABILITY-VALIDATION-CALLER-OWNED', 'SYS-PLANSTORE-API-EXECUTABILITY-VALIDATION', 'Executability validation is deterministic service code; caller routes own runtime telemetry and tests validate negative outcomes.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-API-PLANREF-HTTP-ERRORS', 'SYS-PLANSTORE-API-PLANREF-HTTP', 'Plan-ref HTTP parse and mapping failures surface as HTTP route errors and are covered by plan route parser policy tests.', 'log', true, 'implemented'),
  ('OBS-PLANSTORE-API-STORED-PLAN-RESOLUTION-CALLER-OWNED', 'SYS-PLANSTORE-API-STORED-PLAN-RESOLUTION', 'Stored plan resolution is deterministic service code; route/facade callers own operational telemetry.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-API-WORKFLOW-ENGINE-FACTORY-CALLER-OWNED', 'SYS-PLANSTORE-API-WORKFLOW-ENGINE-FACTORY', 'Workflow engine factory composition has no independent runtime loop; provider runtime owns operational telemetry.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-ARTIFACTS-COMPILED-CODE-STORAGE-CALLER-OWNED', 'SYS-PLANSTORE-ARTIFACTS-COMPILED-CODE-STORAGE', 'Compiled-code storage helpers are library/adapters called by artifact consumers; caller runtimes own telemetry.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL-STATIC', 'SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL', 'Artifacts package shell is a static export boundary; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-ARTIFACTS-PORTS-STATIC', 'SYS-PLANSTORE-ARTIFACTS-PORTS', 'Artifacts ports are static contracts; runtime telemetry is owned by concrete readers and storage adapters.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-ARTIFACTS-RUNTIME-READERS-CALLER-OWNED', 'SYS-PLANSTORE-ARTIFACTS-RUNTIME-READERS', 'Runtime artifact readers throw typed read/integrity errors; worker/API callers own log and metric emission.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-CONTRACTS-STATIC', 'SYS-PLANSTORE-CONTRACTS', 'PlanStore reader/writer contracts are static declarations; runtime telemetry is owned by concrete adapters.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-CONTRACTS-READER-WRITER-PORTS-STATIC', 'SYS-PLANSTORE-CONTRACTS-READER-WRITER-PORTS', 'PlanStore reader/writer port files are static declarations; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-ENGINE-FETCH-CALLER-OWNED', 'SYS-PLANSTORE-ENGINE-FETCH', 'Engine plan-ref policy is deterministic policy code; engine admission and provider runtime own operational telemetry.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-ENGINE-INTEGRITY-PORT-STATIC', 'SYS-PLANSTORE-ENGINE-INTEGRITY-PORT', 'Plan integrity validation port is a static engine contract; runtime telemetry belongs to concrete validators.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-ENGINE-PLANREF-POLICY-CALLER-OWNED', 'SYS-PLANSTORE-ENGINE-PLANREF-POLICY', 'Plan-ref policy helpers are deterministic security policy code covered by policy tests; callers own runtime telemetry.', 'log', true, 'not_applicable'),
  ('OBS-PLANSTORE-POSTGRES-ADAPTER-OPERATIONS', 'SYS-PLANSTORE-POSTGRES', 'Postgres PlanStore operational failures are observable through adapter error paths and repository integration tests.', 'log', true, 'implemented'),
  ('OBS-PLANSTORE-POSTGRES-REPOSITORIES-OPERATIONS', 'SYS-PLANSTORE-POSTGRES-REPOSITORIES', 'Postgres PlanStore repository operations expose storage errors through adapter boundaries and records-core tests.', 'log', true, 'implemented'),
  ('OBS-PLANSTORE-POSTGRES-SCHEMA-SQL-OPERATIONS', 'SYS-PLANSTORE-POSTGRES-SCHEMA-SQL', 'Postgres PlanStore schema and SQL health is observable through migration and SQL invariant tests.', 'log', true, 'implemented'),
  ('OBS-PLANSTORE-TEMPORAL-ARTIFACT-READER-ACTIVITY', 'SYS-PLANSTORE-TEMPORAL-ARTIFACT-READER', 'Temporal artifact reader activity failures are observable through activity errors and temporalPlanArtifactReader tests.', 'log', true, 'implemented'),
  ('OBS-PLANSTORE-TEMPORAL-CAPACITY-SLA-POLICY', 'SYS-PLANSTORE-TEMPORAL-CAPACITY-SLA', 'Temporal plan-ref capacity SLA decisions are observable through capacity policy tests and worker readiness outcomes.', 'metric', true, 'implemented'),
  ('OBS-PLANSTORE-TEMPORAL-COMPOSITION-ACTIVITY', 'SYS-PLANSTORE-TEMPORAL-COMPOSITION', 'Temporal plan-store composition is observable through artifact reader activity errors, capacity policy tests, and workflow helper tests.', 'log', true, 'implemented'),
  ('OBS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS-CALLER-OWNED', 'SYS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS', 'Workflow artifact helpers run inside Temporal workflows; workflow/activity callers own telemetry.', 'log', true, 'not_applicable')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
