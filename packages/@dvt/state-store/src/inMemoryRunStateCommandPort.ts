import type {
  AppendResultLike,
  RunEventInputLike,
  RunMetadataLike,
  RunStateCommandPort,
} from './types.js';

/**
 * In-memory implementation of RunStateCommandPort for tests and local development.
 */
export class InMemoryRunStateCommandPort implements RunStateCommandPort {
  private readonly eventsByRun = new Map<string, RunEventInputLike[]>();
  private readonly metadataByRun = new Map<string, RunMetadataLike>();
  private readonly idempotencyByRun = new Map<string, Set<string>>();

  constructor() {}

  async bootstrapRun(input: {
    metadata: RunMetadataLike;
    firstEvents: RunEventInputLike[];
  }): Promise<AppendResultLike> {
    const runId = String(input.metadata['runId'] ?? '');
    if (!runId) {
      throw new Error('RUN_ID_REQUIRED');
    }
    if (this.metadataByRun.has(runId)) {
      throw new Error('RUN_ALREADY_EXISTS');
    }

    this.metadataByRun.set(runId, input.metadata);
    this.eventsByRun.set(runId, []);
    this.idempotencyByRun.set(runId, new Set());
    if (input.firstEvents.length === 0) {
      return { appended: [], deduped: [] };
    }
    return this.appendTransitions(runId, input.firstEvents);
  }

  async appendTransitions(runId: string, events: RunEventInputLike[]): Promise<AppendResultLike> {
    const runEvents = this.eventsByRun.get(runId);
    const dedupeSet = this.idempotencyByRun.get(runId);
    if (!runEvents || !dedupeSet) {
      throw new Error('RUN_NOT_FOUND');
    }

    const appended: RunEventInputLike[] = [];
    const deduped: RunEventInputLike[] = [];
    for (const event of events) {
      const key = String(event['idempotencyKey'] ?? '');
      if (key && dedupeSet.has(key)) {
        deduped.push(event);
        continue;
      }
      if (key) dedupeSet.add(key);
      runEvents.push(event);
      appended.push(event);
    }

    return { appended, deduped };
  }

  listEvents(runId: string): RunEventInputLike[] {
    return [...(this.eventsByRun.get(runId) ?? [])];
  }
}
