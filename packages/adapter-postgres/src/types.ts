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
  | 'StepFailed'
  | 'StepSkipped';

export interface RunEventInputBase {
  eventId: string;
  eventType: EventType;
  runId: string;
  emittedAt: IsoUtcString;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}

export type StepEventInput = RunEventInputBase & { stepId: string };
export type RunEventInput = RunEventInputBase & { stepId?: never };
export type EventInput = StepEventInput | RunEventInput;

export type EventEnvelope = EventInput & {
  runSeq: number;
  persistedAt: IsoUtcString;
};

export interface RunMetadata {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  planId: string;
  planVersion: string;
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

export interface RunBootstrapInput {
  metadata: RunMetadata;
  firstEvents: EventInput[];
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
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: RunId, events: EventInput[]): Promise<AppendResult>;
  getRunMetadataByRunId(runId: RunId): Promise<RunMetadata | null>;
  saveProviderRef(
    runId: RunId,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void>;
  listEvents(runId: RunId): Promise<EventEnvelope[]>;
}

export interface IOutboxStorage {
  enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  markDelivered(ids: OutboxId[]): Promise<void>;
  markFailed(id: OutboxId, error: ErrorMessage): Promise<void>;
}
