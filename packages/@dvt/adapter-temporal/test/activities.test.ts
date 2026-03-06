import type { PlanRef, RunContext } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  createActivities,
  type ActivityDeps,
  type StepInput,
} from '../src/activities/stepActivities.js';
import type {
  AppendResult,
  EventEnvelope,
  EventInput,
  EventType,
  IIdempotencyKeyBuilder,
  RunMetadata,
  RunStateCommandPort,
} from '../src/engine-types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAN_JSON = {
  metadata: { planId: 'p1', planVersion: 'v1', schemaVersion: 's1', contractVersion: '1.0.0' },
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

const DEFAULT_LOGICAL_ATTEMPT_ID = 1;
const FIXED_TIME = '2026-01-01T00:00:00.000Z';

class TestClock {
  nowIsoUtc(): string {
    return FIXED_TIME;
  }
}

class TestIdempotencyKeyBuilder implements IIdempotencyKeyBuilder {
  private counter = 0;

  eventId(): string {
    this.counter += 1;
    return `test-event-id-${this.counter}`;
  }

  runEventKey(e: {
    eventType: EventType;
    tenantId: string;
    runId: string;
    logicalAttemptId: number;
    planId: string;
    planVersion: string;
    stepId?: string;
  }): string {
    return [e.eventType, e.tenantId, e.runId, String(e.logicalAttemptId), e.stepId ?? ''].join('|');
  }
}

class TestRunStateStore implements RunStateCommandPort {
  private readonly clock = new TestClock();
  private readonly eventsByRun = new Map<string, EventEnvelope[]>();
  private readonly metadataByRun = new Map<string, RunMetadata>();

  async bootstrapRun(input: {
    metadata: RunMetadata;
    firstEvents: EventInput[];
  }): Promise<AppendResult> {
    this.metadataByRun.set(input.metadata.runId, input.metadata);
    if (input.firstEvents.length === 0) {
      return { appended: [], deduped: [], lastSeq: 0 };
    }

    return this.appendTransitions(input.metadata.runId, input.firstEvents);
  }

  async appendTransitions(runId: string, events: EventInput[]): Promise<AppendResult> {
    const current = this.eventsByRun.get(runId) ?? [];
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    for (const event of events) {
      const existing = current.find(
        (candidate) => candidate.idempotencyKey === event.idempotencyKey
      );
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const withSeq: EventEnvelope = {
        ...event,
        runSeq: current.length + 1,
        persistedAt: this.clock.nowIsoUtc(),
      };
      current.push(withSeq);
      appended.push(withSeq);
    }

    this.eventsByRun.set(runId, current);
    return {
      appended,
      deduped,
      lastSeq: current.at(-1)?.runSeq ?? 0,
    };
  }

  async listEvents(tenantId: string, runId: string): Promise<EventEnvelope[]> {
    const events = this.eventsByRun.get(runId) ?? [];
    return events.filter((event) => event.tenantId === tenantId);
  }

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    const metadata = this.metadataByRun.get(runId);
    if (!metadata || metadata.tenantId !== tenantId) {
      return null;
    }

    return metadata;
  }
}

class FailingFirstAppendStateStore extends TestRunStateStore {
  private first = true;

  override async appendTransitions(runId: string, events: EventInput[]): Promise<AppendResult> {
    if (this.first) {
      this.first = false;
      throw new Error('TRANSIENT_DB_ERROR');
    }

    return super.appendTransitions(runId, events);
  }
}

type ActivityTestHarness = {
  deps: ActivityDeps;
  store: TestRunStateStore;
};

function buildDeps(store: TestRunStateStore = new TestRunStateStore()): ActivityTestHarness {
  return {
    store,
    deps: {
      runStateCommandPort: store,
      clock: new TestClock(),
      idempotency: new TestIdempotencyKeyBuilder(),
      fetcher: { fetch: vi.fn(async () => PLAN_BYTES) },
      integrity: {
        fetchAndValidate: vi.fn(async (ref, fetcher) => fetcher.fetch(ref)),
      },
    },
  };
}

function assertStepEventHasId(event: EventEnvelope, stepId: string): void {
  if (!('stepId' in event) || typeof event.stepId !== 'string') {
    throw new Error('expected a step event envelope');
  }
  expect(event.stepId).toBe(stepId);
}

function readGatewayDecision(event: EventEnvelope): boolean | undefined {
  const payload = event.payload;
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const decision = payload['gatewayDecision'];
  return typeof decision === 'boolean' ? decision : undefined;
}

async function expectExecuteStepRejects(step: unknown, expectedError: string): Promise<void> {
  const { deps } = buildDeps();
  const acts = createActivities(deps);

  await expect(
    acts.executeStep({
      step: step as StepInput['step'],
      ctx: CTX,
    })
  ).rejects.toThrow(expectedError);
}

async function loadRunEvents(store: TestRunStateStore): Promise<EventEnvelope[]> {
  return store.listEvents(CTX.tenantId, CTX.runId);
}

function expectSingleRunStartedEvent(
  events: EventEnvelope[],
  options: { logicalAttemptId?: number; engineAttemptId?: number } = {}
): void {
  const logicalAttemptId = options.logicalAttemptId ?? DEFAULT_LOGICAL_ATTEMPT_ID;
  const runStarted = events.filter((e) => e.eventType === 'RunStarted');

  expect(runStarted).toHaveLength(1);
  expect(runStarted[0]!.logicalAttemptId).toBe(logicalAttemptId);
  expect(runStarted[0]!.idempotencyKey).toBe(
    `RunStarted|${CTX.tenantId}|${CTX.runId}|${logicalAttemptId}|`
  );

  if (typeof options.engineAttemptId === 'number') {
    expect(runStarted[0]!.engineAttemptId).toBe(options.engineAttemptId);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stepActivities', () => {
  describe('fetchPlan', () => {
    it('validates integrity and parses plan', async () => {
      const { deps } = buildDeps();
      const acts = createActivities(deps);

      const plan = await acts.fetchPlan(PLAN_REF);

      expect(plan.metadata.planId).toBe('p1');
      expect(plan.steps).toHaveLength(2);
      expect(deps.integrity.fetchAndValidate).toHaveBeenCalledWith(PLAN_REF, deps.fetcher);
    });

    it('rejects plan when metadata does not match PlanRef', async () => {
      const { deps } = buildDeps();
      const acts = createActivities(deps);

      const badRef: PlanRef = { ...PLAN_REF, planId: 'wrong-id' };

      await expect(acts.fetchPlan(badRef)).rejects.toThrow('PLAN_REF_MISMATCH: planId');
    });

    it('rejects unsupported plan contractVersion', async () => {
      const badPlan = {
        ...PLAN_JSON,
        metadata: {
          ...PLAN_JSON.metadata,
          contractVersion: '99.0.0',
        },
      };
      const badBytes = Buffer.from(JSON.stringify(badPlan), 'utf-8');
      const { deps } = buildDeps();
      deps.fetcher = { fetch: vi.fn(async () => badBytes) };
      deps.integrity = {
        fetchAndValidate: vi.fn(async (ref, fetcher) => fetcher.fetch(ref)),
      };

      const acts = createActivities(deps);

      await expect(acts.fetchPlan(PLAN_REF)).rejects.toThrow('PLAN_CONTRACT_VERSION_UNKNOWN');
    });
  });

  describe('emitEvent', () => {
    it('persists event to state store', async () => {
      const { deps, store } = buildDeps();
      const acts = createActivities(deps);

      await acts.emitEvent({ ctx: CTX, planRef: PLAN_REF, eventType: 'RunStarted' });

      const events = await loadRunEvents(store);
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe('RunStarted');
      expect(events[0]!.runId).toBe('run-1');
      expect(events[0]!.tenantId).toBe('tenant-1');
      expect(events[0]!.runSeq).toBe(1);
    });

    it('is idempotent: duplicate calls produce single event', async () => {
      const { deps, store } = buildDeps();
      const acts = createActivities(deps);

      await acts.emitEvent({ ctx: CTX, planRef: PLAN_REF, eventType: 'RunStarted' });
      await acts.emitEvent({ ctx: CTX, planRef: PLAN_REF, eventType: 'RunStarted' });

      const events = await loadRunEvents(store);
      expect(events.filter((e) => e.eventType === 'RunStarted')).toHaveLength(1);
    });

    it('emits step events with stepId', async () => {
      const { deps, store } = buildDeps();
      const acts = createActivities(deps);

      await acts.emitEvent({
        ctx: CTX,
        planRef: PLAN_REF,
        eventType: 'StepStarted',
        stepId: 'step-a',
      });
      await acts.emitEvent({
        ctx: CTX,
        planRef: PLAN_REF,
        eventType: 'StepCompleted',
        stepId: 'step-a',
      });

      const events = await loadRunEvents(store);
      expect(events).toHaveLength(2);
      expect(events[0]!.eventType).toBe('StepStarted');
      assertStepEventHasId(events[0]!, 'step-a');
    });

    it('persists payload when provided (gateway decision)', async () => {
      const { deps, store } = buildDeps();
      const acts = createActivities(deps);

      await acts.emitEvent({
        ctx: CTX,
        planRef: PLAN_REF,
        eventType: 'StepCompleted',
        stepId: 'gw-1',
        payload: { gatewayDecision: true },
      });

      const events = await loadRunEvents(store);
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe('StepCompleted');
      expect(readGatewayDecision(events[0]!)).toBe(true);
    });

    it('retry-safe: transient failure then retry persists one logical event', async () => {
      const store = new FailingFirstAppendStateStore();
      const { deps } = buildDeps(store);
      const acts = createActivities(deps);

      await expect(
        acts.emitEvent({ ctx: CTX, planRef: PLAN_REF, eventType: 'RunStarted' })
      ).rejects.toThrow('TRANSIENT_DB_ERROR');

      await acts.emitEvent({ ctx: CTX, planRef: PLAN_REF, eventType: 'RunStarted' });
      await acts.emitEvent({ ctx: CTX, planRef: PLAN_REF, eventType: 'RunStarted' });

      const events = await loadRunEvents(store);
      expectSingleRunStartedEvent(events);
    });

    it('defaults logicalAttemptId to 1 even when engineAttemptId is greater than 1', async () => {
      const { deps, store } = buildDeps();
      deps.getEngineAttemptId = () => 7;
      const acts = createActivities(deps);

      await acts.emitEvent({ ctx: CTX, planRef: PLAN_REF, eventType: 'RunStarted' });

      const events = await loadRunEvents(store);
      expect(events).toHaveLength(1);
      expectSingleRunStartedEvent(events, { engineAttemptId: 7 });
    });

    it('dedupes retries across different engineAttemptId when logicalAttemptId is unchanged', async () => {
      const store = new TestRunStateStore();
      let attempt = 1;
      const { deps } = buildDeps(store);
      deps.getEngineAttemptId = () => attempt;
      const acts = createActivities(deps);

      await acts.emitEvent({ ctx: CTX, planRef: PLAN_REF, eventType: 'RunStarted' });
      attempt = 2;
      await acts.emitEvent({ ctx: CTX, planRef: PLAN_REF, eventType: 'RunStarted' });

      const events = await loadRunEvents(store);
      expectSingleRunStartedEvent(events, { engineAttemptId: 1 });
    });

    it('uses explicit logicalAttemptId independent of engineAttemptId', async () => {
      const { deps, store } = buildDeps();
      deps.getEngineAttemptId = () => 9;
      const acts = createActivities(deps);

      await acts.emitEvent({
        ctx: CTX,
        planRef: PLAN_REF,
        eventType: 'RunStarted',
        logicalAttemptId: 3,
      });

      const events = await loadRunEvents(store);
      expect(events).toHaveLength(1);
      expectSingleRunStartedEvent(events, { logicalAttemptId: 3, engineAttemptId: 9 });
    });
  });

  describe('executeStep', () => {
    it('returns COMPLETED for valid step', async () => {
      const { deps } = buildDeps();
      const acts = createActivities(deps);

      const result = await acts.executeStep({
        step: { stepId: 's1', kind: 'test' },
        ctx: CTX,
      });

      expect(result).toEqual({ stepId: 's1', status: 'COMPLETED' });
    });

    it('accepts step with only stepId (kind is optional)', async () => {
      const { deps } = buildDeps();
      const acts = createActivities(deps);

      const result = await acts.executeStep({
        step: { stepId: 's1' },
        ctx: CTX,
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('accepts step with dependsOn array', async () => {
      const { deps } = buildDeps();
      const acts = createActivities(deps);

      const result = await acts.executeStep({
        step: { stepId: 's2', kind: 'test', dependsOn: ['s1'] },
        ctx: CTX,
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('accepts step with stepTypeConfig metadata', async () => {
      const { deps } = buildDeps();
      const acts = createActivities(deps);

      const result = await acts.executeStep({
        step: {
          stepId: 's3',
          kind: 'dbt_model',
          stepTypeConfig: {
            compiledCodeRef: {
              sha256: 'abc123',
              storageUri: 's3://compiled-sql/abc123.sql',
              sizeBytes: 128,
            },
          },
        },
        ctx: CTX,
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('evaluates gateway step in activity boundary and returns gatewayDecision=true', async () => {
      const { deps } = buildDeps();
      const acts = createActivities(deps);

      const result = await acts.executeStep({
        step: {
          stepId: 'gw-1',
          type: 'gateway',
          gateway: {
            dslVersion: '1.0',
            expression: "status='COMPLETED'",
          },
        },
        ctx: CTX,
        gatewayContext: {
          status: 'COMPLETED',
        },
      });

      expect(result).toEqual({
        stepId: 'gw-1',
        status: 'COMPLETED',
        gatewayDecision: true,
      });
    });

    it('evaluates gateway step in activity boundary and returns gatewayDecision=false', async () => {
      const { deps } = buildDeps();
      const acts = createActivities(deps);

      const result = await acts.executeStep({
        step: {
          stepId: 'gw-1',
          type: 'gateway',
          gateway: {
            dslVersion: '1.0',
            expression: "status='COMPLETED'",
          },
        },
        ctx: CTX,
        gatewayContext: {
          status: 'FAILED',
        },
      });

      expect(result).toEqual({
        stepId: 'gw-1',
        status: 'COMPLETED',
        gatewayDecision: false,
      });
    });

    it('rejects step when dependsOn is not an array', async () => {
      await expectExecuteStepRejects(
        { stepId: 's2', dependsOn: 's1' },
        'INVALID_STEP_SCHEMA: dependsOn_must_be_array'
      );
    });

    it('rejects step when dependsOn contains non-string values', async () => {
      await expectExecuteStepRejects(
        { stepId: 's2', dependsOn: ['s1', 2] },
        'INVALID_STEP_SCHEMA: dependsOn_values_must_be_string'
      );
    });

    it('rejects step with unknown fields', async () => {
      await expectExecuteStepRejects(
        { stepId: 's1', kind: 'test', forbidden: 'field' },
        'INVALID_STEP_SCHEMA: field_not_allowed:forbidden'
      );
    });

    it('rejects step when inputBindings appears (not supported in v1 runtime)', async () => {
      await expectExecuteStepRejects(
        {
          stepId: 's1',
          kind: 'test',
          inputBindings: [{ targetPath: '/x', sourceStepId: 's0', sourcePath: '/y' }],
        },
        'INVALID_STEP_SCHEMA: inputBindings_not_supported_in_v1'
      );
    });

    it('simulates transient error when step requests transient failure', async () => {
      await expectExecuteStepRejects(
        { stepId: 's1', kind: 'test', simulateError: 'transient' },
        'TRANSIENT_STEP_ERROR:s1'
      );
    });

    it('simulates permanent error when step requests permanent failure', async () => {
      await expectExecuteStepRejects(
        { stepId: 's1', kind: 'test', simulateError: 'permanent' },
        'PERMANENT_STEP_ERROR:s1'
      );
    });

    it('rejects gateway step without gateway config', async () => {
      await expectExecuteStepRejects(
        {
          stepId: 'gw-invalid',
          type: 'gateway',
        },
        'INVALID_STEP_SCHEMA: gateway_config_required:gw-invalid'
      );
    });

    it('rejects gateway step with invalid DSL expression', async () => {
      await expectExecuteStepRejects(
        {
          stepId: 'gw-invalid-dsl',
          type: 'gateway',
          gateway: {
            dslVersion: '1.0',
            expression: 'status=COMPLETED',
          },
        },
        'INVALID_GATEWAY_DSL:gw-invalid-dsl'
      );
    });
  });

  describe('saveRunMetadata', () => {
    it('persists metadata to state store', async () => {
      const { deps, store } = buildDeps();
      const acts = createActivities(deps);

      await acts.saveRunMetadata({
        tenantId: 'tenant-1',
        projectId: 'proj-1',
        environmentId: 'env-1',
        runId: 'run-1',
        planId: 'p1',
        planVersion: 'v1',
        logicalAttemptId: 1,
        provider: 'temporal',
        providerWorkflowId: 'run-1',
        providerRunId: 'run-1',
      });

      const meta = await store.getRunMetadataByRunId('tenant-1', 'run-1');
      expect(meta).not.toBeNull();
      expect(meta!.provider).toBe('temporal');
    });
  });
});
