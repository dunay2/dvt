import type { RunId } from '@dvt/contracts';
import type {
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  RunBootstrapInput,
} from '@dvt/engine/contracts/engine/IRunStateStore.v1';
import type {
  AppendResult,
  EventEnvelope,
  EventType,
  RunEventInput,
  RunMetadata,
  WorkflowSnapshot,
} from '@dvt/engine/contracts/engine/RunEvents.v2';
import type { IOutboxStorage } from '@dvt/engine/src/outbox/types';

export type {
  AppendResult,
  EventEnvelope,
  EventType,
  IOutboxStorage,
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  RunId,
  RunBootstrapInput,
  RunMetadata,
  WorkflowSnapshot,
};

export type EventInput = RunEventInput;
export type StepSnapshot = WorkflowSnapshot['steps'][string];

export interface RunStateCommandPort {
  bootstrapRun(input: RunBootstrapInput): Promise<AppendResult>;
  appendTransitions(runId: RunId, events: EventInput[]): Promise<AppendResult>;
}

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
