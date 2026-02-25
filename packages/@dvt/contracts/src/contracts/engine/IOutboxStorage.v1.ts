import type { EventEnvelope } from './IRunStateStore.v1';

export type { EventEnvelope } from './IRunStateStore.v1';

export interface IOutboxStorage {
  enqueueTx(runId: string, events: EventEnvelope[]): Promise<void>;
}
