import type { WorkflowSnapshot as ContractWorkflowSnapshot } from '@dvt/contracts';

export type {
  AppendResult,
  DeadLetterRecord,
  EventInput,
  EventEnvelope,
  EventType,
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
  RunId,
  RunMetadata,
  RunStateCommandPort,
  WorkflowSnapshot,
} from '@dvt/contracts';
export { MAX_OUTBOX_ATTEMPTS } from '@dvt/contracts';

export type StepSnapshot = ContractWorkflowSnapshot['steps'][string];
export type {
  ArchivedTerminalSnapshot,
  TerminalSnapshotPinResult,
  TerminalSnapshotPinStore,
} from '@dvt/state-store';
