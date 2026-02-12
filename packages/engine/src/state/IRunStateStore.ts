import type { EventEnvelope, RunMetadata } from '../contracts/runEvents.js';

export interface AppendResult {
  appended: EventEnvelope[]; // includes assigned runSeq
  deduped: EventEnvelope[]; // existing events matched by idempotencyKey
}

export interface IRunStateStore {
  saveRunMetadata(meta: RunMetadata): Promise<void>;
  getRunMetadataByRunId(runId: string): Promise<RunMetadata | null>;
  appendEventsTx(runId: string, envelopes: Omit<EventEnvelope, 'runSeq'>[]): Promise<AppendResult>;
  listEvents(runId: string): Promise<EventEnvelope[]>;
}
