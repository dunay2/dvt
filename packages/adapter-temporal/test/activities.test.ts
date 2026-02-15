import type { PlanRef, RunContext } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { createActivities, type ActivityDeps } from '../src/activities/stepActivities.js';
import type {
  EventEnvelope,
  EventType,
  IIdempotencyKeyBuilder,
  RunMetadata,
} from '../src/engine-types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAN_JSON = {
  metadata: { planId: 'p1', planVersion: 'v1', schemaVersion: 's1' },
  steps: [
    { stepId: 'step-a', kind: 'test' },
    { stepId: 'step-b', kind: 'test' },
  ],
};

const PLAN_BYTES = Buffer.from(JSON.stringify(PLAN_JSON), 'utf-8');

const PLAN_REF: PlanRef = {
  uri: 's3://bucket/plans/p1.json',
  sha256: 'ignored-in-mock',
  schemaVersion: 's1',
  planId: 'p1',
  planVersion: 'v1',
};

const CTX: RunContext = {
  tenantId: 'tenant-1',
  projectId: 'proj-1',
  environmentId: 'env-1',
  runId: 'run-1',
  targetAdapter: 'temporal',
};

class TestClock {
  nowIsoUtc(): string {
    return '2026-01-01T00:00:00.000Z';
  }
}

class TestIdempotencyKeyBuilder implements IIdempotencyKeyBuilder {
  runEventKey(e: {
    eventType: EventType;
    tenantId: string;
    runId: string;
    logicalAttemptId: number;
    engineAttemptId: number;
    stepId?: string;
  }): string {
    return [e.eventType, e.tenantId, e.runId, String(e.logicalAttemptId), e.stepId ?? ''].join('|');
  }
}

class TestTxStore {
  private readonly eventsByRun = new Map<string, EventEnvelope[]>();
  private readonly metadataByRun = new Map<string, RunMetadata>();

  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    this.metadataByRun.set(meta.runId, meta);
  }

  async getRunMetadataByRunId(runId: string): Promise<RunMetadata | null> {
    return this.metadataByRun.get(runId) ?? null;
  }

  async appendEventsTx(
    runId: string,
    envelopes: Omit<EventEnvelope, 'runSeq'>[]
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[] }> {
    const current = this.eventsByRun.get(runId) ?? [];
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    for (const env of envelopes) {
      const exists = current.some((e) => e.idempotencyKey === env.idempotencyKey);
      if (exists) {
        deduped.push({
          ...env,
          runSeq: current.length + deduped.length + appended.length + 1,
        } as EventEnvelope);
        continue;
      }

      const withSeq = { ...env, runSeq: current.length + appended.length + 1 } as EventEnvelope;
      current.push(withSeq);
      appended.push(withSeq);
    }

    this.eventsByRun.set(runId, current);
    return { appended, deduped };
  }

  async listEvents(runId: string): Promise<EventEnvelope[]> {
    return [...(this.eventsByRun.get(runId) ?? [])];
  }

  async enqueueTx(_runId: string, _events: EventEnvelope[]): Promise<void> {
    // no-op for tests
  }
}

class FailingFirstAppendStateStore extends TestTxStore {
  private first = true;

  override async appendEventsTx(
    runId: string,
    envelopes: Omit<EventEnvelope, 'runSeq'>[]
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[] }> {
    if (this.first) {
      this.first = false;
      throw new Error('TRANSIENT_DB_ERROR');
    }
    return super.appendEventsTx(runId, envelopes);
  }
}

function buildDeps(store: TestTxStore = new TestTxStore()): ActivityDeps {
  return {
    stateStore: store,
    outbox: store,
    clock: new TestClock(),
    idempotency: new TestIdempotencyKeyBuilder(),
    fetcher: { fetch: vi.fn(async () => PLAN_BYTES) },
    integrity: {
      fetchAndValidate: vi.fn(async (_ref, fetcher) => fetcher.fetch(_ref)),
    } as unknown as ActivityDeps['integrity'],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stepActivities', () => {
  describe('fetchPlan', () => {
    it('validates integrity and parses plan', async () => {
      const deps = buildDeps();
      const acts = createActivities(deps);

      const plan = await acts.fetchPlan(PLAN_REF);

      expect(plan.metadata.planId).toBe('p1');
      expect(plan.steps).toHaveLength(2);
      expect(deps.integrity.fetchAndValidate).toHaveBeenCalledWith(PLAN_REF, deps.fetcher);
    });

    it('rejects plan when metadata does not match PlanRef', async () => {
      const deps = buildDeps();
      const acts = createActivities(deps);

      const badRef: PlanRef = { ...PLAN_REF, planId: 'wrong-id' };

      await expect(acts.fetchPlan(badRef)).rejects.toThrow('PLAN_REF_MISMATCH: planId');
    });
  });

  describe('emitEvent', () => {
    it('persists event to state store', async () => {
      const deps = buildDeps();
      const acts = createActivities(deps);

      await acts.emitEvent({ ctx: CTX, eventType: 'RunStarted' });

      const events = await deps.stateStore.listEvents('run-1');
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe('RunStarted');
      expect(events[0]!.runId).toBe('run-1');
      expect(events[0]!.tenantId).toBe('tenant-1');
      expect(events[0]!.runSeq).toBe(1);
    });

    it('is idempotent — duplicate calls produce single event', async () => {
      const deps = buildDeps();
      const acts = createActivities(deps);

      await acts.emitEvent({ ctx: CTX, eventType: 'RunStarted' });
      await acts.emitEvent({ ctx: CTX, eventType: 'RunStarted' });

      const events = await deps.stateStore.listEvents('run-1');
      expect(events.filter((e) => e.eventType === 'RunStarted')).toHaveLength(1);
    });

    it('emits step events with stepId', async () => {
      const deps = buildDeps();
      const acts = createActivities(deps);

      await acts.emitEvent({ ctx: CTX, eventType: 'StepStarted', stepId: 'step-a' });
      await acts.emitEvent({ ctx: CTX, eventType: 'StepCompleted', stepId: 'step-a' });

      const events = await deps.stateStore.listEvents('run-1');
      expect(events).toHaveLength(2);
      expect(events[0]!.eventType).toBe('StepStarted');
      expect((events[0] as { stepId: string }).stepId).toBe('step-a');
    });

    it('retry-safe: transient failure then retry persists one logical event', async () => {
      const store = new FailingFirstAppendStateStore();
      const deps = buildDeps(store);
      const acts = createActivities(deps);

      await expect(acts.emitEvent({ ctx: CTX, eventType: 'RunStarted' })).rejects.toThrow(
        'TRANSIENT_DB_ERROR'
      );

      await acts.emitEvent({ ctx: CTX, eventType: 'RunStarted' });
      await acts.emitEvent({ ctx: CTX, eventType: 'RunStarted' });

      const events = await deps.stateStore.listEvents('run-1');
      const runStarted = events.filter((e) => e.eventType === 'RunStarted');
      expect(runStarted).toHaveLength(1);
      expect(runStarted[0]!.idempotencyKey).toBe('RunStarted|tenant-1|run-1|1|');
    });

    it('idempotency key is stable across engineAttemptId when logicalAttemptId is unchanged', () => {
      const keyForEngine1 = new TestIdempotencyKeyBuilder().runEventKey({
        eventType: 'RunStarted',
        tenantId: 't',
        runId: 'r',
        logicalAttemptId: 1,
        engineAttemptId: 1,
      } as any);

      const keyForEngine2 = new TestIdempotencyKeyBuilder().runEventKey({
        eventType: 'RunStarted',
        tenantId: 't',
        runId: 'r',
        logicalAttemptId: 1,
        engineAttemptId: 2,
      } as any);

      expect(keyForEngine1).toBe(keyForEngine2);

      const keySame = new TestIdempotencyKeyBuilder().runEventKey({
        eventType: 'RunStarted',
        tenantId: 't',
        runId: 'r',
        logicalAttemptId: 1,
        engineAttemptId: 1,
      } as any);
      expect(keySame).toBe(keyForEngine1);
    });
  });

  describe('executeStep', () => {
    it('returns COMPLETED for valid step', async () => {
      const deps = buildDeps();
      const acts = createActivities(deps);

      const result = await acts.executeStep({
        step: { stepId: 's1', kind: 'test' },
        ctx: CTX,
      });

      expect(result).toEqual({ stepId: 's1', status: 'COMPLETED' });
    });

    it('accepts step with only stepId (kind is optional)', async () => {
      const deps = buildDeps();
      const acts = createActivities(deps);

      const result = await acts.executeStep({
        step: { stepId: 's1' },
        ctx: CTX,
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('rejects step with unknown fields', async () => {
      const deps = buildDeps();
      const acts = createActivities(deps);

      await expect(
        acts.executeStep({
          step: { stepId: 's1', kind: 'test', forbidden: 'field' },
          ctx: CTX,
        })
      ).rejects.toThrow('INVALID_STEP_SCHEMA: field_not_allowed:forbidden');
    });
  });

  describe('saveRunMetadata', () => {
    it('persists metadata to state store', async () => {
      const deps = buildDeps();
      const acts = createActivities(deps);

      await acts.saveRunMetadata({
        tenantId: 'tenant-1',
        projectId: 'proj-1',
        environmentId: 'env-1',
        runId: 'run-1',
        provider: 'temporal',
        providerWorkflowId: 'run-1',
        providerRunId: 'run-1',
      });

      const meta = await deps.stateStore.getRunMetadataByRunId('run-1');
      expect(meta).not.toBeNull();
      expect(meta!.provider).toBe('temporal');
    });
  });
});
