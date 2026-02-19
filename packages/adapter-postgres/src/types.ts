/**
 * NOTE (P2 type-drift assessment):
 *
 * This adapter intentionally keeps local storage/event types instead of importing
 * `IRunStateStore`-like contracts from `@dvt/contracts/src/types/state-store`.
 *
 * Rationale:
 * - `@dvt/contracts` currently models canonical projection contracts
 *   (`appendEvent`, `fetchEvents`, snapshots), while this adapter implements
 *   transactional engine persistence and outbox semantics
 *   (`appendEventsTx`, `appendAndEnqueueTx`, `listPending`, `markDelivered`).
 * - Directly aliasing those contracts here would conflate two different layers
 *   and force unsafe adapter-side casting.
 *
 * Decision:
 * - Keep local adapter types for now.
 * - Revisit extraction of shared transactional persistence contracts when
 *   engine + adapter interfaces are formally unified.
 */
export type IsoUtcString = string;
export type RunId = string;
export type OutboxId = string;
export type ErrorMessage = string;
export type SchemaName = string;

export type EventType =
  | 'RunQueued'
  | 'RunStarted'
  | 'RunPaused'
  | 'RunResumed'
  | 'RunCancelled'
  | 'RunCompleted'
  | 'RunFailed'
  | 'StepStarted'
  | 'StepCompleted'
  | 'StepFailed';

export interface EventEnvelopeBase {
  eventType: EventType;
  emittedAt: IsoUtcString;
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  runSeq: number;
  idempotencyKey: string;
}

export type StepEventEnvelope = EventEnvelopeBase & { stepId: string };
export type RunEventEnvelope = EventEnvelopeBase & { stepId?: never };
export type EventEnvelope = StepEventEnvelope | RunEventEnvelope;

export interface RunMetadata {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  provider: 'temporal' | 'conductor' | 'mock';
  providerWorkflowId: string;
  providerRunId: string;
  providerNamespace?: string;
  providerTaskQueue?: string;
  providerConductorUrl?: string;
}

export interface AppendResult {
  appended: EventEnvelope[];
  deduped: EventEnvelope[];
}

export interface OutboxRecord {
  id: string;
  createdAt: string;
  idempotencyKey: string;
  payload: EventEnvelope;
  attempts: number;
  lastError?: string;
}

export interface IRunStateStore {
  saveRunMetadata(meta: RunMetadata): Promise<void>;
  getRunMetadataByRunId(runId: RunId): Promise<RunMetadata | null>;
  appendEventsTx(runId: RunId, envelopes: Omit<EventEnvelope, 'runSeq'>[]): Promise<AppendResult>;
  listEvents(runId: RunId): Promise<EventEnvelope[]>;
}

export interface IOutboxStorage {
  enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  markDelivered(ids: OutboxId[]): Promise<void>;
  markFailed(id: OutboxId, error: ErrorMessage): Promise<void>;
}
