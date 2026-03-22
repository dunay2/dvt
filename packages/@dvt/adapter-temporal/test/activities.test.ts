import type { PlanRef, RunContext, RunStateCommandPort } from '@dvt/contracts';
import { createNoopObservability, type IObservability } from '@dvt/observability';
import { ApplicationFailure } from '@temporalio/activity';
import { describe, expect, it, vi } from 'vitest';

import {
  createActivities,
  SIMULATE_ERROR_NOT_ALLOWED_IN_PRODUCTION_LEGACY_CODE,
  SIMULATE_ERROR_REJECTED_BY_RUNTIME_POLICY_CODE,
  UNSAFE_SIMULATE_ERROR_POLICY_IN_PRODUCTION_ERROR,
  type Activities,
  type ActivityDeps,
  type SimulateErrorPolicy,
  type StepExecutor,
  type StepInput,
} from '../src/activities/stepActivities.js';
import type {
  EventInput,
  EventEnvelope,
  EventType,
  IIdempotencyKeyBuilder,
  RunMetadata,
} from '../src/engine-types.js';

import {
  permanentErrorExecutor,
  transientErrorExecutor,
  withErrorExecutors,
} from './helpers/testExecutors.js';

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
const RUN_STARTED_EVENT_TYPE: EventType = 'RunStarted';

const TEST_ERRORS = {
  missingRunStartedEvent: 'MISSING_RUN_STARTED_EVENT',
  missingFirstEvent: 'MISSING_FIRST_EVENT',
  missingStepId: 'MISSING_STEP_ID',
  missingRunMetadata: 'MISSING_RUN_METADATA',
} as const;

const EXPECTED_ERRORS = {
  planRefMismatchPlanId: 'PLAN_REF_MISMATCH: planId',
  planContractVersionUnknown: 'PLAN_CONTRACT_VERSION_UNKNOWN',
  transientDbError: 'TRANSIENT_DB_ERROR',
  dependsOnMustBeArray: 'INVALID_STEP_SCHEMA: dependsOn_must_be_array',
  dependsOnValuesMustBeString: 'INVALID_STEP_SCHEMA: dependsOn_values_must_be_string',
  fieldNotAllowedForbidden: 'INVALID_STEP_SCHEMA: field_not_allowed:forbidden',
  inputBindingsNotSupported: 'INVALID_STEP_SCHEMA: inputBindings_not_supported_in_v1',
  transientStepErrorS1: 'TRANSIENT_STEP_ERROR:s1',
  permanentStepErrorS1: 'PERMANENT_STEP_ERROR:s1',
  simulateErrorRejectedByRuntimePolicyS1: `RUNTIME_POLICY_VIOLATION: ${SIMULATE_ERROR_NOT_ALLOWED_IN_PRODUCTION_LEGACY_CODE}:s1`,
  gatewayConfigRequired: 'INVALID_STEP_SCHEMA: gateway_config_required:gw-invalid',
  invalidGatewayDsl: 'INVALID_GATEWAY_DSL:gw-invalid-dsl',
} as const;

class TestClock {
  nowIsoUtc(): string {
    return '2026-01-01T00:00:00.000Z';
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
    const current = this.metadataByRun.get(runId);
    if (!current) return;

    this.metadataByRun.set(runId, {
      ...current,
      providerWorkflowId: runRef.providerWorkflowId,
      providerRunId: runRef.providerRunId,
      ...(runRef.providerNamespace ? { providerNamespace: runRef.providerNamespace } : {}),
      ...(runRef.providerTaskQueue ? { providerTaskQueue: runRef.providerTaskQueue } : {}),
      ...(runRef.providerConductorUrl ? { providerConductorUrl: runRef.providerConductorUrl } : {}),
    });
  }

  async appendEventsTx(
    runId: string,
    envelopes: EventInput[]
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    const current = this.eventsByRun.get(runId) ?? [];
    const baseRunSeq = current.length;
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    for (const env of envelopes) {
      const exists = current.some((e) => e.idempotencyKey === env.idempotencyKey);
      if (exists) {
        const existing = current.find((e) => e.idempotencyKey === env.idempotencyKey);
        if (existing) deduped.push(existing);
        continue;
      }

      const withSeq: EventEnvelope = {
        ...env,
        runSeq: current.length + appended.length + 1,
        persistedAt: '2026-01-01T00:00:00.000Z',
      };
      current.push(withSeq);
      appended.push(withSeq);
    }

    this.eventsByRun.set(runId, current);
    return {
      appended,
      deduped,
      lastSeq: appended.at(-1)?.runSeq ?? baseRunSeq,
    };
  }

  async listEvents(runId: string): Promise<EventEnvelope[]> {
    return [...(this.eventsByRun.get(runId) ?? [])];
  }

  async appendAndEnqueueTx(
    runId: string,
    envelopes: EventInput[]
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    return this.appendEventsTx(runId, envelopes);
  }

  async bootstrapRunTx(input: {
    metadata: RunMetadata;
    firstEvents: EventInput[];
  }): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    await this.saveRunMetadata(input.metadata);
    if (input.firstEvents.length === 0) return { appended: [], deduped: [], lastSeq: 0 };
    return this.appendEventsTx(input.metadata.runId, input.firstEvents);
  }

  async enqueueTx(_runId: string, _events: EventEnvelope[]): Promise<void> {
    // no-op for tests
  }
}

class FailingFirstAppendStateStore extends TestTxStore {
  private first = true;

  override async appendEventsTx(
    runId: string,
    envelopes: EventInput[]
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    if (this.first) {
      this.first = false;
      throw new Error('TRANSIENT_DB_ERROR');
    }
    return super.appendEventsTx(runId, envelopes);
  }
}

interface TestActivityDeps extends ActivityDeps {
  testStore: TestTxStore;
}

function buildDeps(
  store: TestTxStore = new TestTxStore(),
  observability?: IObservability,
  simulateErrorPolicy?: SimulateErrorPolicy
): TestActivityDeps {
  const runStateCommandPort: RunStateCommandPort = {
    bootstrapRun: (input) => store.bootstrapRunTx(input),
    appendTransitions: (runId, events) => store.appendAndEnqueueTx(runId, events),
  };

  return {
    runStateCommandPort,
    testStore: store,
    clock: new TestClock(),
    idempotency: new TestIdempotencyKeyBuilder(),
    ...(observability !== undefined ? { observability } : {}),
    ...(simulateErrorPolicy !== undefined ? { simulateErrorPolicy } : {}),
    fetcher: { fetch: vi.fn(async () => PLAN_BYTES) },
    integrity: {
      fetchAndValidate: vi.fn(async (_ref, fetcher) => fetcher.fetch(_ref)),
    } as unknown as ActivityDeps['integrity'],
  };
}

function setupActivities(
  store: TestTxStore = new TestTxStore(),
  stepExecutors?: readonly StepExecutor[],
  observability?: IObservability,
  simulateErrorPolicy?: SimulateErrorPolicy
): {
  deps: TestActivityDeps;
  acts: Activities;
} {
  const deps = buildDeps(store, observability, simulateErrorPolicy);
  const acts = createActivities(deps, stepExecutors);
  return { deps, acts };
}

function expectSingleRunStartedEvent(
  events: EventEnvelope[],
  options: { logicalAttemptId?: number; engineAttemptId?: number } = {}
): void {
  const logicalAttemptId = options.logicalAttemptId ?? DEFAULT_LOGICAL_ATTEMPT_ID;
  const runStarted = events.filter((e) => e.eventType === 'RunStarted');

  expect(runStarted).toHaveLength(1);
  const event = runStarted[0];
  if (!event) throw new TypeError(TEST_ERRORS.missingRunStartedEvent);
  expect(event.logicalAttemptId).toBe(logicalAttemptId);
  expect(event.idempotencyKey).toBe(`RunStarted|${CTX.tenantId}|${CTX.runId}|${logicalAttemptId}|`);

  if (typeof options.engineAttemptId === 'number') {
    expect(event.engineAttemptId).toBe(options.engineAttemptId);
  }
}

function requireFirstEvent(events: EventEnvelope[]): EventEnvelope {
  const first = events[0];
  if (!first) throw new TypeError(TEST_ERRORS.missingFirstEvent);
  return first;
}

function requireStepId(event: EventEnvelope): string {
  if (typeof event.stepId !== 'string') {
    throw new TypeError(TEST_ERRORS.missingStepId);
  }
  return event.stepId;
}

async function emitRunStarted(
  acts: Activities,
  options: { logicalAttemptId?: number } = {}
): Promise<void> {
  await acts.emitEvent({
    ctx: CTX,
    planRef: PLAN_REF,
    eventType: RUN_STARTED_EVENT_TYPE,
    ...(options.logicalAttemptId === undefined
      ? {}
      : { logicalAttemptId: options.logicalAttemptId }),
  });
}

function expectExecuteStepRejects(step: unknown, expectedError: string) {
  return async () => {
    const { acts } = setupActivities();
    await expect(
      acts.executeStep({
        step: step as StepInput['step'],
        ctx: CTX,
      })
    ).rejects.toThrow(expectedError);
  };
}

function createObservabilitySpy(): {
  observability: IObservability;
  warnSpy: ReturnType<typeof vi.spyOn>;
  counterSpy: ReturnType<typeof vi.spyOn>;
  counterAddSpy: ReturnType<typeof vi.fn>;
} {
  const observability = createNoopObservability();
  const counterAddSpy = vi.fn();
  const counterSpy = vi
    .spyOn(observability.metrics, 'counter')
    .mockReturnValue({ add: counterAddSpy });
  const warnSpy = vi.spyOn(observability.logs, 'warn');
  return { observability, warnSpy, counterSpy, counterAddSpy };
}

async function withNodeEnv<T>(value: string | undefined, fn: () => Promise<T> | T): Promise<T> {
  const previous = process.env['NODE_ENV'];
  if (value === undefined) {
    delete process.env['NODE_ENV'];
  } else {
    process.env['NODE_ENV'] = value;
  }
  try {
    return await fn();
  } finally {
    if (previous === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = previous;
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stepActivities', () => {
  describe('fetchPlan', () => {
    it('validates integrity and parses plan', async () => {
      const { deps, acts } = setupActivities();

      const plan = await acts.fetchPlan(PLAN_REF);

      expect(plan.metadata.planId).toBe('p1');
      expect(plan.steps).toHaveLength(2);
      expect(deps.integrity.fetchAndValidate).toHaveBeenCalledWith(PLAN_REF, deps.fetcher);
    });

    it('rejects plan when metadata does not match PlanRef', async () => {
      const { acts } = setupActivities();

      const badRef: PlanRef = { ...PLAN_REF, planId: 'wrong-id' };

      await expect(acts.fetchPlan(badRef)).rejects.toThrow(EXPECTED_ERRORS.planRefMismatchPlanId);
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
      const { deps, acts } = setupActivities();
      deps.fetcher = { fetch: vi.fn(async () => badBytes) };
      deps.integrity = {
        fetchAndValidate: vi.fn(async (_ref, fetcher) => fetcher.fetch(_ref)),
      } as unknown as ActivityDeps['integrity'];

      await expect(acts.fetchPlan(PLAN_REF)).rejects.toThrow(
        EXPECTED_ERRORS.planContractVersionUnknown
      );
    });

    it.each(['transient', 'permanent'])(
      'rejects fetchPlan in production when step contains simulateError=%s and emits signal',
      async (simulateError) => {
        const badPlan = {
          ...PLAN_JSON,
          steps: [{ stepId: 's1', kind: 'test', simulateError }],
        };
        const badBytes = Buffer.from(JSON.stringify(badPlan), 'utf-8');
        const { observability, warnSpy, counterSpy, counterAddSpy } = createObservabilitySpy();
        const { deps, acts } = setupActivities(undefined, undefined, observability, {
          rejectInProduction: true,
          runtimeMode: 'production',
        });
        deps.fetcher = { fetch: vi.fn(async () => badBytes) };
        deps.integrity = {
          fetchAndValidate: vi.fn(async (_ref, fetcher) => fetcher.fetch(_ref)),
        } as unknown as ActivityDeps['integrity'];

        const rejection = await acts.fetchPlan(PLAN_REF).then(
          () => {
            throw new TypeError('EXPECTED_REJECTION');
          },
          (error) => error
        );
        expect(rejection).toBeInstanceOf(ApplicationFailure);
        expect((rejection as Error).message).toContain(
          EXPECTED_ERRORS.simulateErrorRejectedByRuntimePolicyS1
        );
        expect((rejection as ApplicationFailure).nonRetryable).toBe(true);

        expect(counterSpy).toHaveBeenCalledWith(
          'dvt.temporal.activity.simulate_error_rejected_total',
          { adapter: 'temporal', operation: 'fetchPlan', result: 'rejected' }
        );
        expect(counterAddSpy).toHaveBeenCalledTimes(1);
        expect(counterAddSpy).toHaveBeenCalledWith(1, { simulateErrorKind: simulateError });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            msg: 'Rejected simulateError hook by runtime activity policy',
            attributes: expect.objectContaining({
              stepId: 's1',
              simulateErrorKind: simulateError,
              runtimeMode: 'production',
            }),
          })
        );
      }
    );

    it('keeps canonical rejection when observability sinks throw during fetchPlan signal emission', async () => {
      const badPlan = {
        ...PLAN_JSON,
        steps: [{ stepId: 's1', kind: 'test', simulateError: 'permanent' }],
      };
      const badBytes = Buffer.from(JSON.stringify(badPlan), 'utf-8');
      const stderrWriteSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true as boolean);
      const observability = createNoopObservability();
      vi.spyOn(observability.metrics, 'counter').mockImplementation(() => {
        throw new Error('METRIC_BACKEND_DOWN');
      });
      vi.spyOn(observability.logs, 'warn').mockImplementation(() => {
        throw new Error('LOG_BACKEND_DOWN');
      });
      const { deps, acts } = setupActivities(undefined, undefined, observability, {
        rejectInProduction: true,
        runtimeMode: 'production',
      });
      deps.fetcher = { fetch: vi.fn(async () => badBytes) };
      deps.integrity = {
        fetchAndValidate: vi.fn(async (_ref, fetcher) => fetcher.fetch(_ref)),
      } as unknown as ActivityDeps['integrity'];

      const rejection = await acts.fetchPlan(PLAN_REF).then(
        () => {
          throw new TypeError('EXPECTED_REJECTION');
        },
        (error) => error
      );
      expect(rejection).toBeInstanceOf(ApplicationFailure);
      expect((rejection as Error).message).toContain(
        EXPECTED_ERRORS.simulateErrorRejectedByRuntimePolicyS1
      );
      expect((rejection as ApplicationFailure).nonRetryable).toBe(true);
      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const rawFallback = stderrWriteSpy.mock.calls[0]?.[0];
      expect(typeof rawFallback).toBe('string');
      const parsed = JSON.parse(String(rawFallback).trim()) as {
        marker: string;
        operation: string;
        stepId: string;
        simulateErrorKind: string;
        runtimeMode: string;
        canonicalCode: string;
        legacyCode: string;
        failures: Array<{ channel: string; cause: string }>;
      };
      expect(parsed.marker).toBe('dvt.simulate_error_signal_fallback');
      expect(parsed.operation).toBe('fetchPlan');
      expect(parsed.stepId).toBe('s1');
      expect(parsed.simulateErrorKind).toBe('permanent');
      expect(parsed.runtimeMode).toBe('production');
      expect(parsed.canonicalCode).toBe(SIMULATE_ERROR_REJECTED_BY_RUNTIME_POLICY_CODE);
      expect(parsed.legacyCode).toBe(SIMULATE_ERROR_NOT_ALLOWED_IN_PRODUCTION_LEGACY_CODE);
      expect(parsed.failures).toHaveLength(2);
      expect(parsed.failures.map((entry) => entry.channel).sort()).toEqual(['logs', 'metrics']);
      expect(parsed.failures.every((entry) => entry.cause.length > 0)).toBe(true);
      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('"marker":"dvt.simulate_error_signal_fallback"')
      );
      stderrWriteSpy.mockRestore();
    });

    it('allows fetchPlan with simulateError when policy explicitly allows it', async () => {
      const planWithSimulateError = {
        ...PLAN_JSON,
        steps: [{ stepId: 's1', kind: 'test', simulateError: 'permanent' }],
      };
      const bytes = Buffer.from(JSON.stringify(planWithSimulateError), 'utf-8');
      const { observability, warnSpy, counterAddSpy } = createObservabilitySpy();
      const { deps, acts } = setupActivities(undefined, undefined, observability, {
        rejectInProduction: false,
        runtimeMode: 'test',
      });
      deps.fetcher = { fetch: vi.fn(async () => bytes) };
      deps.integrity = {
        fetchAndValidate: vi.fn(async (_ref, fetcher) => fetcher.fetch(_ref)),
      } as unknown as ActivityDeps['integrity'];

      const plan = await acts.fetchPlan(PLAN_REF);
      expect(plan.steps).toHaveLength(1);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(counterAddSpy).not.toHaveBeenCalled();
    });
  });

  describe('emitEvent', () => {
    it('persists event to state store', async () => {
      const { deps, acts } = setupActivities();

      await emitRunStarted(acts);

      const events = await deps.testStore.listEvents('run-1');
      expect(events).toHaveLength(1);
      const event = requireFirstEvent(events);
      expect(event.eventType).toBe('RunStarted');
      expect(event.runId).toBe('run-1');
      expect(event.tenantId).toBe('tenant-1');
      expect(event.runSeq).toBe(1);
    });

    it('is idempotent — duplicate calls produce single event', async () => {
      const { deps, acts } = setupActivities();

      await emitRunStarted(acts);
      await emitRunStarted(acts);

      const events = await deps.testStore.listEvents('run-1');
      expect(events.filter((e) => e.eventType === 'RunStarted')).toHaveLength(1);
    });

    it('emits step events with stepId', async () => {
      const { deps, acts } = setupActivities();

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

      const events = await deps.testStore.listEvents('run-1');
      expect(events).toHaveLength(2);
      const event = requireFirstEvent(events);
      expect(event.eventType).toBe('StepStarted');
      expect(requireStepId(event)).toBe('step-a');
    });

    it('persists payload when provided (gateway decision)', async () => {
      const { deps, acts } = setupActivities();

      await acts.emitEvent({
        ctx: CTX,
        planRef: PLAN_REF,
        eventType: 'StepCompleted',
        stepId: 'gw-1',
        payload: { gatewayDecision: true },
      });

      const events = await deps.testStore.listEvents('run-1');
      expect(events).toHaveLength(1);
      const event = requireFirstEvent(events);
      expect(event.eventType).toBe('StepCompleted');
      expect((event.payload as { gatewayDecision?: boolean } | undefined)?.gatewayDecision).toBe(
        true
      );
    });

    it('retry-safe: transient failure then retry persists one logical event', async () => {
      const { deps, acts } = setupActivities(new FailingFirstAppendStateStore());

      await expect(emitRunStarted(acts)).rejects.toThrow(EXPECTED_ERRORS.transientDbError);

      await emitRunStarted(acts);
      await emitRunStarted(acts);

      const events = await deps.testStore.listEvents(CTX.runId);
      expectSingleRunStartedEvent(events);
    });

    it('defaults logicalAttemptId to 1 even when engineAttemptId is greater than 1', async () => {
      const { deps, acts } = setupActivities();
      deps.getEngineAttemptId = () => 7;

      await emitRunStarted(acts);

      const events = await deps.testStore.listEvents(CTX.runId);
      expect(events).toHaveLength(1);
      expectSingleRunStartedEvent(events, { engineAttemptId: 7 });
    });

    it('dedupes retries across different engineAttemptId when logicalAttemptId is unchanged', async () => {
      let attempt = 1;
      const { deps, acts } = setupActivities(new TestTxStore());
      deps.getEngineAttemptId = () => attempt;

      await emitRunStarted(acts);
      attempt = 2;
      await emitRunStarted(acts);

      const events = await deps.testStore.listEvents(CTX.runId);
      expectSingleRunStartedEvent(events, { engineAttemptId: 1 });
    });

    it('uses explicit logicalAttemptId independent of engineAttemptId', async () => {
      const { deps, acts } = setupActivities();
      deps.getEngineAttemptId = () => 9;

      await emitRunStarted(acts, { logicalAttemptId: 3 });

      const events = await deps.testStore.listEvents(CTX.runId);
      expect(events).toHaveLength(1);
      expectSingleRunStartedEvent(events, { logicalAttemptId: 3, engineAttemptId: 9 });
    });
  });

  describe('executeStep', () => {
    it('returns COMPLETED for valid step', async () => {
      const { acts } = setupActivities();

      const result = await acts.executeStep({
        step: { stepId: 's1', kind: 'test' },
        ctx: CTX,
      });

      expect(result).toEqual({ stepId: 's1', status: 'COMPLETED' });
    });

    it('accepts step with only stepId (kind is optional)', async () => {
      const { acts } = setupActivities();

      const result = await acts.executeStep({
        step: { stepId: 's1' },
        ctx: CTX,
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('accepts step with dependsOn array', async () => {
      const { acts } = setupActivities();

      const result = await acts.executeStep({
        step: { stepId: 's2', kind: 'test', dependsOn: ['s1'] },
        ctx: CTX,
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('accepts step with stepTypeConfig', async () => {
      const { acts } = setupActivities();

      const result = await acts.executeStep({
        step: { stepId: 's3', kind: 'test', stepTypeConfig: { stepTimeoutMs: 5000 } },
        ctx: CTX,
      });

      expect(result.status).toBe('COMPLETED');
    });

    it.each(['transient', 'permanent'])(
      'rejects simulateError=%s in production and emits signal',
      async (simulateError) => {
        const { observability, warnSpy, counterSpy, counterAddSpy } = createObservabilitySpy();
        const { acts } = setupActivities(undefined, undefined, observability, {
          rejectInProduction: true,
          runtimeMode: 'production',
        });
        const rejection = await acts
          .executeStep({
            step: {
              stepId: 's1',
              kind: 'test',
              simulateError,
            } as unknown as StepInput['step'],
            ctx: CTX,
          })
          .then(
            () => {
              throw new TypeError('EXPECTED_REJECTION');
            },
            (error) => error
          );
        expect(rejection).toBeInstanceOf(ApplicationFailure);
        expect((rejection as Error).message).toContain(
          EXPECTED_ERRORS.simulateErrorRejectedByRuntimePolicyS1
        );
        expect((rejection as ApplicationFailure).nonRetryable).toBe(true);

        expect(counterSpy).toHaveBeenCalledWith(
          'dvt.temporal.activity.simulate_error_rejected_total',
          { adapter: 'temporal', operation: 'executeStep', result: 'rejected' }
        );
        expect(counterAddSpy).toHaveBeenCalledTimes(1);
        expect(counterAddSpy).toHaveBeenCalledWith(1, { simulateErrorKind: simulateError });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            msg: 'Rejected simulateError hook by runtime activity policy',
            attributes: expect.objectContaining({
              stepId: 's1',
              simulateErrorKind: simulateError,
              runtimeMode: 'production',
            }),
          })
        );
      }
    );

    it('keeps canonical rejection when observability sinks throw during signal emission', async () => {
      const stderrWriteSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true as boolean);
      const observability = createNoopObservability();
      vi.spyOn(observability.metrics, 'counter').mockImplementation(() => {
        throw new Error('METRIC_BACKEND_DOWN');
      });
      vi.spyOn(observability.logs, 'warn').mockImplementation(() => {
        throw new Error('LOG_BACKEND_DOWN');
      });

      const { acts } = setupActivities(undefined, undefined, observability, {
        rejectInProduction: true,
        runtimeMode: 'production',
      });
      const rejection = await acts
        .executeStep({
          step: {
            stepId: 's1',
            kind: 'test',
            simulateError: 'permanent',
          } as unknown as StepInput['step'],
          ctx: CTX,
        })
        .then(
          () => {
            throw new TypeError('EXPECTED_REJECTION');
          },
          (error) => error
        );

      expect(rejection).toBeInstanceOf(ApplicationFailure);
      expect((rejection as Error).message).toContain(
        EXPECTED_ERRORS.simulateErrorRejectedByRuntimePolicyS1
      );
      expect((rejection as ApplicationFailure).nonRetryable).toBe(true);
      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const rawFallback = stderrWriteSpy.mock.calls[0]?.[0];
      expect(typeof rawFallback).toBe('string');
      const parsed = JSON.parse(String(rawFallback).trim()) as {
        marker: string;
        operation: string;
        stepId: string;
        simulateErrorKind: string;
        runtimeMode: string;
        canonicalCode: string;
        legacyCode: string;
        failures: Array<{ channel: string; cause: string }>;
      };
      expect(parsed.marker).toBe('dvt.simulate_error_signal_fallback');
      expect(parsed.operation).toBe('executeStep');
      expect(parsed.stepId).toBe('s1');
      expect(parsed.simulateErrorKind).toBe('permanent');
      expect(parsed.runtimeMode).toBe('production');
      expect(parsed.canonicalCode).toBe(SIMULATE_ERROR_REJECTED_BY_RUNTIME_POLICY_CODE);
      expect(parsed.legacyCode).toBe(SIMULATE_ERROR_NOT_ALLOWED_IN_PRODUCTION_LEGACY_CODE);
      expect(parsed.failures).toHaveLength(2);
      expect(parsed.failures.map((entry) => entry.channel).sort()).toEqual(['logs', 'metrics']);
      expect(parsed.failures.every((entry) => entry.cause.length > 0)).toBe(true);
      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('"marker":"dvt.simulate_error_signal_fallback"')
      );
      stderrWriteSpy.mockRestore();
    });

    it('rejects simulateError with explicit runtime policy outside production', async () => {
      const { observability, warnSpy } = createObservabilitySpy();
      const { acts } = setupActivities(undefined, undefined, observability, {
        rejectInProduction: true,
        runtimeMode: 'policy-test',
      });
      await expect(
        acts.executeStep({
          step: {
            stepId: 's1',
            kind: 'test',
            simulateError: 'permanent',
          } as unknown as StepInput['step'],
          ctx: CTX,
        })
      ).rejects.toThrow(EXPECTED_ERRORS.simulateErrorRejectedByRuntimePolicyS1);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            runtimeMode: 'policy-test',
          }),
        })
      );
    });

    it('uses implicit fail-closed policy when simulateErrorPolicy is omitted', async () => {
      const { observability, warnSpy } = createObservabilitySpy();
      const { acts } = setupActivities(undefined, undefined, observability);
      await expect(
        acts.executeStep({
          step: {
            stepId: 's1',
            kind: 'test',
            simulateError: 'permanent',
          } as unknown as StepInput['step'],
          ctx: CTX,
        })
      ).rejects.toThrow(EXPECTED_ERRORS.permanentStepErrorS1);

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('uses implicit production fail-closed behavior when NODE_ENV=production and policy is omitted', async () => {
      await withNodeEnv('production', async () => {
        const { observability, warnSpy } = createObservabilitySpy();
        const { acts } = setupActivities(undefined, undefined, observability);
        await expect(
          acts.executeStep({
            step: {
              stepId: 's1',
              kind: 'test',
              simulateError: 'permanent',
            } as unknown as StepInput['step'],
            ctx: CTX,
          })
        ).rejects.toThrow(EXPECTED_ERRORS.simulateErrorRejectedByRuntimePolicyS1);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({
              runtimeMode: 'production',
            }),
          })
        );
      });
    });

    it('fails closed when NODE_ENV=production and policy explicitly disables rejection', async () => {
      await withNodeEnv('production', async () => {
        expect(() =>
          setupActivities(undefined, undefined, undefined, {
            rejectInProduction: false,
            runtimeMode: 'test',
          })
        ).toThrow(UNSAFE_SIMULATE_ERROR_POLICY_IN_PRODUCTION_ERROR);
      });
    });

    it.each([
      { simulateError: 'transient', expectedError: EXPECTED_ERRORS.transientStepErrorS1 },
      { simulateError: 'permanent', expectedError: EXPECTED_ERRORS.permanentStepErrorS1 },
    ])(
      'applies simulateError=$simulateError outside production',
      async ({ simulateError, expectedError }) => {
        const { acts } = setupActivities(undefined, undefined, undefined, {
          rejectInProduction: false,
          runtimeMode: 'test',
        });
        await expect(
          acts.executeStep({
            step: {
              stepId: 's1',
              kind: 'test',
              simulateError,
            } as unknown as StepInput['step'],
            ctx: CTX,
          })
        ).rejects.toThrow(expectedError);
      }
    );
  });

  describe('gateway execution', () => {
    it.each([
      { status: 'COMPLETED', expectedDecision: true },
      { status: 'FAILED', expectedDecision: false },
    ])(
      'evaluates gateway step in activity boundary and returns gatewayDecision=$expectedDecision',
      async ({ status, expectedDecision }) => {
        const { acts } = setupActivities();

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
            status,
          },
        });

        expect(result).toEqual({
          stepId: 'gw-1',
          status: 'COMPLETED',
          gatewayDecision: expectedDecision,
        });
      }
    );
  });

  describe('step validation and executor errors', () => {
    it(
      'rejects step when dependsOn is not an array',
      expectExecuteStepRejects(
        { stepId: 's2', dependsOn: 's1' as unknown as string[] },
        EXPECTED_ERRORS.dependsOnMustBeArray
      )
    );

    it(
      'rejects step when dependsOn contains non-string values',
      expectExecuteStepRejects(
        { stepId: 's2', dependsOn: ['s1', 2] as unknown as string[] },
        EXPECTED_ERRORS.dependsOnValuesMustBeString
      )
    );

    it(
      'rejects step with unknown fields',
      expectExecuteStepRejects(
        { stepId: 's1', kind: 'test', forbidden: 'field' },
        EXPECTED_ERRORS.fieldNotAllowedForbidden
      )
    );

    it(
      'rejects step when inputBindings appears (not supported in v1 runtime)',
      expectExecuteStepRejects(
        {
          stepId: 's1',
          kind: 'test',
          inputBindings: [{ targetPath: '/x', sourceStepId: 's0', sourcePath: '/y' }],
        },
        EXPECTED_ERRORS.inputBindingsNotSupported
      )
    );

    it('throws transient error when executor raises retryable failure', async () => {
      const { acts } = setupActivities(undefined, withErrorExecutors(transientErrorExecutor('s1')));
      await expect(
        acts.executeStep({
          step: {
            stepId: 's1',
            kind: 'test',
          } as unknown as StepInput['step'],
          ctx: CTX,
        })
      ).rejects.toThrow(EXPECTED_ERRORS.transientStepErrorS1);
    });

    it('throws permanent error when executor raises non-retryable failure', async () => {
      const { acts } = setupActivities(undefined, withErrorExecutors(permanentErrorExecutor('s1')));
      await expect(
        acts.executeStep({ step: { stepId: 's1', kind: 'test' }, ctx: CTX })
      ).rejects.toThrow(EXPECTED_ERRORS.permanentStepErrorS1);
    });

    it(
      'rejects gateway step without gateway config',
      expectExecuteStepRejects(
        {
          stepId: 'gw-invalid',
          type: 'gateway',
        },
        EXPECTED_ERRORS.gatewayConfigRequired
      )
    );

    it(
      'rejects gateway step with invalid DSL expression',
      expectExecuteStepRejects(
        {
          stepId: 'gw-invalid-dsl',
          type: 'gateway',
          gateway: {
            dslVersion: '1.0',
            expression: 'status=COMPLETED',
          },
        },
        EXPECTED_ERRORS.invalidGatewayDsl
      )
    );
  });

  describe('saveRunMetadata', () => {
    it('persists metadata to state store', async () => {
      const { deps, acts } = setupActivities();

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

      const meta = await deps.testStore.getRunMetadataByRunId('run-1');
      expect(meta).not.toBeNull();
      if (!meta) throw new TypeError(TEST_ERRORS.missingRunMetadata);
      expect(meta.provider).toBe('temporal');
    });
  });
});
