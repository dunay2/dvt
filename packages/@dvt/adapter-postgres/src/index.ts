/**
 * @file packages/@dvt/adapter-postgres/src/index.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Section 3 — Adapter public surface exports transactional state-store capabilities
 * @consequence Consumers import a stable PostgreSQL adapter boundary aligned with execution/state decisions
 * @version 1.0.0
 * @date 2026-02-21
 */
export type {
  AppendResult,
  ArchivedTerminalSnapshot,
  DeadLetterRecord,
  EventEnvelope,
  EventType,
  EventInput,
  IOutboxStorage,
  IRunStateStore,
  IRunStateStoreMaintenance,
  IRunStateStoreRead,
  IRunStateStoreWrite,
  IRunSnapshotStalenessQuery,
  ListEventsOptions,
  ListRunsOptions,
  OutboxClaimSelection,
  OutboxRecord,
  RetryAttemptReservation,
  RunBootstrapInput,
  RunMetadata,
  RunStateCommandPort,
  TerminalSnapshotPinResult,
  TerminalSnapshotPinStore,
  WorkflowSnapshot,
} from './types.js';
export type { PostgresStateStoreRuntimeConfig as PostgresAdapterConfig } from './PostgresStateStoreRuntimeConfig.js';
export type { ExecutablePlanArtifact, PostgresPlanStoreConfig } from './PostgresPlanStore.js';
export type { PostgresStartRunIntentStoreConfig } from './PostgresStartRunIntentStore.js';
export type {
  PostgresMigratableStore,
  PostgresRuntimeStoresToMigrate,
} from './migratePostgresRuntimeStores.js';
export type {
  PostgresSchemaRollbackCompatibility,
  PostgresSchemaRollbackPlan,
  PostgresSchemaRollbackPlanStep,
} from './PostgresSchemaManager.js';
export type {
  PostgresBackpressureSnapshot,
  PostgresBackpressureSnapshotReaderConfig,
} from './PostgresBackpressureSnapshotReader.js';
export type {
  RunEventAppendResult,
  RunEventReadRepository,
  RunEventRepositoryDeps,
  RunEventWriteRepository,
  SqlCommandExecutor,
} from './RunEventWriteRepository.js';
export type { PostgresObjectFileLoadingCapabilityConfig } from './PostgresObjectFileLoadingCapability.js';
export type {
  IPostgresCredentialBindingResolver,
  PostgresCredentialBindings,
} from './PostgresCredentialBindingResolver.js';

export { PostgresStateStoreAdapter } from './PostgresStateStoreAdapter.js';
export { PostgresSchemaRollbackCompatibilityPolicy } from './PostgresSchemaManager.js';
export { PostgresPlanStore } from './PostgresPlanStore.js';
export { PostgresBackpressureSnapshotReader } from './PostgresBackpressureSnapshotReader.js';
export { PostgresRunMetadataRepository } from './PostgresRunMetadataRepository.js';
export { PostgresRunEventStore } from './PostgresRunEventStore.js';
export {
  InvalidListEventsLimitError,
  InvalidRunEventEnvelopeError,
  InvalidRunEventSchemaError,
  InvalidRunEventTenantError,
  InvalidRunSequenceValueError,
  RUN_EVENT_STORE_ERROR_CODE,
  RUN_EVENT_STORE_MESSAGE_KEY,
  RUN_EVENT_STORE_ERROR_NAME,
} from './runEventStoreErrors.js';
export { PostgresRunSnapshotStore } from './PostgresRunSnapshotStore.js';
export { PostgresStartRunIntentStore } from './PostgresStartRunIntentStore.js';
export { StartRunIntentSchemaManager } from './StartRunIntentSchemaManager.js';
export { migratePostgresRuntimeStores } from './migratePostgresRuntimeStores.js';
export {
  IntentActiveConflictError,
  IntentDispatchConflictError,
  IntentInvalidTransitionError,
  IntentNotFoundError,
  StoreNotReadyError,
} from '@dvt/contracts';
export { PostgresRunStateCommandPortBridge } from './runStateCommandPortBridge.js';
export { PostgresLineageOutboxStore } from './PostgresLineageOutboxStore.js';
export { PostgresRunArchiveStore } from './PostgresRunArchiveStore.js';
export { PostgresArchiveLeaseStore } from './PostgresArchiveLeaseStore.js';
export { PostgresDeliveryBufferPurgeStore } from './PostgresDeliveryBufferPurgeStore.js';
export { PostgresObjectFileLoadingCapability } from './PostgresObjectFileLoadingCapability.js';
export {
  InvalidPostgresCredentialBindingsError,
  PostgresCredentialBindingResolver,
  parsePostgresCredentialBindings,
} from './PostgresCredentialBindingResolver.js';
export {
  PostgresObjectFileLoader,
  resolvePostgresObjectFileScopeSchema,
  type PostgresObjectFileLoadInput,
  type PostgresObjectFileLoadResult,
  type PostgresObjectFileScalar,
} from './PostgresObjectFileLoader.js';
export {
  createObservedPostgresPool,
  type PostgresPoolFailure,
  type PostgresPoolFailureReporter,
} from './PostgresPoolErrorPolicy.js';
