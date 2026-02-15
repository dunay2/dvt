export type IsoUtcString = string;

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
  getRunMetadataByRunId(runId: string): Promise<RunMetadata | null>;
  appendEventsTx(runId: string, envelopes: Omit<EventEnvelope, 'runSeq'>[]): Promise<AppendResult>;
  listEvents(runId: string): Promise<EventEnvelope[]>;
}

export interface IOutboxStorage {
  enqueueTx(runId: string, events: EventEnvelope[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}
