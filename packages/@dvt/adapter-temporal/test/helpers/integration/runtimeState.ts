import { asIsoUtcString } from '@dvt/contracts';

import type {
  EventEnvelope as TemporalEventEnvelope,
  EventIdempotencyInput,
  EventInput,
  RunMetadata,
} from '../../../src/engine-types.js';

export type EventEnvelope = TemporalEventEnvelope;
export type RunStatusValue =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

interface AppendResult {
  runSeq: number;
  idempotent: boolean;
  persisted: boolean;
  eventId: string;
  persistedAt: string;
}

interface EventSliceQuery {
  runId: RunId;
  afterSeq?: number;
  limit?: number;
}

interface OutboxRecord {
  id: string;
  createdAt: string;
  idempotencyKey: string;
  payload: unknown;
  attempts: number;
  lastError?: string;
}

interface RunSnapshot {
  runId: string;
  status: RunStatusValue;
  lastEventSeq: number;
  projectedAt: string;
}

export class RunId {
  private constructor(readonly value: string) {}

  static of(value: string): RunId {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new TypeError('RUN_ID_REQUIRED');
    }
    return new RunId(normalized);
  }
}

export class TestIdempotency {
  private counter = 0;

  eventId(): string {
    this.counter += 1;
    return `test-event-${this.counter}`;
  }

  runEventKey(args: EventIdempotencyInput): string {
    return [
      args.eventType,
      args.tenantId,
      args.runId,
      String(args.logicalAttemptId),
      args.planId,
      args.planVersion,
      args.stepId ?? '',
    ].join('|');
  }

  startRunIntentId(
    tenantId: string,
    runId: string,
    logicalAttemptId = 1,
    targetAdapter = 'temporal'
  ): string {
    return ['start-run-intent', tenantId, runId, String(logicalAttemptId), targetAdapter].join('|');
  }
}

export class TestClock {
  nowIsoUtc(): ReturnType<typeof asIsoUtcString> {
    return asIsoUtcString('2026-01-01T00:00:00.000Z');
  }
}

export class TestStateStore {
  private readonly eventsByRun = new Map<string, EventEnvelope[]>();
  private readonly idempByRun = new Map<string, Map<string, EventEnvelope>>();
  private readonly snapshotsByRun = new Map<string, RunSnapshot>();
  private readonly metadataByRun = new Map<string, RunMetadata>();

  async appendEvent(event: EventInput): Promise<AppendResult> {
    const runId = event.runId;
    const events = this.eventsByRun.get(runId) ?? [];
    const idx = this.idempByRun.get(runId) ?? new Map<string, EventEnvelope>();

    const existing = idx.get(event.idempotencyKey);
    if (existing) {
      return {
        runSeq: existing.runSeq,
        idempotent: true,
        persisted: false,
        eventId: existing.eventId,
        persistedAt: existing.persistedAt,
      };
    }

    const nextRunSeq = events.length + 1;
    const persistedAt = new Date().toISOString();
    const record: EventEnvelope = {
      ...event,
      runSeq: nextRunSeq,
      persistedAt,
    };

    events.push(record);
    idx.set(event.idempotencyKey, record);
    this.eventsByRun.set(runId, events);
    this.idempByRun.set(runId, idx);

    return {
      runSeq: nextRunSeq,
      idempotent: false,
      persisted: true,
      eventId: `evt-${runId}-${nextRunSeq}`,
      persistedAt,
    };
  }

  async fetchEvents(query: EventSliceQuery): Promise<EventEnvelope[]> {
    const events = this.eventsByRun.get(query.runId.value) ?? [];
    let filtered = events;
    if (query.afterSeq !== undefined) {
      filtered = filtered.filter((event) => event.runSeq > query.afterSeq);
    }
    if (query.limit !== undefined) {
      filtered = filtered.slice(0, query.limit);
    }
    return filtered;
  }

  async getSnapshot(runId: RunId): Promise<RunSnapshot | null> {
    return this.snapshotsByRun.get(runId.value) ?? null;
  }

  async projectSnapshot(runId: RunId): Promise<RunSnapshot> {
    const events = await this.fetchEvents({ runId });
    const snapshot: RunSnapshot = {
      runId: runId.value,
      status: this.calculateStatus(events),
      lastEventSeq: events.at(-1)?.runSeq ?? 0,
      projectedAt: new Date().toISOString(),
    };
    this.snapshotsByRun.set(runId.value, snapshot);
    return snapshot;
  }

  async bootstrapRunTx(input: {
    metadata: RunMetadata;
    firstEvents: EventInput[];
  }): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    this.metadataByRun.set(input.metadata.runId, input.metadata);
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    for (const event of input.firstEvents) {
      const result = await this.appendEvent(event);
      const events = await this.listRunEvents(RunId.of(input.metadata.runId));
      const persisted = events.find((entry) => entry.runSeq === result.runSeq);
      if (!persisted) {
        continue;
      }
      if (result.idempotent) {
        deduped.push(persisted);
      } else {
        appended.push(persisted);
      }
    }

    return {
      appended,
      deduped,
      lastSeq: appended.at(-1)?.runSeq ?? 0,
    };
  }

  async appendAndEnqueueTx(
    runId: string,
    events: EventInput[]
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    for (const event of events) {
      const result = await this.appendEvent({ ...event, runId });
      const persisted = (await this.listRunEvents(RunId.of(runId))).find(
        (entry) => entry.runSeq === result.runSeq
      );
      if (!persisted) {
        continue;
      }
      if (result.idempotent) {
        deduped.push(persisted);
      } else {
        appended.push(persisted);
      }
    }

    const all = await this.listRunEvents(RunId.of(runId));
    return {
      appended,
      deduped,
      lastSeq: appended.at(-1)?.runSeq ?? all.at(-1)?.runSeq ?? 0,
    };
  }

  async getRunMetadataByRunId(runId: string): Promise<RunMetadata | null> {
    return this.metadataByRun.get(runId) ?? null;
  }

  async saveProviderRef(
    _runId: string,
    _runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
    }
  ): Promise<void> {
    // No-op for integration tests.
  }

  async listEvents(_tenantId: string, runId: string): Promise<EventEnvelope[]> {
    return this.eventsByRun.get(runId) ?? [];
  }

  async listRunEvents(runId: RunId): Promise<EventEnvelope[]> {
    return this.eventsByRun.get(runId.value) ?? [];
  }

  clearRun(runId: RunId): void {
    this.eventsByRun.delete(runId.value);
    this.idempByRun.delete(runId.value);
    this.snapshotsByRun.delete(runId.value);
  }

  private calculateStatus(events: EventEnvelope[]): RunStatusValue {
    let status: RunStatusValue = 'PENDING';
    for (const event of events) {
      switch (event.eventType) {
        case 'RunStarted':
          status = 'RUNNING';
          break;
        case 'RunPaused':
          status = 'PAUSED';
          break;
        case 'RunResumed':
          status = 'RUNNING';
          break;
        case 'RunCompleted':
          status = 'COMPLETED';
          break;
        case 'RunFailed':
          status = 'FAILED';
          break;
        case 'RunCancelled':
          status = 'CANCELLED';
          break;
      }
    }
    return status;
  }
}

export class TestOutbox {
  private readonly records = new Map<string, OutboxRecord>();
  private idCounter = 0;

  async enqueueTx(_runId: string, events: EventEnvelope[]): Promise<void> {
    for (const event of events) {
      if (event.runSeq === undefined) {
        throw new Error('Events must have runSeq before enqueue');
      }
    }

    for (const event of events) {
      const id = `outbox-${++this.idCounter}`;
      const record: OutboxRecord = {
        id,
        createdAt: new Date().toISOString(),
        idempotencyKey: event.idempotencyKey,
        payload: event,
        attempts: 0,
      };
      this.records.set(id, record);
    }
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return Array.from(this.records.values())
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);
  }

  async markDelivered(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.records.delete(id);
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.attempts += 1;
      record.lastError = error;
      this.records.set(id, record);
    }
  }

  listAll(): OutboxRecord[] {
    return Array.from(this.records.values()).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    );
  }

  getRecord(id: string): OutboxRecord | undefined {
    return this.records.get(id);
  }

  findByIdempotencyKey(key: string): OutboxRecord[] {
    return Array.from(this.records.values()).filter((record) => record.idempotencyKey === key);
  }

  getFailedRecords(): OutboxRecord[] {
    return Array.from(this.records.values()).filter((record) => record.lastError !== undefined);
  }

  getRecordsByAttempts(attemptCount: number): OutboxRecord[] {
    return Array.from(this.records.values()).filter((record) => record.attempts === attemptCount);
  }

  get count(): number {
    return this.records.size;
  }

  clear(): void {
    this.records.clear();
    this.idCounter = 0;
  }

  hasEventWithIdempotencyKey(key: string): boolean {
    return this.findByIdempotencyKey(key).length > 0;
  }
}

export class TestProjector {
  rebuild(
    runId: string,
    events: EventEnvelope[]
  ): {
    runId: string;
    status: RunStatusValue;
  } {
    let status: RunStatusValue = 'PENDING';

    for (const event of events) {
      if (event.eventType === 'RunStarted') status = 'RUNNING';
      if (event.eventType === 'RunPaused') status = 'PAUSED';
      if (event.eventType === 'RunResumed') status = 'RUNNING';
      if (event.eventType === 'RunCompleted') status = 'COMPLETED';
      if (event.eventType === 'RunFailed') status = 'FAILED';
      if (event.eventType === 'RunCancelled') status = 'CANCELLED';
    }

    return {
      runId,
      status,
    };
  }
}
