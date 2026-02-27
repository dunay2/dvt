import type {
  AppendResultLike,
  RunBootstrapCommand,
  RunEventInputLike,
  RunStateCommandPort,
} from './types.js';

/**
 * In-memory implementation of RunStateCommandPort for tests and local development.
 */
export class InMemoryRunStateCommandPort implements RunStateCommandPort {
  private static readonly EPOCH_ISO = '1970-01-01T00:00:00.000Z';

  private readonly eventsByRun = new Map<string, AppendResultLike['appended']>();
  private readonly metadataByRun = new Map<string, RunBootstrapCommand['metadata']>();
  private readonly idempotencyByRun = new Map<
    string,
    Map<string, AppendResultLike['appended'][number]>
  >();

  constructor() {}

  async bootstrapRun(input: RunBootstrapCommand): Promise<AppendResultLike> {
    const runId = input.metadata.runId;
    if (!runId) {
      throw new Error('RUN_ID_REQUIRED');
    }
    if (this.metadataByRun.has(runId)) {
      throw new Error('RUN_ALREADY_EXISTS');
    }

    this.metadataByRun.set(runId, input.metadata);
    this.eventsByRun.set(runId, []);
    this.idempotencyByRun.set(runId, new Map());
    if (input.firstEvents.length === 0) {
      return { appended: [], deduped: [], lastSeq: 0 };
    }
    return this.appendTransitions(runId, input.firstEvents);
  }

  async appendTransitions(runId: string, events: RunEventInputLike[]): Promise<AppendResultLike> {
    const runEvents = this.eventsByRun.get(runId);
    const idempotencyIndex = this.idempotencyByRun.get(runId);
    if (!runEvents || !idempotencyIndex) {
      throw new Error('RUN_NOT_FOUND');
    }

    const baseRunSeq = runEvents.length;
    const appended: AppendResultLike['appended'] = [];
    const deduped: AppendResultLike['deduped'] = [];
    for (const event of events) {
      const key = event.idempotencyKey;
      const existing = key ? idempotencyIndex.get(key) : undefined;
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const persisted = {
        ...event,
        runSeq: runEvents.length + 1,
        persistedAt: InMemoryRunStateCommandPort.EPOCH_ISO,
      };

      if (key) idempotencyIndex.set(key, persisted);
      runEvents.push(persisted);
      appended.push(persisted);
    }

    return {
      appended,
      deduped,
      lastSeq: appended[appended.length - 1]?.runSeq ?? baseRunSeq,
    };
  }

  listEvents(runId: string): RunEventInputLike[] {
    return [...(this.eventsByRun.get(runId) ?? [])];
  }
}
