import type { EventEnvelope } from '@dvt/contracts';

export type {
  AppendResult,
  EventInput,
  EventType,
  IOutboxStorage,
  IRunStateStore,
  RunBootstrapInput,
  RunMetadata,
  RunStateCommandPort,
  WorkflowSnapshot,
} from '@dvt/contracts';

export type IsoUtcString = string;
export type RunId = string;
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

export interface ListRunsOptions {
  tenantId?: string;
  limit?: number;
}

/**
 * Maximum delivery attempts before an outbox record is dead-lettered.
 * Must stay in sync with engine/outbox constants.
 */
export const MAX_OUTBOX_ATTEMPTS = 10;
