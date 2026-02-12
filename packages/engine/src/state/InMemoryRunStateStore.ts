import type { EventEnvelope, RunMetadata } from '../contracts/runEvents.js';

import type { IRunStateStore, AppendResult } from './IRunStateStore.js';

export class InMemoryRunStateStore implements IRunStateStore {
  private readonly metadataByRunId = new Map<string, RunMetadata>();
  private readonly eventsByRunId = new Map<string, EventEnvelope[]>();
  private readonly idempIndexByRunId = new Map<string, Map<string, EventEnvelope>>();

  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    this.metadataByRunId.set(meta.runId, meta);
  }

  async getRunMetadataByRunId(runId: string): Promise<RunMetadata | null> {
    return this.metadataByRunId.get(runId) ?? null;
  }

  async appendEventsTx(
    runId: string,
    envelopes: Omit<EventEnvelope, 'runSeq'>[]
  ): Promise<AppendResult> {
    const events = this.eventsByRunId.get(runId) ?? [];
    const idx = this.idempIndexByRunId.get(runId) ?? new Map<string, EventEnvelope>();

    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    for (const env of envelopes) {
      const existing = idx.get(env.idempotencyKey);
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const runSeq = events.length + appended.length + 1;
      const withSeq: EventEnvelope = { ...(env as EventEnvelope), runSeq };
      appended.push(withSeq);
      idx.set(withSeq.idempotencyKey, withSeq);
    }

    // "Transactional" commit (single mutation point)
    const committed = events.concat(appended);
    this.eventsByRunId.set(runId, committed);
    this.idempIndexByRunId.set(runId, idx);

    return { appended, deduped };
  }

  async listEvents(runId: string): Promise<EventEnvelope[]> {
    return this.eventsByRunId.get(runId) ?? [];
  }
}
