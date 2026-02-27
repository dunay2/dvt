import type {
  AppendResult,
  EventInput,
  EventEnvelope,
  EventType,
  IRunStateStore,
  IOutboxStorage,
  ListEventsOptions,
  ListRunsOptions,
  RunBootstrapInput,
  RunId,
  RunMetadata,
  RunStateCommandPort,
  WorkflowSnapshot,
} from '@dvt/contracts';

export type {
  AppendResult,
  EventInput,
  EventEnvelope,
  EventType,
  IOutboxStorage,
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  RunId,
  RunBootstrapInput,
  RunMetadata,
  RunStateCommandPort,
  WorkflowSnapshot,
};

export type StepSnapshot = WorkflowSnapshot['steps'][string];

export type IsoUtcString = string;
export type OutboxId = string;
export type ErrorMessage = string;
export type SchemaName = string;

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
  deadLetteredAt: IsoUtcString;
}

/**
 * Maximum delivery attempts before an outbox record is dead-lettered.
 * Must stay in sync with engine/outbox constants.
 */
export const MAX_OUTBOX_ATTEMPTS = 10;
