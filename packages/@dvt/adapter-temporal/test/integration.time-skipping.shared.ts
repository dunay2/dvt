/**
 * @file packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0010: Run Event Envelope Split
 * @baseline ADR-0011: RunStarted Ownership
 * @decision Shared Temporal integration harness stays outside individual test files
 * @consequence General and capability-specific integration lanes can stay hermetic
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PlanRef, ResolvedRunContext, RunStateCommandPort } from '@dvt/contracts';

import type { ActivityDeps } from '../src/activities/stepActivities.js';
import type {
  EventEnvelope as TemporalEventEnvelope,
  EventIdempotencyInput,
  EventInput,
  RunMetadata,
} from '../src/engine-types.js';

interface OutboxRecord {
  id: string;
  createdAt: string;
  idempotencyKey: string;
  payload: unknown;
  attempts: number;
  lastError?: string;
}

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
export const WORKFLOW_PATH = resolve(TEST_DIR, '../src/workflows/RunPlanWorkflow.ts');
const WORKFLOW_JS_PATH = WORKFLOW_PATH.replace(/\.ts$/, '.js');
const WORKFLOW_DIST_JS_PATH = resolve(TEST_DIR, '../dist/workflows/RunPlanWorkflow.js');

export const INTEGRATION_TEST_TIMEOUT = 120_000;

export function assertWorkflowArtifactPresentInCi(): void {
  if (!existsSync(WORKFLOW_JS_PATH) && !existsSync(WORKFLOW_DIST_JS_PATH) && process.env.CI) {
    console.error(`
❌ Workflow artifact not found: ${WORKFLOW_JS_PATH} (or ${WORKFLOW_DIST_JS_PATH})
 Run 'pnpm build' first or ensure build completes successfully.
`);
    process.exit(1);
  }
}

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

interface RunSnapshot {
  runId: string;
  status: RunStatusValue;
  lastEventSeq: number;
  projectedAt: string;
}

interface EventSliceQuery {
  runId: RunId;
  afterSeq?: number;
  limit?: number;
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

class TestIdempotency {
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
}

class TestClock {
  nowIsoUtc(): string {
    return '2026-01-01T00:00:00.000Z';
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
      providerConductorUrl?: string;
    }
  ): Promise<void> {
    // no-op for integration tests
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

class TestIntegrity {
  async fetchAndValidate(
    planRef: PlanRef,
    fetcher: { fetch(planRef: PlanRef): Promise<Uint8Array> }
  ): Promise<Uint8Array> {
    const bytes = await fetcher.fetch(planRef);
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== planRef.sha256) {
      throw new Error('PLAN_INTEGRITY_VALIDATION_FAILED');
    }
    return bytes;
  }
}

export function createPlanRef(
  planId: string,
  planBytes: Uint8Array,
  options?: {
    uri?: string;
  }
): PlanRef {
  return {
    uri: options?.uri ?? `memory://plans/${planId}.json`,
    sha256: sha256Hex(planBytes),
    schemaVersion: 'v1.2',
    planId,
    planVersion: '1.0.0',
    sizeBytes: planBytes.byteLength,
  };
}

export function createRunContext(runId: RunId): ResolvedRunContext {
  return {
    tenantId: 't-it',
    projectId: 'p-it',
    environmentId: 'test',
    runId: runId.value,
    targetAdapter: 'temporal',
    logicalAttemptId: 1,
    originRunId: runId.value,
  };
}

export function createActivityDeps(
  store: TestStateStore,
  _outbox: TestOutbox,
  planBytes: Uint8Array,
  options?: {
    onFetch?: (planRef: PlanRef) => void;
  }
): ActivityDeps {
  const runStateCommandPort: RunStateCommandPort = {
    bootstrapRun: (input) => store.bootstrapRunTx(input),
    appendTransitions: (runId, events) => store.appendAndEnqueueTx(runId, events),
  };

  return {
    runStateCommandPort,
    clock: new TestClock(),
    idempotency: new TestIdempotency(),
    fetcher: {
      fetch: async (planRef) => {
        options?.onFetch?.(planRef);
        return planBytes;
      },
    },
    integrity: new TestIntegrity(),
  };
}

export function mkLinearThreeStepPlan(): unknown {
  return {
    metadata: {
      planId: 'it-plan-linear-3',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: [
      { stepId: 's-1', kind: 'DBT_MODEL' },
      { stepId: 's-2', kind: 'DBT_MODEL', dependsOn: ['s-1'] },
      { stepId: 's-3', kind: 'DBT_MODEL', dependsOn: ['s-2'] },
    ],
  } as const;
}

export function mkPermanentFailurePlan(): unknown {
  return {
    metadata: {
      planId: 'it-plan-permanent-failure',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: [{ stepId: 's-fail', kind: 'DBT_MODEL' }],
  } as const;
}

export function mkPostgresTransformationPlan(schema: string, sinkTable: string): unknown {
  return withTransformationRuntimeBinding(
    {
      metadata: {
        planId: 'it-plan-postgres-transform',
        planVersion: '1.0.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
      },
      steps: [
        {
          stepId: 's-1',
          kind: 'PREPARE_POSTGRES_TRANSFORM',
          stepTypeConfig: {
            targetSchema: schema,
          },
        },
        {
          stepId: 's-2',
          kind: 'POSTGRES_SQL_TRANSFORM',
          dependsOn: ['s-1'],
          stepTypeConfig: {
            sql: 'SELECT 1 AS order_id UNION ALL SELECT 2 AS order_id',
            sinkSchema: schema,
            sinkTable,
            materialization: 'table',
            writeMode: 'replace',
          },
        },
        {
          stepId: 's-3',
          kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
          dependsOn: ['s-2'],
          stepTypeConfig: {
            sinkSchema: schema,
            sinkTable,
          },
        },
      ],
    } as const,
    'postgres'
  );
}

export function withTransformationRuntimeBinding<T extends Record<string, unknown>>(
  plan: T,
  executor: 'postgres' | 'dbt'
): T {
  const currentObservability =
    typeof plan['observability'] === 'object' && plan['observability'] !== null
      ? (plan['observability'] as Record<string, unknown>)
      : {};
  const currentExtra =
    typeof currentObservability['extra'] === 'object' && currentObservability['extra'] !== null
      ? (currentObservability['extra'] as Record<string, unknown>)
      : {};

  return {
    ...plan,
    observability: {
      ...currentObservability,
      extra: {
        ...currentExtra,
        transformationFlowRuntime: {
          previewProfile: 'transformation-sql-first-v1',
          executor,
        },
      },
    },
  };
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export type WaitForConditionFn = <T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  opts?: { timeoutMs?: number; intervalMs?: number }
) => Promise<T>;

export async function waitForCondition<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 5_000;
  const intervalMs = opts.intervalMs ?? 50;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const value = await fn();
    if (predicate(value)) {
      return value;
    }
    if (Date.now() >= deadline) {
      throw new Error(`TIMEOUT_WAITING_FOR_CONDITION after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
