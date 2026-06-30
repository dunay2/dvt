-- Split the runtime state-store package into semantic leaves.
-- The files are active and tested; this migration creates component ownership
-- instead of deprecating or deleting any package source.

drop table if exists pg_temp.runtime_state_store_leaf_map;

create temporary table runtime_state_store_leaf_map (
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
  runtime text not null,
  fowler_signal text not null,
  public_api text[] not null,
  ports text[] not null,
  storage_reads text[] not null,
  storage_writes text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null
);

insert into runtime_state_store_leaf_map (
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
  runtime,
  fowler_signal,
  public_api,
  ports,
  storage_reads,
  storage_writes,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command
)
values
  (
    'SYS-RUNTIME-STATE-STORE-PACKAGE-SHELL',
    'State-store package shell and public exports',
    'package',
    'application',
    'RuntimeStateStorePackageApi',
    'PublishRuntimeStateStoreLifecycleApi',
    'Owns the @dvt/state-store package metadata, public export barrel, and package validation configuration.',
    'Expose runtime state-store lifecycle APIs without making package metadata own lifecycle behavior.',
    'State-store public exports, package build/test entrypoints, or package-level dependency posture changes.',
    'The package shell exports already-owned lifecycle ports and must not hide concrete file ownership inside the aggregate.',
    'review -> implemented once all package source files resolve to semantic leaves and package tests pass.',
    'Runtime package consumers importing @dvt/state-store.',
    'packages/@dvt/state-store/package.json',
    'medium',
    62,
    '@dvt/state-store package export surface.',
    'node',
    'responsibility_overload',
    array['@dvt/state-store', 'pnpm --filter @dvt/state-store build', 'pnpm --filter @dvt/state-store test']::text[],
    array['PublishRuntimeStateStoreLifecycleApi']::text[],
    array['packages/@dvt/state-store/src/**']::text[],
    array['packages/@dvt/state-store/dist/**']::text[],
    array[
      'packages/@dvt/state-store/package.json',
      'packages/@dvt/state-store/src/index.ts',
      'packages/@dvt/state-store/tsconfig.json',
      'packages/@dvt/state-store/vitest.config.ts'
    ]::text[],
    array['packages/@dvt/state-store/test/command-port.test.ts']::text[],
    'unit',
    'boundary',
    'pnpm --filter @dvt/state-store test'
  ),
  (
    'SYS-RUNTIME-STATE-STORE-COMMAND-PORT',
    'State-store command port and in-memory adapter',
    'port',
    'application',
    'RunStateCommandPort',
    'BootstrapRunState;AppendRunTransitions',
    'Owns the state-store command port type alias and its in-memory implementation for local execution and tests.',
    'Provide run bootstrap and transition append semantics behind a testable state-store command port.',
    'Run bootstrap command shape, append idempotency, in-memory adapter behavior, or command-port test changes.',
    'Append idempotency and run existence checks must match the engine state-store command contract.',
    'review -> implemented once command-port tests prove duplicate and missing-run behavior.',
    'Engine runtime tests, local development, and state-store package consumers.',
    'packages/@dvt/state-store/src/inMemoryRunStateCommandPort.ts',
    'high',
    72,
    'RunStateCommandPort command boundary.',
    'node',
    'ports_and_adapters',
    array['RunStateCommandPort', 'InMemoryRunStateCommandPort']::text[],
    array['BootstrapRunState', 'AppendRunTransitions']::text[],
    array['in-memory run metadata', 'in-memory run events', 'idempotencyByRun']::text[],
    array['in-memory run metadata', 'in-memory run events', 'idempotencyByRun']::text[],
    array[
      'packages/@dvt/state-store/src/types.ts',
      'packages/@dvt/state-store/src/inMemoryRunStateCommandPort.ts',
      'packages/@dvt/state-store/test/command-port.test.ts'
    ]::text[],
    array['packages/@dvt/state-store/test/command-port.test.ts']::text[],
    'unit',
    'behavior',
    'pnpm --filter @dvt/state-store test -- command-port.test.ts'
  ),
  (
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-UNIT-POLICY',
    'Run-event archive unit policy',
    'module',
    'application',
    'RunEventArchiveUnitPolicy',
    'DeriveRunEventArchiveUnit;ValidateRunEventRetentionPolicy',
    'Owns archive unit keys, tenant buckets, delete-after calculation, and retention policy validation.',
    'Derive deterministic archive units from tenant and persisted-day facts for run-event lifecycle work.',
    'Archive unit key shape, tenant bucket derivation, delete eligibility, or retention override policy changes.',
    'Archive units must remain deterministic by tenant bucket and persisted day as required by ADR-0037.',
    'review -> implemented once archive lifecycle and retention policy tests pass.',
    'Archive coordinator, archive store adapters, and state operations.',
    'packages/@dvt/state-store/src/archiveLifecycle.ts',
    'high',
    74,
    'Run-event archive unit and retention policy functions.',
    'node',
    'policy_boundary',
    array['deriveTenantBucket', 'buildArchiveUnitKey', 'parseArchiveUnitKey', 'calculateDeleteAfterIso', 'validateRunEventRetentionPolicy']::text[],
    array['DeriveRunEventArchiveUnit', 'ValidateRunEventRetentionPolicy']::text[],
    array['tenantId', 'archiveBucketCount', 'persistedAtDay', 'tenantHotRetentionDays']::text[],
    array['archiveUnitKey', 'deleteAfterIso']::text[],
    array[
      'packages/@dvt/state-store/src/archiveLifecycle.ts',
      'packages/@dvt/state-store/test/archiveLifecycle.test.ts',
      'packages/@dvt/state-store/test/RunEventRetentionPolicy.test.ts'
    ]::text[],
    array[
      'packages/@dvt/state-store/test/archiveLifecycle.test.ts',
      'packages/@dvt/state-store/test/RunEventRetentionPolicy.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/state-store test -- archiveLifecycle.test.ts RunEventRetentionPolicy.test.ts'
  ),
  (
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-RUNTIME-CONTRACTS',
    'Run archive runtime ports and telemetry contracts',
    'port',
    'application',
    'RunArchiveRuntimePorts',
    'ReadRunArchiveRuntimePorts;CreateArchiveLifecycleTelemetry',
    'Owns run archive runtime interfaces, telemetry contracts, failure normalization, and archived snapshot assembly.',
    'Define the ports used by archive export, verification, restore, delete, object storage, and telemetry.',
    'Archive runtime interface, telemetry, restore/delete contract, or archived snapshot assembly changes.',
    'Archive lifecycle ports must keep engine semantics separate from storage lifecycle operations.',
    'review -> implemented once archive runtime tests cover port helpers and snapshot assembly.',
    'Archive coordinators, object-store exporters, restore/delete operations, and adapter implementations.',
    'packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts',
    'high',
    76,
    'Run archive runtime port and telemetry type boundary.',
    'node',
    'ports_and_adapters',
    array['IRunArchiveStore', 'IRunArchiveExporter', 'IArchiveObjectStore', 'IRunArchiveRestoreStore', 'IRunArchiveDeleteStore', 'IArchiveLeaseStore', 'ArchiveLifecycleTelemetry']::text[],
    array['ReadRunArchiveRuntimePorts', 'CreateArchiveLifecycleTelemetry']::text[],
    array['run_events', 'run_snapshots', 'archive catalog', 'archive object store']::text[],
    array['archive batch records', 'restore logs', 'telemetry metrics']::text[],
    array[
      'packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts',
      'packages/@dvt/state-store/test/archiveRuntime.test.ts'
    ]::text[],
    array['packages/@dvt/state-store/test/archiveRuntime.test.ts']::text[],
    'unit',
    'boundary',
    'pnpm --filter @dvt/state-store test -- archiveRuntime.test.ts'
  ),
  (
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-ARTIFACTS',
    'Run archive artifact and checksum builder',
    'module',
    'application',
    'ArchiveArtifactBuilder',
    'BuildRunArchiveManifest;BuildPinnedTerminalSnapshot',
    'Owns deterministic archive manifests, rolling event checksums, and terminal snapshot pinning artifacts.',
    'Build verifiable cold archive artifacts and pinned terminal snapshots from authoritative run events.',
    'Archive manifest shape, checksum rule, terminal snapshot pinning, or redaction-adjacent artifact changes.',
    'Archive artifacts must use deterministic canonical JSON and SHA-256 checksum semantics.',
    'review -> implemented once artifact tests prove manifest, checksum, and terminal snapshot guards.',
    'Object storage exporter, archive coordinator, verifier, and restore operations.',
    'packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts',
    'high',
    78,
    'Archive manifest, checksum, and terminal snapshot artifact surface.',
    'node',
    'event_sourcing',
    array['buildArchiveUnitManifest', 'calculateArchiveEventChecksum', 'buildPinnedTerminalSnapshot', 'buildArchivedTerminalSnapshot']::text[],
    array['BuildRunArchiveManifest', 'BuildPinnedTerminalSnapshot']::text[],
    array['EventEnvelope[]', 'WorkflowSnapshot', 'archiveUnitKey']::text[],
    array['ArchiveUnitManifest', 'PinnedTerminalSnapshot', 'ArchivedTerminalSnapshot']::text[],
    array[
      'packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts',
      'packages/@dvt/state-store/test/archiveArtifacts.test.ts'
    ]::text[],
    array['packages/@dvt/state-store/test/archiveArtifacts.test.ts']::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/state-store test -- archiveArtifacts.test.ts'
  ),
  (
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-OBJECT-STORAGE',
    'Run archive object-storage exporter and adapters',
    'adapter',
    'adapter',
    'ArchiveObjectStorageAdapter',
    'ExportRunArchiveUnit;VerifyRunArchiveUnitObject;StoreRunArchiveObject',
    'Owns object-storage archive export, verification, local file adapter, and S3 adapter surfaces.',
    'Move archive unit payloads, manifests, and checksums to cold object storage with verification.',
    'Archive export format, object key policy, S3/file adapter behavior, or cold payload redaction changes.',
    'Partial archive objects must fail closed and production must not use file:// object storage.',
    'review -> implemented once object-storage exporter, file adapter, and S3 adapter tests pass.',
    'Archive coordinator, verifier, restore operations, and state-store operators.',
    'packages/@dvt/state-store/src/lifecycle/ObjectStorageRunArchiveExporter.ts',
    'high',
    80,
    'IRunArchiveExporter and IArchiveObjectStore adapter implementations.',
    'node',
    'ports_and_adapters',
    array['ObjectStorageRunArchiveExporter', 'FileSystemArchiveObjectStore', 'S3ArchiveObjectStore']::text[],
    array['ExportRunArchiveUnit', 'VerifyRunArchiveUnitObject', 'StoreRunArchiveObject']::text[],
    array['run_events', 'archive object store', 's3 bucket', 'local archive directory']::text[],
    array['archive jsonl object', 'manifest object', 'checksum object']::text[],
    array[
      'packages/@dvt/state-store/src/lifecycle/ObjectStorageRunArchiveExporter.ts',
      'packages/@dvt/state-store/src/lifecycle/adapters/FileSystemArchiveObjectStore.ts',
      'packages/@dvt/state-store/src/lifecycle/adapters/S3ArchiveObjectStore.ts',
      'packages/@dvt/state-store/test/ObjectStorageRunArchiveExporter.test.ts',
      'packages/@dvt/state-store/test/FileSystemArchiveObjectStore.test.ts',
      'packages/@dvt/state-store/test/S3ArchiveObjectStore.test.ts'
    ]::text[],
    array[
      'packages/@dvt/state-store/test/ObjectStorageRunArchiveExporter.test.ts',
      'packages/@dvt/state-store/test/FileSystemArchiveObjectStore.test.ts',
      'packages/@dvt/state-store/test/S3ArchiveObjectStore.test.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter @dvt/state-store test -- ObjectStorageRunArchiveExporter.test.ts FileSystemArchiveObjectStore.test.ts S3ArchiveObjectStore.test.ts'
  ),
  (
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-ORCHESTRATION',
    'Run archive export and verification orchestration',
    'service',
    'application',
    'RunArchiveLifecycleOrchestrator',
    'ExportEligibleRunArchiveUnits;VerifyExportedRunArchiveUnits',
    'Owns archive export orchestration, terminal snapshot pinning, verification, failure recording, and archive telemetry.',
    'Coordinate eligible hot run-event export and verification without moving lifecycle semantics into engine core.',
    'Archive coordinator flow, verification flow, terminal snapshot pinning orchestration, or telemetry changes.',
    'Export and verification must be explicit archive state transitions and must record failures instead of deleting hot data.',
    'review -> implemented once coordinator and lifecycle integration tests pass.',
    'State operations workers, archive stores, object-storage exporters, and observability.',
    'packages/@dvt/state-store/src/lifecycle/RunArchiveCoordinator.ts',
    'high',
    82,
    'Run archive coordinator and verifier command services.',
    'node',
    'workflow_orchestration',
    array['RunArchiveCoordinator', 'RunArchiveVerifier']::text[],
    array['ExportEligibleRunArchiveUnits', 'VerifyExportedRunArchiveUnits']::text[],
    array['eligible archive units', 'archive batch catalog', 'run_events', 'terminal snapshots', 'archive object store']::text[],
    array['archive batch exported state', 'archive batch verified state', 'pinned terminal snapshots', 'archive telemetry']::text[],
    array[
      'packages/@dvt/state-store/src/lifecycle/RunArchiveCoordinator.ts',
      'packages/@dvt/state-store/src/lifecycle/RunArchiveVerifier.ts',
      'packages/@dvt/state-store/test/RunArchiveCoordinator.test.ts',
      'packages/@dvt/state-store/test/RunArchiveLifecycleIntegration.test.ts'
    ]::text[],
    array[
      'packages/@dvt/state-store/test/RunArchiveCoordinator.test.ts',
      'packages/@dvt/state-store/test/RunArchiveLifecycleIntegration.test.ts'
    ]::text[],
    'integration',
    'flow',
    'pnpm --filter @dvt/state-store test -- RunArchiveCoordinator.test.ts RunArchiveLifecycleIntegration.test.ts'
  ),
  (
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-RESTORE-DELETE',
    'Run archive restore and hot-delete lifecycle',
    'service',
    'application',
    'RunArchiveRestoreAndDeleteLifecycle',
    'RestoreArchivedRunEvents;MarkRunArchiveDeleteEligible;DropVerifiedRunArchiveUnit',
    'Owns audited archive restore and grace-window hot archive-unit deletion.',
    'Restore archived run events into explicit targets and drop verified hot archive units only after grace and lease checks.',
    'Archive restore, hot deletion, lease fencing, restore audit, or delete grace policy changes.',
    'Restore must be explicit and audited; hot deletion must require verified archive state and a held lease.',
    'review -> implemented once restorer and deleter tests prove failure and lease behavior.',
    'State operations, incident recovery, audit, and storage lifecycle workers.',
    'packages/@dvt/state-store/src/lifecycle/RunArchiveRestorer.ts',
    'high',
    80,
    'Archive restore and hot-delete command services.',
    'node',
    'transaction_script',
    array['RunArchiveRestorer', 'RunArchiveDeleter']::text[],
    array['RestoreArchivedRunEvents', 'MarkRunArchiveDeleteEligible', 'DropVerifiedRunArchiveUnit']::text[],
    array['archive object store', 'archive catalog', 'lease store', 'delete-eligible archive units']::text[],
    array['restore log', 'target restore schema', 'archive batch dropped state', 'hot archive-unit deletes']::text[],
    array[
      'packages/@dvt/state-store/src/lifecycle/RunArchiveRestorer.ts',
      'packages/@dvt/state-store/src/lifecycle/RunArchiveDeleter.ts',
      'packages/@dvt/state-store/test/RunArchiveRestorer.test.ts',
      'packages/@dvt/state-store/test/RunArchiveDeleter.test.ts'
    ]::text[],
    array[
      'packages/@dvt/state-store/test/RunArchiveRestorer.test.ts',
      'packages/@dvt/state-store/test/RunArchiveDeleter.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/state-store test -- RunArchiveRestorer.test.ts RunArchiveDeleter.test.ts'
  ),
  (
    'SYS-RUNTIME-STATE-STORE-DELIVERY-BUFFER-PURGE',
    'Delivery buffer retention and purge lifecycle',
    'service',
    'application',
    'DeliveryBufferRetentionPolicy',
    'PurgeDeliveredOutboxRows;PurgeDeadLetterRows',
    'Owns retention policy and purge orchestration for non-authoritative delivery buffers.',
    'Purge delivered outbox and dead-letter rows without treating delivery buffers as run-event history.',
    'Delivery buffer retention, purge limits, telemetry, fail-soft purge behavior, or buffer store contract changes.',
    'Delivery buffers are operational machinery and must not govern authoritative run_events lifecycle.',
    'review -> implemented once delivery-buffer purge tests prove fail-soft retention behavior.',
    'Outbox operations, lineage delivery operations, and state-store lifecycle workers.',
    'packages/@dvt/state-store/src/lifecycle/DeliveryBufferPurger.ts',
    'high',
    78,
    'Delivery buffer purge policy and command service.',
    'node',
    'policy_boundary',
    array['DeliveryBufferPurger', 'DeliveryBufferRetentionPolicy', 'IDeliveryBufferPurgeStore']::text[],
    array['PurgeDeliveredOutboxRows', 'PurgeDeadLetterRows']::text[],
    array['outbox', 'outbox_dead_letter', 'lineage_dead_letter']::text[],
    array['outbox', 'outbox_dead_letter', 'lineage_dead_letter', 'purge telemetry']::text[],
    array[
      'packages/@dvt/state-store/src/lifecycle/deliveryBufferRuntime.ts',
      'packages/@dvt/state-store/src/lifecycle/DeliveryBufferPurger.ts',
      'packages/@dvt/state-store/test/DeliveryBufferPurger.test.ts'
    ]::text[],
    array['packages/@dvt/state-store/test/DeliveryBufferPurger.test.ts']::text[],
    'unit',
    'behavior',
    'pnpm --filter @dvt/state-store test -- DeliveryBufferPurger.test.ts'
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
  'PLANNING-DB-RUNTIME-STATE-STORE-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB runtime state-store leaf component mapping',
  'Architecture / Runtime / Planning DB',
  'review',
  'SYS-RUNTIME-STATE-STORE still owned every state-store package file directly, so component-profile could not answer which files form command ports, archive policy, archive object-store adapters, restore/delete lifecycle, or delivery-buffer purge. This split maps the active package files into semantic leaves without creating a side inventory or deprecating functional code.',
  'responsibility_overload',
  'RecordArchitectureComponent;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
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
  'PLANNING-DB-RUNTIME-STATE-STORE-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text as subject_kind, 'SYS-RUNTIME-STATE-STORE'::text as subject_id, 'may_update'::text as scope_kind
  union all
  select 'path', 'packages/@dvt/state-store', 'may_update'
  union all
  select 'path', 'docs/adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md', 'may_reference'
  union all
  select 'path', 'docs/adr/ADR-0038-delivery-buffer-retention-and-purge-policy.md', 'may_reference'
  union all
  select 'component', component_id, 'may_create' from runtime_state_store_leaf_map
  union all
  select 'path', path, 'may_update'
  from runtime_state_store_leaf_map
  cross join lateral unnest(owns) as owned(path)
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
  'SYS-RUNTIME-STATE-STORE',
  'tools/planning-db/migrations/182_runtime_state_store_leaf_components.sql',
  md5('SYS-RUNTIME-STATE-STORE:182') || md5('runtime-state-store-parent:182'),
  0,
  'Runtime state-store lifecycle',
  'component',
  'SYS-RUNTIME-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate runtime state-store package boundary while concrete package files resolve to state-store leaves.',
  'Architecture / State / Operations',
  'WriteRuntimeStateStore;ReadRuntimeStateStoreLifecycle',
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
  'tools/planning-db/migrations/182_runtime_state_store_leaf_components.sql',
  md5(component_id || ':182') || md5(name || ':runtime-state-store-leaf:182'),
  0,
  name,
  'component',
  'SYS-RUNTIME-STATE-STORE',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from runtime_state_store_leaf_map
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
from runtime_state_store_leaf_map
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
  from runtime_state_store_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from runtime_state_store_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from runtime_state_store_leaf_map
  union all
  select component_id, 'transition', transition, 0
  from runtime_state_store_leaf_map
  union all
  select component_id, 'consumer', consumer, 0
  from runtime_state_store_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md', 0
  from runtime_state_store_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/adr/ADR-0038-delivery-buffer-retention-and-purge-policy.md', 1
  from runtime_state_store_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 2
  from runtime_state_store_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 3
  from runtime_state_store_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from runtime_state_store_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from runtime_state_store_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
  union all
  select
    component_id,
    'non_goal',
    'These files are active state-store package code; this migration maps component ownership and does not deprecate functional source.',
    0
  from runtime_state_store_leaf_map
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
    'SYS-RUNTIME-STATE-STORE',
    'responsibility',
    'Own runtime state-store package lifecycle and delegate concrete files to command-port, archive, object-storage, restore/delete, and delivery-buffer leaves.',
    0
  ),
  (
    'SYS-RUNTIME-STATE-STORE',
    'reason_to_change',
    'State-store package topology, lifecycle boundaries, or file ownership changes.',
    0
  ),
  (
    'SYS-RUNTIME-STATE-STORE',
    'public_api',
    '@dvt/state-store',
    0
  ),
  (
    'SYS-RUNTIME-STATE-STORE',
    'invariant',
    'Concrete package files must be owned by semantic leaves.',
    0
  ),
  (
    'SYS-RUNTIME-STATE-STORE',
    'transition',
    'review -> implemented once state-store component-quality has no file_without_leaf_component finding.',
    0
  ),
  (
    'SYS-RUNTIME-STATE-STORE',
    'consumer',
    'Engine runtime, adapters, workers, and state operations.',
    0
  ),
  (
    'SYS-RUNTIME-STATE-STORE',
    'governance_ref',
    'docs/adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md',
    0
  ),
  (
    'SYS-RUNTIME-STATE-STORE',
    'governance_ref',
    'docs/adr/ADR-0038-delivery-buffer-retention-and-purge-policy.md',
    1
  ),
  (
    'SYS-RUNTIME-STATE-STORE',
    'fowler_signal',
    'responsibility_overload',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'package',
  layer = 'application',
  owner = 'Architecture / State / Operations',
  repo_path = 'packages/@dvt/state-store',
  public_contract = 'Aggregate @dvt/state-store runtime lifecycle package boundary; concrete files are owned by semantic state-store leaves.',
  runtime = 'node',
  criticality = 'high',
  status = 'review',
  maturity_score = 70,
  parent_component_id = 'SYS-RUNTIME-ROOT',
  updated_at = now()
where component_id = 'SYS-RUNTIME-STATE-STORE';

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
  runtime,
  criticality,
  'review',
  maturity_score,
  'SYS-RUNTIME-STATE-STORE'
from runtime_state_store_leaf_map
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
from runtime_state_store_leaf_map
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
  'CONTRACT-' || component_id || '-SURFACE',
  case
    when kind in ('port', 'adapter') then 'port'
    when component_id = 'SYS-RUNTIME-STATE-STORE-ARCHIVE-ARTIFACTS' then 'type'
    else 'workflow'
  end,
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from runtime_state_store_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
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
  'REL-RUNTIME-STATE-STORE-CONTAINS-' ||
    replace(component_id, 'SYS-RUNTIME-STATE-STORE-', ''),
  'SYS-RUNTIME-STATE-STORE',
  component_id,
  'contains',
  'outbound',
  'build_time',
  'CONTRACT-' || component_id || '-SURFACE',
  'component-profile becomes incomplete if this leaf falls back to the broad state-store package aggregate',
  'runtime state-store package component ownership',
  jsonb_build_array('tools/planning-db/migrations/182_runtime_state_store_leaf_components.sql', repo_path),
  'implemented'
from runtime_state_store_leaf_map
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
values
  (
    'REL-STATE-STORE-PACKAGE-SHELL-EXPOSES-COMMAND-PORT',
    'SYS-RUNTIME-STATE-STORE-PACKAGE-SHELL',
    'SYS-RUNTIME-STATE-STORE-COMMAND-PORT',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-RUNTIME-STATE-STORE-COMMAND-PORT-SURFACE',
    'public exports drift if the package shell exposes command-port types without component ownership',
    'package export surface',
    jsonb_build_array('packages/@dvt/state-store/src/index.ts', 'packages/@dvt/state-store/src/types.ts'),
    'implemented'
  ),
  (
    'REL-STATE-STORE-PACKAGE-SHELL-EXPOSES-ARCHIVE-RUNTIME',
    'SYS-RUNTIME-STATE-STORE-PACKAGE-SHELL',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-RUNTIME-CONTRACTS',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-RUNTIME-STATE-STORE-ARCHIVE-RUNTIME-CONTRACTS-SURFACE',
    'public exports drift if archive runtime ports are not owned separately',
    'package export surface',
    jsonb_build_array('packages/@dvt/state-store/src/index.ts', 'packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts'),
    'implemented'
  ),
  (
    'REL-STATE-STORE-ARCHIVE-ORCHESTRATION-USES-RUNTIME-PORTS',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-ORCHESTRATION',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-RUNTIME-CONTRACTS',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-RUNTIME-STATE-STORE-ARCHIVE-RUNTIME-CONTRACTS-SURFACE',
    'archive orchestration becomes hidden authority if it bypasses runtime archive ports',
    'state lifecycle operation',
    jsonb_build_array('packages/@dvt/state-store/src/lifecycle/RunArchiveCoordinator.ts', 'packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts'),
    'implemented'
  ),
  (
    'REL-STATE-STORE-ARCHIVE-ORCHESTRATION-BUILDS-ARTIFACTS',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-ORCHESTRATION',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-ARTIFACTS',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-RUNTIME-STATE-STORE-ARCHIVE-ARTIFACTS-SURFACE',
    'terminal snapshot pinning can diverge if orchestration rebuilds artifact semantics locally',
    'state lifecycle operation',
    jsonb_build_array('packages/@dvt/state-store/src/lifecycle/RunArchiveCoordinator.ts', 'packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts'),
    'implemented'
  ),
  (
    'REL-STATE-STORE-OBJECT-STORAGE-BUILDS-ARCHIVE-ARTIFACTS',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-OBJECT-STORAGE',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-ARTIFACTS',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-RUNTIME-STATE-STORE-ARCHIVE-ARTIFACTS-SURFACE',
    'archive exporter can emit unverifiable payloads if it bypasses canonical manifest and checksum builders',
    'state lifecycle operation',
    jsonb_build_array('packages/@dvt/state-store/src/lifecycle/ObjectStorageRunArchiveExporter.ts', 'packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts'),
    'implemented'
  ),
  (
    'REL-STATE-STORE-RESTORE-DELETE-USES-RUNTIME-PORTS',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-RESTORE-DELETE',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-RUNTIME-CONTRACTS',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-RUNTIME-STATE-STORE-ARCHIVE-RUNTIME-CONTRACTS-SURFACE',
    'restore/delete lifecycle can bypass audit and lease rules if runtime ports are not the boundary',
    'state lifecycle operation',
    jsonb_build_array('packages/@dvt/state-store/src/lifecycle/RunArchiveRestorer.ts', 'packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts'),
    'implemented'
  ),
  (
    'REL-STATE-STORE-COMMAND-PORT-DEPENDS-ENGINE-RUNTIME',
    'SYS-RUNTIME-STATE-STORE-COMMAND-PORT',
    'SYS-RUNTIME-ENGINE-CORE',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-RUNTIME-STATE-STORE-COMMAND-PORT-SURFACE',
    'command-port aliases can drift from engine event input and append result semantics',
    'runtime package import boundary',
    jsonb_build_array('packages/@dvt/state-store/src/types.ts', 'packages/@dvt/engine/src'),
    'implemented'
  )
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
  'PORT-' || component_id || '-' || regexp_replace(upper(port.value), '[^A-Z0-9]+', '-', 'g'),
  component_id,
  port.value,
  case
    when port.value like 'Read%' or port.value like 'Verify%' or port.value like 'Validate%' then 'query'
    when port.value like 'Store%' then 'storage'
    else 'command'
  end,
  'inbound',
  'CONTRACT-' || component_id || '-SURFACE',
  null,
  array[validation_command]::text[],
  'implemented'
from runtime_state_store_leaf_map
cross join lateral unnest(ports) with ordinality as port(value, item_order)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_storage_io (
  storage_io_id,
  component_id,
  storage_object,
  direction,
  access_pattern,
  contract_id
)
select
  'STORAGE-' || component_id || '-READ-' || storage.item_order,
  component_id,
  storage.value,
  'reads',
  case
    when storage.value like 'in-memory%' then 'transactional'
    when storage.value like '%object store%' or storage.value like 's3%' then 'bulk'
    else 'read_only'
  end,
  'CONTRACT-' || component_id || '-SURFACE'
from runtime_state_store_leaf_map
cross join lateral unnest(storage_reads) with ordinality as storage(value, item_order)
union all
select
  'STORAGE-' || component_id || '-WRITE-' || storage.item_order,
  component_id,
  storage.value,
  'writes',
  case
    when storage.value like 'in-memory%' then 'transactional'
    when storage.value like '%object store%' or storage.value like 's3%' then 'bulk'
    else 'transactional'
  end,
  'CONTRACT-' || component_id || '-SURFACE'
from runtime_state_store_leaf_map
cross join lateral unnest(storage_writes) with ordinality as storage(value, item_order)
on conflict (storage_io_id) do update set
  component_id = excluded.component_id,
  storage_object = excluded.storage_object,
  direction = excluded.direction,
  access_pattern = excluded.access_pattern,
  contract_id = excluded.contract_id;

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
  'TEST-' || component_id || '-' || test_path.item_order,
  component_id,
  test_path.value,
  test_kind,
  coverage_level,
  true,
  validation_command
from runtime_state_store_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(value, item_order)
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
  'OBS-' || component_id || '-TESTED-TELEMETRY',
  component_id,
  case
    when component_id like '%ARCHIVE%' then 'state-store archive lifecycle telemetry and tests'
    when component_id like '%DELIVERY-BUFFER%' then 'delivery buffer purge metrics and tests'
    else 'state-store package validation tests'
  end,
  'log',
  true,
  case
    when criticality = 'high' then 'implemented'
    else 'not_applicable'
  end
from runtime_state_store_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.runtime_state_store_leaf_map;
