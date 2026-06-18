-- Continue the component integrity baseline sanitization after the first
-- cleanup exposes planner and traceability package roots. This records package
-- root paths and observability facts without changing product runtime code.

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
