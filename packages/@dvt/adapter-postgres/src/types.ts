import type { EventEnvelope } from '@dvt/contracts';

export type {
  AppendResult,
  EventInput,
  EventEnvelope,
  EventType,
  IOutboxStorage,
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  OutboxClaimSelection,
  RunBootstrapInput,
  RunId,
  RunMetadata,
  RunStateCommandPort,
  WorkflowSnapshot,
} from '@dvt/contracts';

export type StepSnapshot = import('@dvt/contracts').WorkflowSnapshot['steps'][string];

export interface OutboxRecord {
  id: string;
  createdAt: string;
  idempotencyKey: string;
  payload: EventEnvelope;
  attempts: number;
  lastError?: string;
  nextAttemptAt?: string;
}

export interface DeadLetterRecord {
  id: string;
  originalId: string;
  runId: string;
  payload: EventEnvelope;
  lastError: string;
  deadLetteredAt: string;
}

/**
 * Maximum delivery attempts before an outbox record is dead-lettered.
 * Must stay in sync with engine/outbox constants.
 */
export const MAX_OUTBOX_ATTEMPTS = 10;
