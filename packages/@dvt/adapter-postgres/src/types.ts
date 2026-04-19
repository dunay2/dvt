import type { IOutboxStorage, OutboxClaimSelection } from '@dvt/delivery';
import type { WorkflowSnapshot as EngineWorkflowSnapshot } from '@dvt/engine';
export { MAX_OUTBOX_ATTEMPTS } from '@dvt/delivery';

export type {
  AppendResult,
  DeadLetterRecord,
  EventInput,
  EventEnvelope,
  EventType,
  ListEventsOptions,
  ListRunsOptions,
  OutboxRecord,
  ProviderRefUpdate,
  RunBootstrapInput,
  RunId,
  RunMetadata,
} from '@dvt/contracts';
export type { IOutboxStorage, OutboxClaimSelection };

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
