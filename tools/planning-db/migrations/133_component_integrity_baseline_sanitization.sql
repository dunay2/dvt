-- Sanitize component integrity baseline regressions exposed by the local
-- pre-push gate. This migration records DB-first component path ownership and
-- observability facts; it does not relax the integrity check or delete source.

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
  ('SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS', 'Planning DB migration catalog', 'module', 'infra', 'PlanningDbMigrationCatalog', 'tools/planning-db/migrations', 'Planning DB migration catalog boundary', 'node', 'high', 'review'),
  ('SYS-CI-GOVERNANCE-ROOT', 'CI and automation root component', 'module', 'infra', 'Architecture / CI', '.github', 'Composite CI governance boundary for workflows, hooks, tools, scripts, and repository automation.', 'node', 'high', 'review'),
  ('SYS-CI-GOVERNANCE-SCRIPTS', 'Repository governance automation scripts', 'module', 'infra', 'RepositoryAutomationScriptCatalog', 'scripts', 'Composite repository automation script boundary with leaf-owned concrete script responsibilities.', 'node', 'high', 'review'),
  ('SYS-CONTRACTS-COMPAT-MATRIX', 'Plan compatibility matrix contract', 'module', 'contracts', 'PlanCompatibilityMatrix', 'contracts/compat/plan-compat.schema.json', 'Plan compatibility matrix schema boundary', 'node', 'high', 'review'),
  ('SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS', 'Engine runtime contract family', 'port', 'contracts', 'EngineRuntimeContractFamily', 'packages/@dvt/contracts/src/contracts/engine/IWorkflowEngine.v1.ts', 'Engine runtime contract family boundary', 'node', 'high', 'review'),
  ('SYS-CONTRACTS-PACKAGE-ENTRYPOINTS', 'Contracts package entrypoints', 'api', 'contracts', 'ContractsPackageEntrypoint', 'packages/@dvt/contracts/index.ts', '@dvt/contracts package entrypoint boundary', 'node', 'high', 'review'),
  ('SYS-CONTRACTS-PACKAGE-TESTS', 'Contracts package test evidence', 'module', 'contracts', 'ContractsPackageTestEvidence', 'packages/@dvt/contracts/test', 'Contracts package test evidence boundary', 'node', 'high', 'review'),
  ('SYS-CONTRACTS-PLANNER-CONTRACTS', 'Planner contract family', 'port', 'contracts', 'PlannerContractFamily', 'packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts', 'Planner contract family boundary', 'node', 'high', 'review'),
  ('SYS-CONTRACTS-ROOT', 'Contracts root component', 'package', 'contracts', 'Architecture / Contracts', 'packages/@dvt/contracts', 'Composite contracts boundary with leaf-owned contract families.', 'node', 'critical', 'review'),
  ('SYS-CONTRACTS-SCHEMA-PACKS', 'Runtime schema pack contract family', 'module', 'contracts', 'RuntimeSchemaPackCatalog', 'packages/@dvt/contracts/src/schema-packs/execution-plan.ts', 'Runtime schema pack boundary', 'node', 'high', 'review'),
  ('SYS-CONTRACTS-SHARED-TYPES-UTILS', 'Shared contract types and primitives', 'module', 'contracts', 'SharedContractPrimitiveCatalog', 'packages/@dvt/contracts/src/utils/contractPrimitives.ts', 'Shared contract primitive boundary', 'node', 'high', 'review'),
  ('SYS-CONTRACTS-STEP-REGISTRY', 'Step type registry contract family', 'module', 'contracts', 'StepTypeRegistryContractFamily', 'packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts', 'Step type registry contract boundary', 'node', 'high', 'review'),
  ('SYS-CONTRACTS-VALIDATION-RUNTIME', 'Contract runtime validation functions', 'api', 'contracts', 'ContractRuntimeValidation', 'packages/@dvt/contracts/src/validation.ts', 'Contract runtime validation boundary', 'node', 'high', 'review'),
  ('SYS-PLANNER-CONTRACTS-PACKAGE', 'Planner contracts compatibility package', 'api', 'contracts', 'PlannerContractsCompatibilityPackage', 'packages/@dvt/planner-contracts/index.ts', '@dvt/planner-contracts compatibility package boundary', 'node', 'high', 'review'),
  ('SYS-REPO-METADATA-FOWLER-INBOX', 'Fowler analysis intake inbox', 'module', 'infra', 'FowlerAnalysisIntakeCatalog', 'buzon', 'Fowler analysis intake boundary', 'none', 'medium', 'review'),
  ('SYS-REPO-METADATA-INFRA-DB-MIGRATIONS', 'Infrastructure database migration archive', 'module', 'infra', 'InfrastructureDatabaseMigrationCatalog', 'infra/db/migrations', 'Infrastructure database migration boundary', 'none', 'medium', 'review'),
  ('SYS-REPO-METADATA-ROOT', 'Repository metadata root component', 'module', 'infra', 'Architecture / Repository Metadata', '.', 'Composite repository metadata boundary with leaf-owned concrete files.', 'none', 'high', 'review'),
  ('SYS-WORKERS-OUTBOX-BUS-ADAPTERS', 'Outbox worker event bus adapters', 'adapter', 'adapter', 'OutboxEventBusAdapter', 'apps/outbox-worker/src/bus/HttpEventBus.ts', 'Outbox event bus adapter boundary', 'node', 'high', 'review'),
  ('SYS-WORKERS-OUTBOX-CANARY-TESTS', 'Outbox worker standalone canary tests', 'module', 'application', 'OutboxWorkerCanaryEvidence', 'apps/outbox-worker/test/canary/standaloneCanaryAcceptance.health.test.ts', 'Outbox worker standalone canary evidence boundary', 'node', 'high', 'review'),
  ('SYS-WORKERS-OUTBOX-DB-ADAPTER', 'Outbox worker database adapter', 'adapter', 'adapter', 'OutboxWorkerDatabaseAdapter', 'apps/outbox-worker/src/db/pool.ts', 'Outbox worker database adapter boundary', 'node', 'high', 'review'),
  ('SYS-WORKERS-OUTBOX-HOST-LIFECYCLE', 'Outbox worker host lifecycle', 'service', 'application', 'OutboxWorkerHost', 'apps/outbox-worker/src/host/runOutboxWorkerHost.ts', 'Outbox worker host lifecycle boundary', 'node', 'high', 'review'),
  ('SYS-WORKERS-OUTBOX-OPS', 'Outbox worker operational monitor', 'service', 'application', 'OutboxWorkerOperationalMonitor', 'apps/outbox-worker/src/ops/OperationalServer.ts', 'Outbox worker operational API boundary', 'node', 'high', 'review'),
  ('SYS-WORKERS-OUTBOX-OWNERSHIP', 'Outbox worker shard ownership gate', 'service', 'application', 'OutboxShardOwnershipGate', 'apps/outbox-worker/src/ownership/PgShardOwnershipGate.ts', 'Outbox shard ownership boundary', 'node', 'high', 'review'),
  ('SYS-WORKERS-OUTBOX-RUNTIME', 'Outbox worker delivery and retention runtime', 'service', 'application', 'OutboxWorkerRuntime', 'apps/outbox-worker/src/runtime/OutboxWorkerRuntime.ts', 'Outbox delivery and retention runtime boundary', 'node', 'high', 'review'),
  ('SYS-WORKERS-ROOT', 'Worker root component', 'service', 'application', 'Architecture / Workers', 'apps/outbox-worker', 'Composite worker boundary with leaf-owned hosts, runtimes, adapters, ops, and tests.', 'node', 'high', 'review')
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
  'PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618',
  'UXDB-CANVAS-FIRST-TEST-SLICES-1',
  'Planning DB component integrity baseline sanitization',
  'Architecture / Planning DB',
  'review',
  'The pre-push integrity gate requires zero phantom component paths, duplicate repo paths, and missing observability maturity. The affected records are existing DB component metadata, not product code. This design remaps composite components to canonical directories and records explicit observability evidence for static contracts, CI governance, and outbox worker operational surfaces.',
  'hidden_authority',
  'RecordArchitectureComponent;RecordArchitectureObservabilityEvidence;CheckPlanningDbComponentIntegrity',
  now()
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
values
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CI-GOVERNANCE-ROOT', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CI-GOVERNANCE-SCRIPTS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CONTRACTS-ROOT', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CONTRACTS-PACKAGE-TESTS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-REPO-METADATA-ROOT', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-REPO-METADATA-FOWLER-INBOX', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-REPO-METADATA-INFRA-DB-MIGRATIONS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-WORKERS-ROOT', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = case component_id
    when 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS' then 'tools/planning-db/migrations'
    when 'SYS-CI-GOVERNANCE-ROOT' then '.github'
    when 'SYS-CI-GOVERNANCE-SCRIPTS' then 'scripts'
    when 'SYS-CONTRACTS-ROOT' then 'packages/@dvt/contracts'
    when 'SYS-CONTRACTS-PACKAGE-TESTS' then 'packages/@dvt/contracts/test'
    when 'SYS-REPO-METADATA-ROOT' then '.'
    when 'SYS-REPO-METADATA-FOWLER-INBOX' then 'buzon'
    when 'SYS-REPO-METADATA-INFRA-DB-MIGRATIONS' then 'infra/db/migrations'
    when 'SYS-WORKERS-ROOT' then 'apps/outbox-worker'
    else repo_path
  end,
  updated_at = now()
where component_id in (
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'SYS-CI-GOVERNANCE-ROOT',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-CONTRACTS-ROOT',
  'SYS-CONTRACTS-PACKAGE-TESTS',
  'SYS-REPO-METADATA-ROOT',
  'SYS-REPO-METADATA-FOWLER-INBOX',
  'SYS-REPO-METADATA-INFRA-DB-MIGRATIONS',
  'SYS-WORKERS-ROOT'
);

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values
  ('OBS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-CHECKS', 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS', 'Planning DB migration health is observable through planning:db:migrate and test:planning:db:migrations.', 'log', true, 'implemented'),
  ('OBS-CI-GOVERNANCE-ROOT-CHECKS', 'SYS-CI-GOVERNANCE-ROOT', 'CI governance health is observable through verify:prepush, governance:refresh, and workflow validation logs.', 'log', true, 'implemented'),
  ('OBS-CI-GOVERNANCE-SCRIPTS-CHECKS', 'SYS-CI-GOVERNANCE-SCRIPTS', 'Governance script health is observable through governance:refresh, planning:db:check, and governance:db:check output.', 'log', true, 'implemented'),
  ('OBS-CONTRACTS-COMPAT-MATRIX-STATIC', 'SYS-CONTRACTS-COMPAT-MATRIX', 'Static contract artifact; runtime telemetry is not applicable and contract health is validated by contracts tests.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS-STATIC', 'SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS', 'Static contract API; runtime telemetry is owned by engine runtime adapters, not this contract declaration.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-PACKAGE-ENTRYPOINTS-STATIC', 'SYS-CONTRACTS-PACKAGE-ENTRYPOINTS', 'Static package entrypoint; runtime telemetry is not applicable and API health is validated by package tests.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-PACKAGE-TESTS-STATIC', 'SYS-CONTRACTS-PACKAGE-TESTS', 'Test evidence component; runtime telemetry is not applicable and execution is observable through package test output.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-PLANNER-CONTRACTS-STATIC', 'SYS-CONTRACTS-PLANNER-CONTRACTS', 'Static planner contract declarations; runtime telemetry is owned by planner execution surfaces.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-ROOT-STATIC', 'SYS-CONTRACTS-ROOT', 'Contracts package root is a static package boundary; runtime telemetry is not applicable to the declaration surface.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-SCHEMA-PACKS-STATIC', 'SYS-CONTRACTS-SCHEMA-PACKS', 'Schema pack declarations are static contract artifacts validated through contract tests, not runtime telemetry.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-SHARED-TYPES-UTILS-STATIC', 'SYS-CONTRACTS-SHARED-TYPES-UTILS', 'Shared contract primitives are static code; runtime telemetry is not applicable to this component.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-STEP-REGISTRY-STATIC', 'SYS-CONTRACTS-STEP-REGISTRY', 'Step registry contract declarations are static and validated by contract tests; runtime telemetry is owned by step executors.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-VALIDATION-RUNTIME-STATIC', 'SYS-CONTRACTS-VALIDATION-RUNTIME', 'Contract validation helpers are static library code; runtime telemetry is not applicable to this component.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-CONTRACTS-PACKAGE-STATIC', 'SYS-PLANNER-CONTRACTS-PACKAGE', 'Planner contracts compatibility package is a static contract package; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-WORKERS-OUTBOX-BUS-ADAPTERS-LOGS', 'SYS-WORKERS-OUTBOX-BUS-ADAPTERS', 'Outbox bus adapter delivery failures are observable through structured worker logs and outbox delivery metrics.', 'log', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-CANARY-TESTS-HEALTH', 'SYS-WORKERS-OUTBOX-CANARY-TESTS', 'Outbox canary health is observable through standalone canary /healthz, /readyz, and /metrics assertions.', 'dashboard', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-DB-ADAPTER-LOGS', 'SYS-WORKERS-OUTBOX-DB-ADAPTER', 'Outbox database adapter health is observable through worker operational metrics and structured database error logs.', 'log', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-HOST-LIFECYCLE-LOGS', 'SYS-WORKERS-OUTBOX-HOST-LIFECYCLE', 'Outbox host lifecycle is observable through bootstrap, shutdown, and cleanup structured logs.', 'log', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-OPS-HEALTH', 'SYS-WORKERS-OUTBOX-OPS', 'Outbox operational server exposes /healthz, /readyz, and /metrics.', 'dashboard', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-OWNERSHIP-LOGS', 'SYS-WORKERS-OUTBOX-OWNERSHIP', 'Outbox ownership state is observable through ownership logs, readiness owner flags, and runtime owner metrics.', 'log', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-RUNTIME-METRICS', 'SYS-WORKERS-OUTBOX-RUNTIME', 'Outbox runtime state is observable through dvt_outbox_runtime_* readiness, state, error, and delivery metrics.', 'dashboard', true, 'implemented'),
  ('OBS-WORKERS-ROOT-HEALTH', 'SYS-WORKERS-ROOT', 'Worker root health is observable through outbox worker operational /healthz, /readyz, and /metrics surfaces.', 'dashboard', true, 'implemented')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
