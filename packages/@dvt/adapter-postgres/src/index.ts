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
  DeadLetterRecord,
  EventEnvelope,
  EventType,
  EventInput,
  IOutboxStorage,
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  OutboxClaimSelection,
  OutboxRecord,
  RunBootstrapInput,
  RunMetadata,
  RunStateCommandPort,
  WorkflowSnapshot,
} from './types.js';
export type { PostgresAdapterConfig } from './PostgresStateStoreAdapter.js';
export type { PostgresStartRunIntentStoreConfig } from './PostgresStartRunIntentStore.js';

export { PostgresStateStoreAdapter } from './PostgresStateStoreAdapter.js';
export { PostgresOutboxStore } from './PostgresOutboxStore.js';
export { PostgresRunEventStore } from './PostgresRunEventStore.js';
export { PostgresRunMetadataRepository } from './PostgresRunMetadataRepository.js';
export { PostgresRunSnapshotStore } from './PostgresRunSnapshotStore.js';
export { PostgresSchemaManager } from './PostgresSchemaManager.js';
export { PostgresStartRunIntentStore } from './PostgresStartRunIntentStore.js';
export { StartRunIntentSchemaManager } from './StartRunIntentSchemaManager.js';
export {
  IntentInvalidTransitionError,
  IntentNotFoundError,
  StoreNotReadyError,
} from '@dvt/contracts';
export { PostgresRunStateCommandPortBridge } from './runStateCommandPortBridge.js';
