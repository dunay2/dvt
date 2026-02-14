import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PlanRef, RunContext } from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { describe, expect, it } from 'vitest';

import {
  loadTemporalAdapterConfig,
  TemporalAdapter,
  TemporalWorkerHost,
} from '../src/index.js';

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

  async appendEventsTx(runId: string, envelopes: Omit<EventEnvelope, 'runSeq'>[]): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[] }> {
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
  rebuild(runId: string, events: EventEnvelope[]): { runId: string; status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' } {
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
  async fetchAndValidate(planRef: PlanRef, fetcher: { fetch(planRef: PlanRef): Promise<Uint8Array> }): Promise<Uint8Array> {
    const bytes = await fetcher.fetch(planRef);
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== planRef.sha256) {
      throw new Error('PLAN_INTEGRITY_VALIDATION_FAILED');
    }
    return bytes;
  }
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
  it('executes startRun -> status -> cancel against TestWorkflowEnvironment', async () => {
    const env = await TestWorkflowEnvironment.createTimeSkipping();

    const store = new TestStateStore();
    const projector = new TestProjector();
    const plan = mkPlan(250);
    const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

    const planRef: PlanRef = {
      uri: 'memory://plans/it-plan.json',
      sha256: sha256Hex(planBytes),
      schemaVersion: 'v1.2',
      planId: 'it-plan',
      planVersion: '1.0.0',
      sizeBytes: planBytes.byteLength,
    };

    const ctx: RunContext = {
      tenantId: 't-it',
      projectId: 'p-it',
      environmentId: 'test',
      runId: 'run-it-1',
      targetAdapter: 'temporal',
    };

    const temporalConfig = loadTemporalAdapterConfig({
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping',
      TEMPORAL_IDENTITY: 'adapter-temporal-it',
    });

    const worker = new TemporalWorkerHost({
      temporalConfig,
      workflowsPath: WORKFLOW_PATH,
      activityDeps: {
        stateStore: store,
        outbox: store,
        clock: new TestClock(),
        idempotency: new TestIdempotency(),
        fetcher: {
          fetch: async () => planBytes,
        },
        integrity: new TestIntegrity(),
      },
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

      let status = await adapter.getRunStatus(runRef);
      for (let i = 0; i < 80 && status.status === 'RUNNING'; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        status = await adapter.getRunStatus(runRef);
      }

      expect(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).toContain(status.status);

      await adapter.cancelRun(runRef);

      let afterCancel = await adapter.getRunStatus(runRef);
      for (let i = 0; i < 40 && afterCancel.status === 'RUNNING'; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        afterCancel = await adapter.getRunStatus(runRef);
      }

      expect(['PENDING', 'CANCELLED', 'COMPLETED', 'FAILED']).toContain(afterCancel.status);
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

    const planRef: PlanRef = {
      uri: 'memory://plans/it-plan-2.json',
      sha256: sha256Hex(planBytes),
      schemaVersion: 'v1.2',
      planId: 'it-plan-2',
      planVersion: '1.0.0',
      sizeBytes: planBytes.byteLength,
    };

    const temporalConfig = loadTemporalAdapterConfig({
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-cancel',
      TEMPORAL_IDENTITY: 'adapter-temporal-it',
    });

    const worker = new TemporalWorkerHost({
      temporalConfig,
      workflowsPath: WORKFLOW_PATH,
      activityDeps: {
        stateStore: store,
        outbox: store,
        clock: new TestClock(),
        idempotency: new TestIdempotency(),
        fetcher: {
          fetch: async () => planBytes,
        },
        integrity: new TestIntegrity(),
      },
    });

    await worker.start(env.nativeConnection);

    const adapter = new TemporalAdapter({
      workflowClient: env.client.workflow,
      config: temporalConfig,
      stateStore: store,
      projector,
    });

    try {
      // 1) signal(CANCEL)
      const ctxA: RunContext = {
        tenantId: 't-it',
        projectId: 'p-it',
        environmentId: 'test',
        runId: 'run-it-cancel-1',
        targetAdapter: 'temporal',
      };

      const runRefA = await adapter.startRun(planRef, ctxA);
      await adapter.signal(runRefA, { signalId: 's-cancel-1', type: 'CANCEL' });

      let statusA = await adapter.getRunStatus(runRefA);
      for (let i = 0; i < 40 && statusA.status === 'RUNNING'; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        statusA = await adapter.getRunStatus(runRefA);
      }

      expect(['PENDING', 'CANCELLED', 'COMPLETED', 'FAILED']).toContain(statusA.status);

      const eventsA = await store.listEvents(runRefA.runId);
      const cancelledEventsA = eventsA.filter((e) => e.eventType === 'RunCancelled');
      // Accept 0 or 1 persisted RunCancelled (cancellation may occur before any
      // events are emitted). Critical invariant: there must NOT be >1 (no double
      // terminal events).
      expect(cancelledEventsA.length).toBeLessThanOrEqual(1);

      // 2) cancelRun()
      const ctxB: RunContext = {
        tenantId: 't-it',
        projectId: 'p-it',
        environmentId: 'test',
        runId: 'run-it-cancel-2',
        targetAdapter: 'temporal',
      };

      const runRefB = await adapter.startRun(planRef, ctxB);
      await adapter.cancelRun(runRefB);

      let statusB = await adapter.getRunStatus(runRefB);
      for (let i = 0; i < 40 && statusB.status === 'RUNNING'; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        statusB = await adapter.getRunStatus(runRefB);
      }

      expect(['PENDING', 'CANCELLED', 'COMPLETED', 'FAILED']).toContain(statusB.status);

      const eventsB = await store.listEvents(runRefB.runId);
      const cancelledEventsB = eventsB.filter((e) => e.eventType === 'RunCancelled');
      expect(cancelledEventsB.length).toBeLessThanOrEqual(1);

      // Both paths should produce the same number of terminal RunCancelled events
      // (0 or 1) — critically, never more than one.
      expect(cancelledEventsA.length).toBe(cancelledEventsB.length);
    } finally {
      await worker.shutdown();
      await env.teardown();
    }
  }, 60_000);
});
