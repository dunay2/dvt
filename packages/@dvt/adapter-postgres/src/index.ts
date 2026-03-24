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
export type { PostgresAdapterConfig } from './PostgresStateStoreAdapter.js';
export type { ExecutablePlanArtifact, PostgresPlanStoreConfig } from './PostgresPlanStore.js';
export type { PostgresStartRunIntentStoreConfig } from './PostgresStartRunIntentStore.js';
export type {
  PostgresSchemaRollbackPlan,
  PostgresSchemaRollbackPlanStep,
} from './PostgresSchemaManager.js';
export type {
  PostgresBackpressureSnapshot,
  PostgresBackpressureSnapshotReaderConfig,
} from './PostgresBackpressureSnapshotReader.js';

export { PostgresStateStoreAdapter } from './PostgresStateStoreAdapter.js';
export { PostgresPlanStore } from './PostgresPlanStore.js';
export { PostgresBackpressureSnapshotReader } from './PostgresBackpressureSnapshotReader.js';
export { PostgresRunMetadataRepository } from './PostgresRunMetadataRepository.js';
export { PostgresRunEventStore } from './PostgresRunEventStore.js';
export { PostgresRunSnapshotStore } from './PostgresRunSnapshotStore.js';
export { PostgresStartRunIntentStore } from './PostgresStartRunIntentStore.js';
export { StartRunIntentSchemaManager } from './StartRunIntentSchemaManager.js';
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
