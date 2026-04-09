import type { WorkflowSnapshot as EngineWorkflowSnapshot } from '@dvt/engine';

export type {
  AppendResult,
  DeadLetterRecord,
  EventInput,
  EventEnvelope,
  EventType,
  IOutboxStorage,
  ListEventsOptions,
  ListRunsOptions,
  OutboxClaimSelection,
  OutboxRecord,
  ProviderRefUpdate,
  RunBootstrapInput,
  RunId,
  RunMetadata,
} from '@dvt/contracts';
export { MAX_OUTBOX_ATTEMPTS } from '@dvt/contracts';

export type {
  RetryAttemptReservation,
  IRunSnapshotStalenessQuery,
  IRunStateStore,
  IRunStateStoreMaintenance,
  IRunStateStoreRead,
  IRunStateStoreWrite,
  RunStateCommandPort,
  WorkflowSnapshot,
} from '@dvt/engine';

export type StepSnapshot = EngineWorkflowSnapshot['steps'][string];
export type {
  ArchivedTerminalSnapshot,
  TerminalSnapshotPinResult,
  TerminalSnapshotPinStore,
} from '@dvt/state-store';
