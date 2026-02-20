import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
  RunMetadata,
} from '../contracts/runEvents.js';

import type { IRunStateStore, RunBootstrapInput } from './IRunStateStore.js';

export class InMemoryRunStateStore implements IRunStateStore {
  private readonly metadataByRunId = new Map<string, RunMetadata>();
  private readonly eventsByRunId = new Map<string, RunEventPersisted[]>();
  private readonly idempIndexByRunId = new Map<string, Map<string, RunEventPersisted>>();

  async getRunMetadataByRunId(runId: string): Promise<RunMetadata | null> {
    return this.metadataByRunId.get(runId) ?? null;
  }

  async saveProviderRef(
    runId: string,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void> {
    const current = this.metadataByRunId.get(runId);
    if (!current) throw new Error(`RUN_NOT_FOUND: ${runId}`);
    this.metadataByRunId.set(runId, {
      ...current,
      providerWorkflowId: runRef.providerWorkflowId,
      providerRunId: runRef.providerRunId,
      ...(runRef.providerNamespace ? { providerNamespace: runRef.providerNamespace } : {}),
      ...(runRef.providerTaskQueue ? { providerTaskQueue: runRef.providerTaskQueue } : {}),
      ...(runRef.providerConductorUrl ? { providerConductorUrl: runRef.providerConductorUrl } : {}),
    });
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    if (this.metadataByRunId.has(input.metadata.runId)) {
      throw new Error('RUN_ALREADY_EXISTS');
    }

    // Atomic block (no awaits): write metadata + first events together.
    this.metadataByRunId.set(input.metadata.runId, input.metadata);
    return this.appendAndEnqueueTx(input.metadata.runId, input.firstEvents);
  }

  async appendAndEnqueueTx(runId: string, eventsToAppend: RunEventInput[]): Promise<AppendResult> {
    const events = this.eventsByRunId.get(runId) ?? [];
    const idx = this.idempIndexByRunId.get(runId) ?? new Map<string, RunEventPersisted>();

    const appended: RunEventPersisted[] = [];
    const deduped: RunEventPersisted[] = [];
    const persistedAt = '1970-01-01T00:00:00.000Z';

    for (const env of eventsToAppend) {
      const existing = idx.get(env.idempotencyKey);
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const runSeq = events.length + appended.length + 1;
      const withSeq: RunEventPersisted = { ...env, runSeq, persistedAt };
      appended.push(withSeq);
      idx.set(withSeq.idempotencyKey, withSeq);
    }

    // "Transactional" commit (single mutation point)
    const committed = events.concat(appended);
    this.eventsByRunId.set(runId, committed);
    this.idempIndexByRunId.set(runId, idx);

    return { appended, deduped };
  }

  async listEvents(runId: string): Promise<RunEventPersisted[]> {
    return (this.eventsByRunId.get(runId) ?? []).slice().sort((a, b) => a.runSeq - b.runSeq);
  }
}
