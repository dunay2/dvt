-- Continue the component integrity baseline sanitization after the first
-- cleanup exposes planner and traceability package roots. This records package
-- root paths and observability facts without changing product runtime code.

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
  ('SYS-PLANNER-APPLICATION-FACADE', 'Planner application facade and envelope mapper', 'service', 'application', 'PlannerFacade', 'packages/@dvt/planner/src/application/PlannerFacade.ts', 'Planner application facade command boundary', 'node', 'high', 'review'),
  ('SYS-PLANNER-CONTRACT-PORTS', 'Planner contract port interfaces', 'port', 'contracts', 'PlannerContractPorts', 'packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts', 'Planner contract port boundary', 'node', 'high', 'review'),
  ('SYS-PLANNER-DOMAIN-GRAPH', 'Planner domain graph and selection model', 'module', 'domain', 'PlannerGraph', 'packages/@dvt/planner/src/domain/graph/GraphBuilder.ts', 'Planner graph domain boundary', 'node', 'high', 'review'),
  ('SYS-PLANNER-DOMAIN-MANIFEST-INPUT', 'Planner manifest input and envelope validation', 'module', 'domain', 'PlannerManifestInput', 'packages/@dvt/planner/src/domain/manifest.ts', 'Planner manifest and input validation boundary', 'node', 'high', 'review'),
  ('SYS-PLANNER-DOMAIN-PLAN-ASSEMBLY', 'Planner domain plan assembly and determinism', 'service', 'domain', 'PlannerDomainService', 'packages/@dvt/planner/src/domain/Planner.ts', 'Planner domain build-plan command boundary', 'node', 'high', 'review'),
  ('SYS-PLANNER-EXECUTABLE-SUBGRAPH', 'Planner executable subgraph derivation', 'module', 'application', 'ExecutableSubgraphDeriver', 'packages/@dvt/planner/src/application/ExecutableSubgraphDeriver.ts', 'Executable subgraph query boundary', 'node', 'high', 'review'),
  ('SYS-PLANNER-PACKAGE-SHELL', 'Planner package shell and public exports', 'package', 'application', 'PlannerPackageShell', 'packages/@dvt/planner/src/index.ts', 'Planner public package export boundary', 'node', 'high', 'review'),
  ('SYS-PLANNER-ROOT', 'Planner root component', 'service', 'application', 'Architecture / Planner', 'packages/@dvt/planner', 'Composite planner package, application facade, domain planner, contracts, docs, examples, and compatibility boundary.', 'node', 'high', 'review'),
  ('SYS-PLANNER-STEP-FACTORY', 'Planner step factory and registry integration', 'module', 'domain', 'PlannerStepFactory', 'packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts', 'Planner step factory boundary', 'node', 'high', 'review'),
  ('SYS-TRACEABILITY-LINEAGE-COMPILED-CODE', 'Traceability compiled-code resolution', 'module', 'application', 'CompiledCodeResolution', 'packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts', 'Compiled-code resolution policy and reader boundary', 'node', 'high', 'review'),
  ('SYS-TRACEABILITY-LINEAGE-CONTRACTS', 'Traceability lineage contracts and error vocabulary', 'module', 'contracts', 'LineageContracts', 'packages/@dvt/traceability-service/src/lineage/contracts.ts', 'Lineage published language and OpenLineage schema contract', 'node', 'high', 'review'),
  ('SYS-TRACEABILITY-LINEAGE-MAPPER', 'Traceability OpenLineage mapper and facets', 'module', 'application', 'StepStartedLineageMapper', 'packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts', 'StepStarted OpenLineage mapping boundary', 'node', 'high', 'review'),
  ('SYS-TRACEABILITY-LINEAGE-SINK-OBSERVER', 'Traceability OpenLineage sink and outbox observer', 'adapter', 'adapter', 'LineageEventSink', 'packages/@dvt/traceability-service/src/lineage/HttpOpenLineageSink.ts', 'OpenLineage outbound sink and outbox observer boundary', 'node', 'high', 'review'),
  ('SYS-TRACEABILITY-LINEAGE-WORKER-RUNTIME', 'Traceability lineage worker runtime', 'service', 'application', 'LineageWorkerRuntime', 'packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts', 'Lineage worker runtime command boundary', 'node', 'high', 'review'),
  ('SYS-TRACEABILITY-ROOT', 'Traceability root component', 'service', 'application', 'Architecture / Traceability', 'packages/@dvt/traceability-service', 'Composite traceability package, manifest validation, and lineage boundary with leaf-owned implementation files.', 'node', 'high', 'review')
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
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-PLANNER-ROOT', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-TRACEABILITY-ROOT', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = case component_id
    when 'SYS-PLANNER-ROOT' then 'packages/@dvt/planner'
    when 'SYS-TRACEABILITY-ROOT' then 'packages/@dvt/traceability-service'
    else repo_path
  end,
  updated_at = now()
where component_id in (
  'SYS-PLANNER-ROOT',
  'SYS-TRACEABILITY-ROOT'
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
  ('OBS-PLANNER-APPLICATION-FACADE-STATIC', 'SYS-PLANNER-APPLICATION-FACADE', 'Planner facade is library code; runtime telemetry is owned by callers and behavior is observable through planner tests.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-CONTRACT-PORTS-STATIC', 'SYS-PLANNER-CONTRACT-PORTS', 'Planner contract ports are static declarations; runtime telemetry is not applicable to this component.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-DOMAIN-GRAPH-STATIC', 'SYS-PLANNER-DOMAIN-GRAPH', 'Planner graph derivation is deterministic library code; runtime telemetry is owned by the execution surface.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-DOMAIN-MANIFEST-INPUT-STATIC', 'SYS-PLANNER-DOMAIN-MANIFEST-INPUT', 'Planner manifest input validation is library code validated by planner tests; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-DOMAIN-PLAN-ASSEMBLY-STATIC', 'SYS-PLANNER-DOMAIN-PLAN-ASSEMBLY', 'Planner plan assembly is deterministic library code; runtime telemetry is owned by callers and tests validate determinism.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-EXECUTABLE-SUBGRAPH-STATIC', 'SYS-PLANNER-EXECUTABLE-SUBGRAPH', 'Executable subgraph derivation is deterministic library code; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-PACKAGE-SHELL-STATIC', 'SYS-PLANNER-PACKAGE-SHELL', 'Planner package shell is a static package boundary; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-ROOT-STATIC', 'SYS-PLANNER-ROOT', 'Planner root is a package/library boundary; runtime telemetry is not applicable and health is validated through planner tests.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-STEP-FACTORY-STATIC', 'SYS-PLANNER-STEP-FACTORY', 'Planner step factory is deterministic library code; runtime telemetry is owned by executor/runtime surfaces.', 'log', true, 'not_applicable'),
  ('OBS-TRACEABILITY-LINEAGE-COMPILED-CODE-LOGS', 'SYS-TRACEABILITY-LINEAGE-COMPILED-CODE', 'Compiled-code resolution failures are observable through traceability service logs and lineage worker failure paths.', 'log', true, 'implemented'),
  ('OBS-TRACEABILITY-LINEAGE-CONTRACTS-STATIC', 'SYS-TRACEABILITY-LINEAGE-CONTRACTS', 'Traceability lineage contracts are static declarations; runtime telemetry is owned by mapper, sink, and worker runtime components.', 'log', true, 'not_applicable'),
  ('OBS-TRACEABILITY-LINEAGE-MAPPER-LOGS', 'SYS-TRACEABILITY-LINEAGE-MAPPER', 'Lineage mapper behavior is observable through traceability mapping tests and downstream lineage sink records.', 'log', true, 'implemented'),
  ('OBS-TRACEABILITY-LINEAGE-SINK-OBSERVER-LOGS', 'SYS-TRACEABILITY-LINEAGE-SINK-OBSERVER', 'Lineage sink delivery failures are observable through traceability logs and outbox observer failure handling.', 'log', true, 'implemented'),
  ('OBS-TRACEABILITY-LINEAGE-WORKER-RUNTIME-LOGS', 'SYS-TRACEABILITY-LINEAGE-WORKER-RUNTIME', 'Lineage worker runtime health is observable through worker logs, retry paths, and lineage delivery tests.', 'log', true, 'implemented'),
  ('OBS-TRACEABILITY-ROOT-LOGS', 'SYS-TRACEABILITY-ROOT', 'Traceability root health is observable through lineage service logs and package-level traceability tests.', 'log', true, 'implemented')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
