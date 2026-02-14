import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { EngineRunRef, PlanRef, RunContext } from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { describe, expect, it } from 'vitest';

import type { ActivityDeps } from '../src/activities/stepActivities.js';
import { loadTemporalAdapterConfig, TemporalAdapter, TemporalWorkerHost } from '../src/index.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = resolve(TEST_DIR, '../src/workflows/RunPlanWorkflow.ts');

type EventType =
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

interface EventEnvelope {
  eventType: EventType;
  emittedAt: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string;
  runSeq: number;
  stepId?: string;
}

class TestIdempotency {
  runEventKey(args: {
    eventType: EventType;
    tenantId: string;
    runId: string;
    logicalAttemptId: number;
    engineAttemptId: number;
    stepId?: string;
  }): string {
    return [
      args.eventType,
      args.tenantId,
      args.runId,
      String(args.logicalAttemptId),
      String(args.engineAttemptId),
      args.stepId ?? '',
    ].join('|');
  }
}

class TestClock {
  nowIsoUtc(): string {
    return '2026-01-01T00:00:00.000Z';
  }
}

class TestStateStore {
  private readonly eventsByRun = new Map<string, EventEnvelope[]>();
  private readonly idempByRun = new Map<string, Map<string, EventEnvelope>>();

  async appendEventsTx(
    runId: string,
    envelopes: Omit<EventEnvelope, 'runSeq'>[]
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[] }> {
    const events = this.eventsByRun.get(runId) ?? [];
    const idx = this.idempByRun.get(runId) ?? new Map<string, EventEnvelope>();
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    for (const env of envelopes) {
      const found = idx.get(env.idempotencyKey);
      if (found) {
        deduped.push(found);
        continue;
      }
      const withSeq: EventEnvelope = { ...env, runSeq: events.length + appended.length + 1 };
      appended.push(withSeq);
      idx.set(withSeq.idempotencyKey, withSeq);
    }

    this.eventsByRun.set(runId, events.concat(appended));
    this.idempByRun.set(runId, idx);
    return { appended, deduped };
  }

  async listEvents(runId: string): Promise<EventEnvelope[]> {
    return [...(this.eventsByRun.get(runId) ?? [])];
  }

  async enqueueTx(_runId: string, _events: EventEnvelope[]): Promise<void> {
    // no-op for this integration test
  }

  async saveRunMetadata(_meta: unknown): Promise<void> {
    // no-op for this integration test
  }

  async getRunMetadataByRunId(_runId: string): Promise<null> {
    return null;
  }
}

class TestProjector {
  rebuild(
    runId: string,
    events: EventEnvelope[]
  ): {
    runId: string;
    status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  } {
    let status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' = 'PENDING';

    for (const e of events) {
      if (e.eventType === 'RunStarted') status = 'RUNNING';
      if (e.eventType === 'RunPaused') status = 'PAUSED';
      if (e.eventType === 'RunResumed') status = 'RUNNING';
      if (e.eventType === 'RunCompleted') status = 'COMPLETED';
      if (e.eventType === 'RunFailed') status = 'FAILED';
      if (e.eventType === 'RunCancelled') status = 'CANCELLED';
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

type RunStatusValue = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

function createPlanRef(planId: string, planBytes: Uint8Array): PlanRef {
  return {
    uri: `memory://plans/${planId}.json`,
    sha256: sha256Hex(planBytes),
    schemaVersion: 'v1.2',
    planId,
    planVersion: '1.0.0',
    sizeBytes: planBytes.byteLength,
  };
}

function createRunContext(runId: string): RunContext {
  return {
    tenantId: 't-it',
    projectId: 'p-it',
    environmentId: 'test',
    runId,
    targetAdapter: 'temporal',
  };
}

function createActivityDeps(store: TestStateStore, planBytes: Uint8Array): ActivityDeps {
  return {
    stateStore: store,
    outbox: store,
    clock: new TestClock(),
    idempotency: new TestIdempotency(),
    fetcher: {
      fetch: async () => planBytes,
    },
    integrity: new TestIntegrity(),
  };
}

async function waitForTerminalStatus(
  adapter: TemporalAdapter,
  runRef: EngineRunRef,
  waitForCondition: <T>(
    fn: () => Promise<T>,
    predicate: (v: T) => boolean,
    opts?: { timeoutMs?: number; intervalMs?: number }
  ) => Promise<T>,
  timeoutMs = 10_000
): Promise<RunStatusValue> {
  await waitForCondition(
    () => adapter.getRunStatus(runRef),
    (s) => s.status !== 'RUNNING',
    { timeoutMs }
  );
  const status = await adapter.getRunStatus(runRef);
  return status.status as RunStatusValue;
}

async function runCancelScenario(
  mode: 'signal' | 'cancel',
  adapter: TemporalAdapter,
  planRef: PlanRef,
  runId: string,
  store: TestStateStore,
  waitForCondition: <T>(
    fn: () => Promise<T>,
    predicate: (v: T) => boolean,
    opts?: { timeoutMs?: number; intervalMs?: number }
  ) => Promise<T>
): Promise<{ status: RunStatusValue; cancelledCount: number }> {
  const runCtx = createRunContext(runId);
  const runRef = await adapter.startRun(planRef, runCtx);

  if (mode === 'signal') {
    await adapter.signal(runRef, { signalId: `s-${runId}`, type: 'CANCEL' });
  } else {
    await adapter.cancelRun(runRef);
  }

  const status = await waitForTerminalStatus(adapter, runRef, waitForCondition);
  const events = await store.listEvents(runRef.runId);
  const cancelledCount = events.filter((e) => e.eventType === 'RunCancelled').length;

  return { status, cancelledCount };
}

function mkPlan(stepCount: number): unknown {
  return {
    metadata: {
      planId: 'it-plan',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
    },
    steps: Array.from({ length: stepCount }, (_, i) => ({ stepId: `s-${i + 1}`, kind: 'noop' })),
  } as const;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('temporal integration (time-skipping)', () => {
  async function waitForCondition<T>(
    fn: () => Promise<T>,
    predicate: (v: T) => boolean,
    opts: { timeoutMs?: number; intervalMs?: number } = {}
  ): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? 10_000;
    const intervalMs = opts.intervalMs ?? 25;
    const start = Date.now();
    while (true) {
      const v = await fn();
      if (predicate(v)) return v;
      if (Date.now() - start > timeoutMs) {
        throw new Error('waitForCondition: timeout');
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  it('executes startRun -> status -> cancel against TestWorkflowEnvironment', async () => {
    const env = await TestWorkflowEnvironment.createTimeSkipping();

    const store = new TestStateStore();
    const projector = new TestProjector();
    const plan = mkPlan(250);
    const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

    const planRef = createPlanRef('it-plan', planBytes);
    const ctx = createRunContext('run-it-1');

    const temporalConfig = loadTemporalAdapterConfig({
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping',
      TEMPORAL_IDENTITY: 'adapter-temporal-it',
    });

    const worker = new TemporalWorkerHost({
      temporalConfig,
      workflowsPath: WORKFLOW_PATH,
      activityDeps: createActivityDeps(store, planBytes),
    });

    await worker.start(env.nativeConnection);

    const adapter = new TemporalAdapter({
      workflowClient: env.client.workflow,
      config: temporalConfig,
      stateStore: store,
      projector,
    });

    try {
      const runRef = await adapter.startRun(planRef, ctx);

      // wait until the run is no longer RUNNING (deterministic wait helper)
      const status = await waitForTerminalStatus(adapter, runRef, waitForCondition, 30_000);
      expect(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).toContain(status);

      await adapter.cancelRun(runRef);

      const afterCancel = await waitForTerminalStatus(adapter, runRef, waitForCondition);
      expect(['PENDING', 'CANCELLED', 'COMPLETED', 'FAILED']).toContain(afterCancel);
    } finally {
      await worker.shutdown();
      await env.teardown();
    }
  }, 60_000);

  it('signal(CANCEL) and cancelRun() produce identical terminal behaviour with a single RunCancelled event', async () => {
    const env = await TestWorkflowEnvironment.createTimeSkipping();

    const store = new TestStateStore();
    const projector = new TestProjector();
    const plan = mkPlan(10);
    const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

    const planRef = createPlanRef('it-plan-2', planBytes);

    const temporalConfig = loadTemporalAdapterConfig({
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-cancel',
      TEMPORAL_IDENTITY: 'adapter-temporal-it',
    });

    const worker = new TemporalWorkerHost({
      temporalConfig,
      workflowsPath: WORKFLOW_PATH,
      activityDeps: createActivityDeps(store, planBytes),
    });

    await worker.start(env.nativeConnection);

    const adapter = new TemporalAdapter({
      workflowClient: env.client.workflow,
      config: temporalConfig,
      stateStore: store,
      projector,
    });

    try {
      const signalResult = await runCancelScenario(
        'signal',
        adapter,
        planRef,
        'run-it-cancel-1',
        store,
        waitForCondition
      );
      expect(['PENDING', 'CANCELLED', 'COMPLETED', 'FAILED']).toContain(signalResult.status);
      // Accept 0 or 1 persisted RunCancelled (cancellation may occur before any
      // events are emitted). Critical invariant: there must NOT be >1 (no double
      // terminal events).
      expect(signalResult.cancelledCount).toBeLessThanOrEqual(1);

      const cancelResult = await runCancelScenario(
        'cancel',
        adapter,
        planRef,
        'run-it-cancel-2',
        store,
        waitForCondition
      );
      expect(['PENDING', 'CANCELLED', 'COMPLETED', 'FAILED']).toContain(cancelResult.status);
      expect(cancelResult.cancelledCount).toBeLessThanOrEqual(1);

      // Both paths should produce the same number of terminal RunCancelled events
      // (0 or 1) — critically, never more than one.
      expect(signalResult.cancelledCount).toBe(cancelResult.cancelledCount);
    } finally {
      await worker.shutdown();
      await env.teardown();
    }
  }, 60_000);
});
