-- Split SYS-WORKERS-ROOT into worker application, adapter, runtime, ops, and
-- test leaf components. Worker surfaces are command/query/event/storage/API
-- ports, not generic rail names.

drop table if exists pg_temp.workers_root_leaf_map;

create temporary table workers_root_leaf_map (
  component_id text primary key,
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

insert into workers_root_leaf_map (
  component_id,
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
    'SYS-WORKERS-LINEAGE-HOST',
    'Lineage worker host and package',
    'service',
    'application',
    'LineageWorkerHost',
    'RunLineageWorker;ReadLineageWorkerHealth',
    'Owns lineage-worker host bootstrap, server, environment, package config, and host-level tests.',
    'Run and validate the Lineage worker host boundary without owning compiled-code resolution internals.',
    'Lineage worker bootstrap, server readiness, environment contract, package config, or host wiring changes.',
    'apps/lineage-worker/src/server.ts',
    'Lineage worker host command and health boundary',
    'hidden_authority',
    'RunLineageWorker',
    'command',
    'inbound',
    array['apps/lineage-worker/test/env.test.ts', 'apps/lineage-worker/test/server.bootstrap.test.ts']::text[],
    array['apps/lineage-worker/src/server.ts', 'apps/lineage-worker/src/bootstrap.ts']::text[],
    array['apps/lineage-worker/**']::text[],
    'TEST-SYS-WORKERS-LINEAGE-HOST',
    'apps/lineage-worker/test/server.bootstrap.test.ts',
    'pnpm --filter @dvt/lineage-worker test'
  ),
  (
    'SYS-WORKERS-LINEAGE-COMPILED-CODE-RESOLVER',
    'Lineage compiled-code resolver',
    'adapter',
    'adapter',
    'CompiledCodeResolver',
    'ResolveCompiledCodeRef;ReadCompiledCodeArtifact',
    'Owns compiled-code resolver policy, S3 URI reader adapter, error mapping, and resolver tests.',
    'Resolve compiled code references for lineage processing through explicit policy and artifact reader adapters.',
    'Compiled code ref validation, S3 artifact reader, resolver policy, error mapping, or compiled-code test changes.',
    'apps/lineage-worker/src/compiledCodeResolver.ts',
    'Compiled code resolution adapter boundary',
    'hidden_authority',
    'ResolveCompiledCodeRef',
    'query',
    'outbound',
    array['apps/lineage-worker/test/compiledCodeResolver.test.ts']::text[],
    array['apps/lineage-worker/src/compiledCodeResolver.ts']::text[],
    array[
      'apps/lineage-worker/src/compiledCodeResolver.ts',
      'apps/lineage-worker/src/compiled-code-resolver/**',
      'apps/lineage-worker/test/compiledCodeResolver.test.ts'
    ]::text[],
    'TEST-SYS-WORKERS-LINEAGE-COMPILED-CODE-RESOLVER',
    'apps/lineage-worker/test/compiledCodeResolver.test.ts',
    'pnpm --filter @dvt/lineage-worker test -- compiledCodeResolver.test.ts'
  ),
  (
    'SYS-WORKERS-OUTBOX-BUS-ADAPTERS',
    'Outbox worker event bus adapters',
    'adapter',
    'adapter',
    'OutboxEventBusAdapter',
    'PublishOutboxEvent;CreateOutboxEventBus',
    'Owns HTTP and logging event bus adapter implementations for outbox delivery.',
    'Publish outbox events through concrete bus adapters behind the worker runtime boundary.',
    'HTTP event bus delivery, logging bus behavior, event publication error handling, or bus adapter tests change.',
    'apps/outbox-worker/src/bus/HttpEventBus.ts',
    'Outbox event bus adapter boundary',
    'published_language',
    'PublishOutboxEvent',
    'event',
    'outbound',
    array['apps/outbox-worker/test/bus/HttpEventBus.test.ts']::text[],
    array['apps/outbox-worker/src/bus/HttpEventBus.ts', 'apps/outbox-worker/src/bus/LoggingEventBus.ts']::text[],
    array['apps/outbox-worker/src/bus/**', 'apps/outbox-worker/test/bus/**']::text[],
    'TEST-SYS-WORKERS-OUTBOX-BUS-ADAPTERS',
    'apps/outbox-worker/test/bus/HttpEventBus.test.ts',
    'pnpm --filter @dvt/outbox-worker test -- bus/HttpEventBus.test.ts'
  ),
  (
    'SYS-WORKERS-OUTBOX-DB-ADAPTER',
    'Outbox worker database adapter',
    'adapter',
    'adapter',
    'OutboxWorkerDatabaseAdapter',
    'AcquireOutboxDbPool;ValidateOutboxDbPool',
    'Owns the outbox worker database pool adapter and pool tests.',
    'Provide database connectivity for outbox worker runtime and ownership gates.',
    'Database pool config, connection lifecycle, tenant/shard query plumbing, or pool test changes.',
    'apps/outbox-worker/src/db/pool.ts',
    'Outbox worker database adapter boundary',
    'hidden_authority',
    'AcquireOutboxDbPool',
    'storage',
    'outbound',
    array['apps/outbox-worker/test/db/pool.test.ts']::text[],
    array['apps/outbox-worker/src/db/pool.ts']::text[],
    array['apps/outbox-worker/src/db/**', 'apps/outbox-worker/test/db/**']::text[],
    'TEST-SYS-WORKERS-OUTBOX-DB-ADAPTER',
    'apps/outbox-worker/test/db/pool.test.ts',
    'pnpm --filter @dvt/outbox-worker test -- db/pool.test.ts'
  ),
  (
    'SYS-WORKERS-OUTBOX-HOST-LIFECYCLE',
    'Outbox worker host lifecycle',
    'service',
    'application',
    'OutboxWorkerHost',
    'RunOutboxWorkerHost;StopOutboxWorkerRuntime',
    'Owns outbox worker package config, host startup, server entrypoint, plugin env, and lifecycle stop coordination.',
    'Run the outbox worker process and coordinate host/runtime/ops shutdown boundaries.',
    'Worker host startup, package config, env plugin, server entrypoint, or shutdown lifecycle changes.',
    'apps/outbox-worker/src/host/runOutboxWorkerHost.ts',
    'Outbox worker host lifecycle boundary',
    'hidden_authority',
    'RunOutboxWorkerHost',
    'command',
    'inbound',
    array[
      'apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts',
      'apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts',
      'apps/outbox-worker/test/plugins/env.test.ts'
    ]::text[],
    array['apps/outbox-worker/src/host/runOutboxWorkerHost.ts', 'apps/outbox-worker/src/server.ts']::text[],
    array[
      'apps/outbox-worker/.dependency-cruiser.cjs',
      'apps/outbox-worker/.env.example',
      'apps/outbox-worker/.gitignore',
      'apps/outbox-worker/package.json',
      'apps/outbox-worker/README.md',
      'apps/outbox-worker/src/host/**',
      'apps/outbox-worker/src/lifecycle/**',
      'apps/outbox-worker/src/plugins/**',
      'apps/outbox-worker/src/server.ts',
      'apps/outbox-worker/tsconfig.json',
      'apps/outbox-worker/vitest.config.ts'
    ]::text[],
    'TEST-SYS-WORKERS-OUTBOX-HOST-LIFECYCLE',
    'apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts',
    'pnpm --filter @dvt/outbox-worker test -- host/runOutboxWorkerHost.test.ts lifecycle/stopRuntimeAndOperationalServer.test.ts plugins/env.test.ts'
  ),
  (
    'SYS-WORKERS-OUTBOX-OPS',
    'Outbox worker operational monitor',
    'service',
    'application',
    'OutboxWorkerOperationalMonitor',
    'ReadOutboxWorkerHealth;ReadOutboxWorkerMetrics',
    'Owns operational server, monitor, telemetry, metrics rendering, runtime health, and ready-staleness logic.',
    'Expose outbox worker operational health and metrics through an explicit operational query/API boundary.',
    'Operational endpoint, telemetry model, health tracking, metric rendering, or ready-staleness changes.',
    'apps/outbox-worker/src/ops/OperationalServer.ts',
    'Outbox worker operational API boundary',
    'published_language',
    'ReadOutboxWorkerHealth',
    'api',
    'inbound',
    array['apps/outbox-worker/test/ops/OperationalServer.test.ts', 'apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts']::text[],
    array['apps/outbox-worker/src/ops/OperationalServer.ts', 'apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts']::text[],
    array['apps/outbox-worker/src/ops/**', 'apps/outbox-worker/test/ops/**']::text[],
    'TEST-SYS-WORKERS-OUTBOX-OPS',
    'apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts',
    'pnpm --filter @dvt/outbox-worker test -- ops/OperationalServer.test.ts ops/OutboxWorkerMonitor.test.ts ops/resolveReadyStaleAfterMs.test.ts'
  ),
  (
    'SYS-WORKERS-OUTBOX-OWNERSHIP',
    'Outbox worker shard ownership gate',
    'service',
    'application',
    'OutboxShardOwnershipGate',
    'AcquireOutboxShardOwnership;ValidateOutboxShardOwnership',
    'Owns PostgreSQL shard ownership gate and ownership tests for outbox worker sharding.',
    'Fence concurrent outbox workers through shard ownership acquisition and validation.',
    'Shard ownership gate, fencing semantics, concurrency behavior, or ownership tests change.',
    'apps/outbox-worker/src/ownership/PgShardOwnershipGate.ts',
    'Outbox shard ownership boundary',
    'hidden_authority',
    'AcquireOutboxShardOwnership',
    'command',
    'outbound',
    array[
      'apps/outbox-worker/test/ownership/PgShardOwnershipGate.test.ts',
      'apps/outbox-worker/test/ownership/PgShardOwnershipGate.integration.test.ts'
    ]::text[],
    array['apps/outbox-worker/src/ownership/PgShardOwnershipGate.ts']::text[],
    array['apps/outbox-worker/src/ownership/**', 'apps/outbox-worker/test/ownership/**', 'apps/outbox-worker/test/sharding/**']::text[],
    'TEST-SYS-WORKERS-OUTBOX-OWNERSHIP',
    'apps/outbox-worker/test/ownership/PgShardOwnershipGate.test.ts',
    'pnpm --filter @dvt/outbox-worker test -- ownership/PgShardOwnershipGate.test.ts sharding/concurrentWorkerOrdering.test.ts'
  ),
  (
    'SYS-WORKERS-OUTBOX-RUNTIME',
    'Outbox worker delivery and retention runtime',
    'service',
    'application',
    'OutboxWorkerRuntime',
    'RunOutboxDeliveryLoop;RunDeliveryBufferPurge;RunRunEventRetention',
    'Owns outbox delivery runtime, delivery buffer purge runtime, run-event retention runtime, runtime builders, and runtime resource lifecycle.',
    'Execute outbox delivery, purge, and retention loops behind explicit worker runtime commands.',
    'Delivery ordering, retry/dead-letter behavior, retention, purge, runtime lifecycle, or runtime test changes.',
    'apps/outbox-worker/src/runtime/OutboxWorkerRuntime.ts',
    'Outbox delivery and retention runtime boundary',
    'evolutionary_architecture',
    'RunOutboxDeliveryLoop',
    'command',
    'inbound',
    array[
      'apps/outbox-worker/test/runtime/OutboxWorkerRuntime.failure.test.ts',
      'apps/outbox-worker/test/runtime/OutboxWorkerRuntime.lifecycle.test.ts',
      'apps/outbox-worker/test/runtime/OutboxWorkerRuntime.ordering.test.ts'
    ]::text[],
    array['apps/outbox-worker/src/runtime/OutboxWorkerRuntime.ts', 'apps/outbox-worker/src/runtime/RunEventRetentionRuntime.ts']::text[],
    array['apps/outbox-worker/src/runtime/**', 'apps/outbox-worker/test/runtime/**', 'apps/outbox-worker/test/integration/**']::text[],
    'TEST-SYS-WORKERS-OUTBOX-RUNTIME',
    'apps/outbox-worker/test/runtime/OutboxWorkerRuntime.lifecycle.test.ts',
    'pnpm --filter @dvt/outbox-worker test -- runtime/OutboxWorkerRuntime.lifecycle.test.ts runtime/OutboxWorkerRuntime.ordering.test.ts runtime/RunEventRetentionRuntime.test.ts'
  ),
  (
    'SYS-WORKERS-OUTBOX-CANARY-TESTS',
    'Outbox worker standalone canary tests',
    'module',
    'application',
    'OutboxWorkerCanaryEvidence',
    'ValidateOutboxWorkerCanaryHealth;ValidateOutboxWorkerCanaryOrdering',
    'Owns outbox worker standalone canary acceptance tests and support fixtures.',
    'Keep standalone canary evidence distinct from unit/runtime tests and active worker runtime code.',
    'Standalone canary host support, HTTP sink, fixture, health, idempotency, or ordering acceptance changes.',
    'apps/outbox-worker/test/canary/standaloneCanaryAcceptance.health.test.ts',
    'Outbox worker standalone canary evidence boundary',
    'published_language',
    'ValidateOutboxWorkerCanaryHealth',
    'query',
    'inbound',
    array[
      'apps/outbox-worker/test/canary/standaloneCanaryAcceptance.health.test.ts',
      'apps/outbox-worker/test/canary/standaloneCanaryAcceptance.idempotency.test.ts',
      'apps/outbox-worker/test/canary/standaloneCanaryAcceptance.ordering.test.ts'
    ]::text[],
    array['apps/outbox-worker/test/canary/standaloneCanaryAcceptance.health.test.ts']::text[],
    array['apps/outbox-worker/test/canary/**']::text[],
    'TEST-SYS-WORKERS-OUTBOX-CANARY-TESTS',
    'apps/outbox-worker/test/canary/standaloneCanaryAcceptance.health.test.ts',
    'pnpm --filter @dvt/outbox-worker test -- canary/standaloneCanaryAcceptance.health.test.ts canary/standaloneCanaryAcceptance.idempotency.test.ts canary/standaloneCanaryAcceptance.ordering.test.ts'
  ),
  (
    'SYS-WORKERS-PROJECTOR-APP',
    'Projector worker application',
    'service',
    'application',
    'ProjectorWorkerApp',
    'RunProjectorWorker;ReadProjectorWorkerConfig',
    'Owns the projector-worker package, server, environment, tests, and local test config.',
    'Run projector worker process and validate its environment/config boundary.',
    'Projector worker server, environment, package config, or worker test config changes.',
    'apps/projector-worker/src/server.ts',
    'Projector worker application boundary',
    'hidden_authority',
    'RunProjectorWorker',
    'command',
    'inbound',
    array['apps/projector-worker/test/env.test.ts']::text[],
    array['apps/projector-worker/src/server.ts', 'apps/projector-worker/src/env.ts']::text[],
    array['apps/projector-worker/**']::text[],
    'TEST-SYS-WORKERS-PROJECTOR-APP',
    'apps/projector-worker/test/env.test.ts',
    'pnpm --filter @dvt/projector-worker test'
  ),
  (
    'SYS-WORKERS-TEMPORAL-APP',
    'Temporal worker application',
    'service',
    'application',
    'TemporalWorkerApp',
    'RunTemporalWorkerHost;ReadTemporalWorkerHealth',
    'Owns temporal-worker host, runtime profile, ops monitor, plugins, package config, and tests.',
    'Run Temporal worker host and expose operational health while keeping Temporal adapter semantics behind worker ports.',
    'Temporal worker host, runtime resource, profile, ops server, env plugin, package config, or worker tests change.',
    'apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts',
    'Temporal worker application boundary',
    'hidden_authority',
    'RunTemporalWorkerHost',
    'command',
    'inbound',
    array['apps/temporal-worker/test/host/runTemporalWorkerHost.test.ts', 'apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts']::text[],
    array['apps/temporal-worker/src/host/runTemporalWorkerHost.ts', 'apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts']::text[],
    array['apps/temporal-worker/**']::text[],
    'TEST-SYS-WORKERS-TEMPORAL-APP',
    'apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts',
    'pnpm --filter @dvt/temporal-worker test'
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
  'PLANNING-DB-WORKERS-ROOT-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Workers root leaf component mapping',
  'Architecture / Planning DB / Workers',
  'review',
  'SYS-WORKERS-ROOT directly owned Lineage, Outbox, Projector, and Temporal worker files. This design maps host, runtime, adapter, ops, ownership, canary, and application responsibilities to explicit leaf components with command/query/event/storage/API ports.',
  'responsibility_overload',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitecturePort;RecordArchitectureTestEvidence;ValidateComponentIntegrity',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
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
select
  component_id,
  'planning_query_store.governance_component_local_definitions',
  '1411411411411411411411411411411411411411411411411411411411411411',
  0,
  name,
  'component',
  'SYS-WORKERS-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from workers_root_leaf_map
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
from workers_root_leaf_map
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
  from workers_root_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from workers_root_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Worker files claimed by this leaf must not fall through to SYS-WORKERS-ROOT.',
    0
  from workers_root_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows no direct files owned by SYS-WORKERS-ROOT and worker tests remain green.',
    0
  from workers_root_leaf_map
  union all
  select
    component_id,
    'consumer',
    'Runtime hosts, operational monitors, event buses, database adapters, and worker CI suites',
    0
  from workers_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    0
  from workers_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    1
  from workers_root_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from workers_root_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from workers_root_leaf_map
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
values (
  'SYS-WORKERS-ROOT',
  'Worker root component',
  'service',
  'application',
  'Architecture / Workers',
  'apps/outbox-worker/src/runtime/OutboxWorkerRuntime.ts',
  'Composite worker boundary with leaf-owned hosts, runtimes, adapters, ops, and tests.',
  'node',
  'high',
  'review',
  null
)
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
  case when component_id like 'SYS-WORKERS-OUTBOX-%' then 'high' else 'medium' end,
  'review',
  'SYS-WORKERS-ROOT'
from workers_root_leaf_map
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
from workers_root_leaf_map
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
from workers_root_leaf_map
union all
select
  'RESP-SYS-WORKERS-ROOT',
  'SYS-WORKERS-ROOT',
  'Own the composite worker boundary and delegate concrete worker app, runtime, adapter, ops, ownership, and test files to child components.',
  'Worker topology, runtime ownership, worker app package structure, or Planning DB component-map changes.',
  'WorkersRoot',
  'implemented'
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
  'REL-WORKERS-ROOT-CONTAINS-' || replace(component_id, 'SYS-WORKERS-', ''),
  'SYS-WORKERS-ROOT',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this worker leaf is remapped without a governed Planning DB component update.',
  'repo-local worker governance',
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from workers_root_leaf_map
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
from workers_root_leaf_map
union all
select
  'TEST-SYS-WORKERS-ROOT-COMPONENT-PROFILE',
  'SYS-WORKERS-ROOT',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-WORKERS-ROOT --no-refresh --limit 120 && pnpm planning:db:query component-drift --component SYS-WORKERS-ROOT --no-refresh --limit 80'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.workers_root_leaf_map;
