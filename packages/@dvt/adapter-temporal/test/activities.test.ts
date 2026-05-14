import type { IRunExecutionContextReader } from '@dvt/artifacts';
import { type PlanRef, type ResolvedRunContext, type RunExecutionContext } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import { RunExecutionContextRejectedError, type RunStateCommandPort } from '@dvt/engine';
import { PlanIntegrityValidator, SequenceClock } from '@dvt/engine/runtime';
import { describe, expect, it } from 'vitest';

import {
  createDbtStepActivityRegistry,
  TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS,
  type DbtPluginExecutionInput,
  type DbtPluginRunner,
} from '../../temporal-dbt-plugin/src/index.js';
import {
  createActivities,
  createScopedTemporalPlanArtifactReader,
  DEFAULT_STEP_ACTIVITY_REGISTRY,
  type Activities,
  type ActivityDeps,
  type StepActivity,
  type StepExecutor,
  type StepInput,
} from '../src/activities/stepActivities.js';
import type {
  EventEnvelope,
  EventInput,
  EventType,
  IIdempotencyKeyBuilder,
  RunMetadata,
} from '../src/engine-types.js';
import { composeTemporalStepPluginRegistries } from '../src/index.js';

import { createExecutionPlan, createPlanRef } from './helpers/contractFixtures.js';
import {
  permanentErrorExecutor,
  transientErrorExecutor,
  withErrorExecutors,
} from './helpers/testExecutors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAN_REF: PlanRef = {
  uri: 's3://bucket/plans/p1.json',
  sha256: 'a'.repeat(64),
  schemaVersion: 's1',
  planId: 'p1',
  planVersion: 'v1',
};

const RUN_EXECUTION_CONTEXT_REF = {
  uri: 's3://bucket/runctx/p1.json',
  sha256: 'b'.repeat(64),
  schemaVersion: 'v1.0',
  planId: PLAN_REF.planId,
  planVersion: PLAN_REF.planVersion,
} as const;

const CTX: ResolvedRunContext = {
  tenantId: 'tenant-1',
  projectId: 'proj-1',
  environmentId: 'env-1',
  runId: 'run-1',
  targetAdapter: 'temporal',
  runExecutionContextRef: RUN_EXECUTION_CONTEXT_REF,
  logicalAttemptId: 1,
  originRunId: 'run-1',
};

const RUN_EXECUTION_CONTEXT: RunExecutionContext = {
  schemaVersion: 'v1.0',
  planId: PLAN_REF.planId,
  planVersion: PLAN_REF.planVersion,
  planSha256: PLAN_REF.sha256,
  tenantId: CTX.tenantId,
  projectId: CTX.projectId,
  environmentId: CTX.environmentId,
  targetAdapter: CTX.targetAdapter,
  createdAtIso: '2026-04-14T00:00:00.000Z',
  createdBy: 'test',
  pluginContexts: {
    dbt: {
      projectBundleRef: {
        uri: `s3://bundle-bucket/tenants/${CTX.tenantId}/${'b'.repeat(64)}`,
        kind: 'dbt-project-bundle',
        sha256: 'b'.repeat(64),
        tenantId: CTX.tenantId,
      },
      targetProfile: 'dbt-dev',
    },
  },
};

const SEGMENT_RESOLVER_PLAN = createExecutionPlan({
  steps: [{ stepId: 'segment-step', kind: 'DBT_TEST', dependsOn: [] }],
  ownership: {
    tenantId: CTX.tenantId,
    projectId: CTX.projectId,
    environmentId: CTX.environmentId,
  },
});

const DEFAULT_LOGICAL_ATTEMPT_ID = 1;
const RUN_STARTED_EVENT_TYPE: EventType = 'RunStarted';

const TEST_ERRORS = {
  missingRunStartedEvent: 'MISSING_RUN_STARTED_EVENT',
  missingFirstEvent: 'MISSING_FIRST_EVENT',
  missingStepId: 'MISSING_STEP_ID',
} as const;

const EXPECTED_ERRORS = {
  segmentResolverNotConfigured: 'PLAN_SEGMENT_RESOLVER_NOT_CONFIGURED',
  transientDbError: 'TRANSIENT_DB_ERROR',
  dependsOnMustBeArray: 'INVALID_STEP_SCHEMA: dependsOn_must_be_array',
  dependsOnValuesMustBeString: 'INVALID_STEP_SCHEMA: dependsOn_values_must_be_string',
  fieldNotAllowedForbidden: 'INVALID_STEP_SCHEMA: field_not_allowed:forbidden',
  fieldNotAllowedSimulateError: 'INVALID_STEP_SCHEMA: field_not_allowed:simulateError',
  inputBindingsNotSupported: 'INVALID_STEP_SCHEMA: inputBindings_not_supported_in_v1',
  transientStepErrorS1: 'TRANSIENT_STEP_ERROR:s1',
  permanentStepErrorS1: 'PERMANENT_STEP_ERROR:s1',
  gatewayConfigRequired: 'INVALID_STEP_SCHEMA: gateway_config_required:gw-invalid',
  invalidGatewayDsl: 'INVALID_GATEWAY_DSL:gw-invalid-dsl',
  stepKindRequired: 'INVALID_STEP_SCHEMA: step_kind_required:s1',
  unsupportedStepKind: 'UNSUPPORTED_STEP_KIND:PYTHON_SCRIPT:s-python',
  runExecutionContextRequired: 'RUN_EXECUTION_CONTEXT_REQUIRED:s1',
  pluginRuntimeNotConfigured: 'DBT_PLUGIN_RUNTIME_NOT_CONFIGURED:s1',
  dbtPluginContextRequired: 'DBT_PLUGIN_CONTEXT_REQUIRED:s1',
  dbtPluginResultInvalid: 'DBT_PLUGIN_RESULT_INVALID: stepId_mismatch:s1:other-step',
  runExecutionContextRejected: 'RUN_EXECUTION_CONTEXT_REJECTED_BY_FIXTURE',
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
    planId: string;
    planVersion: string;
    stepId?: string;
  }): string {
    return [
      e.eventType,
      e.tenantId,
      e.runId,
      String(e.logicalAttemptId),
      e.planId,
      e.planVersion,
      e.stepId ?? '',
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

class TestTxStore {
  private readonly eventsByRun = new Map<string, EventEnvelope[]>();
  private readonly metadataByRun = new Map<string, RunMetadata>();

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
    });
  }

  private appendEvents(
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
    return this.appendEvents(runId, envelopes);
  }

  async bootstrapRunTx(input: {
    metadata: RunMetadata;
    firstEvents: EventInput[];
  }): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    this.metadataByRun.set(input.metadata.runId, input.metadata);
    if (input.firstEvents.length === 0) return { appended: [], deduped: [], lastSeq: 0 };
    return this.appendAndEnqueueTx(input.metadata.runId, input.firstEvents);
  }

  async enqueueTx(_runId: string, _events: EventEnvelope[]): Promise<void> {
    // no-op for tests
  }
}

class FailingFirstAppendStateStore extends TestTxStore {
  private first = true;

  override async appendAndEnqueueTx(
    runId: string,
    envelopes: EventInput[]
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    if (this.first) {
      this.first = false;
      throw new Error('TRANSIENT_DB_ERROR');
    }
    return super.appendAndEnqueueTx(runId, envelopes);
  }
}

interface TestActivityDeps extends ActivityDeps {
  testStore: TestTxStore;
  fetcher?: Parameters<typeof createScopedTemporalPlanArtifactReader>[0]['fetcher'];
  integrity?: Parameters<typeof createScopedTemporalPlanArtifactReader>[0]['integrity'];
}

type SetupActivitiesOptions = Readonly<{
  store?: TestTxStore;
  stepExecutors?: readonly StepExecutor[];
  stepActivitiesByKind?: ReadonlyMap<string, StepActivity>;
  depOverrides?: ActivityDepOverrides;
}>;

type ActivityDepOverrides = Partial<ActivityDeps> &
  Partial<{
    fetcher: Parameters<typeof createScopedTemporalPlanArtifactReader>[0]['fetcher'];
    integrity: Parameters<typeof createScopedTemporalPlanArtifactReader>[0]['integrity'];
  }>;

class FakeRunExecutionContextReader implements IRunExecutionContextReader {
  constructor(private readonly runExecutionContext: RunExecutionContext = RUN_EXECUTION_CONTEXT) {}

  async resolve(): Promise<RunExecutionContext> {
    return this.runExecutionContext;
  }
}

class RecordingDbtPluginRunner implements DbtPluginRunner {
  readonly invocations: DbtPluginExecutionInput[] = [];
  private readonly implementation: (
    input: DbtPluginExecutionInput
  ) => Promise<Awaited<ReturnType<DbtPluginRunner['execute']>>>;

  constructor(
    implementation: (
      input: DbtPluginExecutionInput
    ) => Promise<Awaited<ReturnType<DbtPluginRunner['execute']>>> = async (input) => ({
      stepId: input.step.stepId,
      status: 'COMPLETED',
    })
  ) {
    this.implementation = implementation;
  }

  async execute(
    input: DbtPluginExecutionInput
  ): Promise<Awaited<ReturnType<DbtPluginRunner['execute']>>> {
    this.invocations.push(input);
    return this.implementation(input);
  }
}

function buildDeps(
  store: TestTxStore = new TestTxStore(),
  overrides: ActivityDepOverrides = {}
): TestActivityDeps {
  const runStateCommandPort: RunStateCommandPort = {
    bootstrapRun: (input) => store.bootstrapRunTx(input),
    appendTransitions: (runId, events) => store.appendAndEnqueueTx(runId, events),
  };

  const legacyOverrides = overrides as Partial<{
    fetcher: Parameters<typeof createScopedTemporalPlanArtifactReader>[0]['fetcher'];
    integrity: Parameters<typeof createScopedTemporalPlanArtifactReader>[0]['integrity'];
  }>;
  const fetcher = Object.hasOwn(legacyOverrides, 'fetcher')
    ? legacyOverrides.fetcher
    : {
        getStoredPlanValidationRecord: async () => undefined,
        fetchStoredPlanArtifact: async () => ({
          bytes: new Uint8Array(),
          executionPolicy: {},
        }),
        fetchStoredPlanArtifactForValidation: async () => ({
          bytes: new Uint8Array(),
          executionPolicy: {},
        }),
      };
  const integrity = Object.hasOwn(legacyOverrides, 'integrity')
    ? legacyOverrides.integrity
    : {
        fetchAndValidate: async () => ({
          plan: SEGMENT_RESOLVER_PLAN,
          executionPolicy: {},
        }),
      };

  return {
    runStateCommandPort,
    testStore: store,
    clock: new TestClock(),
    idempotency: new TestIdempotencyKeyBuilder(),
    planArtifactReader: createScopedTemporalPlanArtifactReader({
      fetcher,
      integrity,
    }),
    fetcher,
    integrity,
    ...(overrides.getEngineAttemptId === undefined
      ? {}
      : { getEngineAttemptId: overrides.getEngineAttemptId }),
  };
}

function setupActivities({
  store = new TestTxStore(),
  stepExecutors,
  stepActivitiesByKind,
  depOverrides = {},
}: SetupActivitiesOptions = {}): {
  deps: TestActivityDeps;
  acts: Activities;
} {
  const deps = buildDeps(store, depOverrides);
  const acts = createActivities(deps, stepExecutors, stepActivitiesByKind);
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
  expect(event.idempotencyKey).toBe(
    `RunStarted|${CTX.tenantId}|${CTX.runId}|${logicalAttemptId}|${PLAN_REF.planId}|${PLAN_REF.planVersion}|`
  );

  if (typeof options.engineAttemptId === 'number') {
    expect(event.engineAttemptId).toBe(options.engineAttemptId);
  }
}

function createDbtRegistry(
  overrides: {
    runExecutionContextReader?: IRunExecutionContextReader;
    dbtPluginRunner?: DbtPluginRunner;
  } = {}
): ReadonlyMap<string, StepActivity> {
  return createDbtStepActivityRegistry({
    runExecutionContextReader:
      overrides.runExecutionContextReader ?? new FakeRunExecutionContextReader(),
    dbtPluginRunner: overrides.dbtPluginRunner ?? new RecordingDbtPluginRunner(),
  });
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stepActivities', () => {
  it('fails fast when segment resolver deps are missing', () => {
    const invalidDeps = {
      ...buildDeps(),
      planArtifactReader: undefined,
    } as unknown as ActivityDeps;

    expect(() => createActivities(invalidDeps)).toThrow(
      EXPECTED_ERRORS.segmentResolverNotConfigured
    );
  });

  it('rejects mutated plan bytes before resolving execution segments', async () => {
    const planBytes = Buffer.from(JSON.stringify(SEGMENT_RESOLVER_PLAN), 'utf8');
    const mutatedPlanBytes = Buffer.from(
      JSON.stringify({
        ...SEGMENT_RESOLVER_PLAN,
        steps: [
          {
            stepId: 'mutated-segment-step',
            kind: 'DBT_TEST',
            dependsOn: [],
          },
        ],
      }),
      'utf8'
    );
    const planRef = createPlanRef({
      uri: 's3://bucket/plans/segment-plan.json',
      sha256: sha256Hex(planBytes),
      planId: SEGMENT_RESOLVER_PLAN.metadata.planId,
      planVersion: SEGMENT_RESOLVER_PLAN.metadata.planVersion,
      schemaVersion: SEGMENT_RESOLVER_PLAN.metadata.schemaVersion,
    });
    const { acts } = setupActivities({
      depOverrides: {
        integrity: new PlanIntegrityValidator({
          clock: new SequenceClock('2026-02-12T00:00:00.000Z'),
        }),
        fetcher: {
          async getStoredPlanValidationRecord() {
            return undefined;
          },
          async fetchStoredPlanArtifact() {
            return {
              bytes: mutatedPlanBytes,
              executionPolicy: {},
            };
          },
          async fetchStoredPlanArtifactForValidation() {
            return {
              bytes: mutatedPlanBytes,
              executionPolicy: {},
            };
          },
        },
      },
    });

    await expect(
      acts.resolveExecutionSegment({
        planRef,
        layerIndex: 0,
        ctx: CTX,
      })
    ).rejects.toThrow('PLAN_INTEGRITY_VALIDATION_FAILED');
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

    it('persists structured result evidence and failure diagnostics payloads', async () => {
      const { deps, acts } = setupActivities();

      await acts.emitEvent({
        ctx: CTX,
        planRef: PLAN_REF,
        eventType: 'RunCompleted',
        payload: {
          executor: 'postgres',
          resultEvidence: {
            executor: 'postgres',
            environmentId: 'env-1',
            sinkTable: 'analytics.orders_daily',
            rowsWritten: 42,
            startedAt: '2026-01-01T00:00:00.000Z',
            completedAt: '2026-01-01T00:00:05.000Z',
            durationMs: 5000,
          },
        },
      });
      await acts.emitEvent({
        ctx: CTX,
        planRef: PLAN_REF,
        eventType: 'StepFailed',
        stepId: 'sink-1',
        payload: {
          reason: 'SINK_WRITE_FAILED',
          message: 'duplicate key value violates unique constraint',
        },
      });

      const events = await deps.testStore.listEvents('run-1');
      expect(events).toHaveLength(2);
      expect(events[0]?.payload).toMatchObject({
        executor: 'postgres',
        resultEvidence: {
          sinkTable: 'analytics.orders_daily',
          rowsWritten: 42,
        },
      });
      expect(events[1]?.payload).toMatchObject({
        reason: 'SINK_WRITE_FAILED',
        message: 'duplicate key value violates unique constraint',
      });
    });

    it('retry-safe: transient failure then retry persists one logical event', async () => {
      const { deps, acts } = setupActivities({ store: new FailingFirstAppendStateStore() });

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
      const { deps, acts } = setupActivities({ store: new TestTxStore() });
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
    it('does not register DBT step kinds in the core activity registry by default', async () => {
      const { acts } = setupActivities();

      expect(DEFAULT_STEP_ACTIVITY_REGISTRY.has('DBT_MODEL')).toBe(false);
      expect(DEFAULT_STEP_ACTIVITY_REGISTRY.has('DBT_TEST')).toBe(false);
      expect(DEFAULT_STEP_ACTIVITY_REGISTRY.has('DBT_SNAPSHOT')).toBe(false);
      await expect(
        acts.executeStep({
          step: { stepId: 's1', kind: 'DBT_TEST' },
          ctx: CTX,
        })
      ).rejects.toThrow('UNSUPPORTED_STEP_KIND:DBT_TEST:s1');
    });

    it('returns COMPLETED for DBT only when the worker composes the DBT registry explicitly', async () => {
      const { acts } = setupActivities({ stepActivitiesByKind: createDbtRegistry() });

      const result = await acts.executeStep({
        step: { stepId: 's1', kind: 'DBT_TEST' },
        ctx: CTX,
      });
      expect(result).toEqual({ stepId: 's1', status: 'COMPLETED' });
    });

    it('registers the Temporal DBT plugin runtime subset from the DBT plugin manifest', () => {
      const registry = createDbtRegistry();

      expect(TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS).toEqual([
        'DBT_MODEL',
        'DBT_TEST',
        'DBT_SNAPSHOT',
      ]);
      expect([...registry.keys()]).toEqual([...TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS]);
      expect(registry.has('DBT_RUN')).toBe(false);
      expect(registry.has('DBT_COMPILE')).toBe(false);
    });

    it('composes DBT and SQL plugin activities without changing core dispatch', async () => {
      const sqlActivity: StepActivity = {
        async execute(step) {
          return { stepId: step.stepId, status: 'COMPLETED' };
        },
      };
      const pluginRegistry = composeTemporalStepPluginRegistries([
        { pluginId: 'dbt', stepActivitiesByKind: createDbtRegistry() },
        {
          pluginId: 'sql',
          stepActivitiesByKind: new Map([['SQL_TRANSFORM', sqlActivity]]),
        },
      ]);
      const { acts } = setupActivities({ stepActivitiesByKind: pluginRegistry });

      await expect(
        acts.executeStep({ step: { stepId: 's-dbt', kind: 'DBT_TEST' }, ctx: CTX })
      ).resolves.toEqual({ stepId: 's-dbt', status: 'COMPLETED' });
      await expect(
        acts.executeStep({
          step: { stepId: 's-sql', kind: 'SQL_TRANSFORM', dependsOn: [] },
          ctx: CTX,
        })
      ).resolves.toEqual({ stepId: 's-sql', status: 'COMPLETED' });
    });

    it('fails plugin composition when two plugins claim the same step kind', () => {
      const activity: StepActivity = {
        async execute(step) {
          return { stepId: step.stepId, status: 'COMPLETED' };
        },
      };

      expect(() =>
        composeTemporalStepPluginRegistries([
          { pluginId: 'sql-a', stepActivitiesByKind: new Map([['SQL_TRANSFORM', activity]]) },
          { pluginId: 'sql-b', stepActivitiesByKind: new Map([['SQL_TRANSFORM', activity]]) },
        ])
      ).toThrow('TEMPORAL_STEP_PLUGIN_KIND_CONFLICT:sql-b:SQL_TRANSFORM');
    });

    it(
      'rejects non-gateway step when kind is missing',
      expectExecuteStepRejects({ stepId: 's1' }, EXPECTED_ERRORS.stepKindRequired)
    );

    it('accepts step with dependsOn array', async () => {
      const { acts } = setupActivities({ stepActivitiesByKind: createDbtRegistry() });

      const result = await acts.executeStep({
        step: { stepId: 's2', kind: 'DBT_TEST', dependsOn: ['s1'] },
        ctx: CTX,
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('accepts step with stepTypeConfig', async () => {
      const { acts } = setupActivities({ stepActivitiesByKind: createDbtRegistry() });

      const result = await acts.executeStep({
        step: { stepId: 's3', kind: 'DBT_MODEL', stepTypeConfig: { stepTimeoutMs: 5000 } },
        ctx: CTX,
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('passes resolved dbt plugin context to the configured plugin runner', async () => {
      const runner = new RecordingDbtPluginRunner(async (input) => {
        return {
          stepId: input.step.stepId,
          status: 'COMPLETED',
          resultEvidence: {
            executor: 'dbt',
            environmentId: input.runContext.environmentId,
            sinkTable: 'analytics.orders_daily',
            rowsWritten: 7,
            startedAt: '2026-01-01T00:00:00.000Z',
            completedAt: '2026-01-01T00:00:03.000Z',
            durationMs: 3000,
          },
        };
      });
      const { acts } = setupActivities({
        stepActivitiesByKind: createDbtRegistry({ dbtPluginRunner: runner }),
      });

      const result = await acts.executeStep({
        step: { stepId: 's1', kind: 'DBT_MODEL' },
        ctx: CTX,
      });

      expect(result).toMatchObject({
        stepId: 's1',
        status: 'COMPLETED',
        resultEvidence: {
          executor: 'dbt',
          sinkTable: 'analytics.orders_daily',
          rowsWritten: 7,
        },
      });
      expect(runner.invocations).toHaveLength(1);
      expect(runner.invocations[0]).toMatchObject({
        executionIdentity: {
          tenantId: CTX.tenantId,
          runId: CTX.runId,
          environmentId: CTX.environmentId,
        },
        runContext: {
          runId: CTX.runId,
        },
        pluginContext: {
          projectBundleRef: {
            uri: `s3://bundle-bucket/tenants/${CTX.tenantId}/${'b'.repeat(64)}`,
            kind: 'dbt-project-bundle',
            sha256: 'b'.repeat(64),
            tenantId: CTX.tenantId,
          },
          targetProfile: 'dbt-dev',
        },
        runExecutionContext: {
          planId: PLAN_REF.planId,
          planVersion: PLAN_REF.planVersion,
        },
      });
    });

    it('fails closed when dbt step executes without runExecutionContextRef', async () => {
      const { acts } = setupActivities({ stepActivitiesByKind: createDbtRegistry() });

      await expect(
        acts.executeStep({
          step: { stepId: 's1', kind: 'DBT_TEST' },
          ctx: {
            ...CTX,
            runExecutionContextRef: undefined,
          },
        })
      ).rejects.toThrow(EXPECTED_ERRORS.runExecutionContextRequired);
    });

    it('allows composition to override DBT step kinds through the explicit activity registry', async () => {
      const replacementActivity: StepActivity = {
        async execute(step) {
          return { stepId: step.stepId, status: 'FAILED', failureReason: 'replacement' };
        },
      };
      const { acts } = setupActivities({
        stepActivitiesByKind: new Map([['DBT_TEST', replacementActivity]]),
      });

      const result = await acts.executeStep({
        step: { stepId: 's1', kind: 'DBT_TEST' },
        ctx: CTX,
      });

      expect(result).toEqual({
        stepId: 's1',
        status: 'FAILED',
        failureReason: 'replacement',
      });
    });

    it('fails closed when resolved context omits the dbt plugin payload', async () => {
      const { acts } = setupActivities({
        stepActivitiesByKind: createDbtRegistry({
          runExecutionContextReader: new FakeRunExecutionContextReader({
            ...RUN_EXECUTION_CONTEXT,
            pluginContexts: {},
          }),
        }),
      });

      await expect(
        acts.executeStep({
          step: { stepId: 's1', kind: 'DBT_TEST' },
          ctx: CTX,
        })
      ).rejects.toThrow(EXPECTED_ERRORS.dbtPluginContextRequired);
    });

    it('maps rejected runExecutionContext reads into a permanent step failure', async () => {
      const { acts } = setupActivities({
        stepActivitiesByKind: createDbtRegistry({
          runExecutionContextReader: {
            async resolve() {
              throw new RunExecutionContextRejectedError(
                'RUN_EXECUTION_CONTEXT_REJECTED_BY_FIXTURE'
              );
            },
          },
        }),
      });

      await expect(
        acts.executeStep({
          step: { stepId: 's1', kind: 'DBT_TEST' },
          ctx: CTX,
        })
      ).rejects.toThrow(EXPECTED_ERRORS.runExecutionContextRejected);
    });

    it('rejects invalid plugin runner results instead of accepting mismatched step ids', async () => {
      const runner = new RecordingDbtPluginRunner(async () => ({
        stepId: 'other-step',
        status: 'COMPLETED',
      }));
      const { acts } = setupActivities({
        stepActivitiesByKind: createDbtRegistry({ dbtPluginRunner: runner }),
      });

      await expect(
        acts.executeStep({
          step: { stepId: 's1', kind: 'DBT_TEST' },
          ctx: CTX,
        })
      ).rejects.toThrow(EXPECTED_ERRORS.dbtPluginResultInvalid);
    });

    it(
      'rejects simulateError on runtime step input',
      expectExecuteStepRejects(
        { stepId: 's1', kind: 'DBT_TEST', simulateError: 'permanent' },
        EXPECTED_ERRORS.fieldNotAllowedSimulateError
      )
    );

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
        { stepId: 's1', kind: 'DBT_TEST', forbidden: 'field' },
        EXPECTED_ERRORS.fieldNotAllowedForbidden
      )
    );

    it(
      'rejects step when inputBindings appears (not supported in v1 runtime)',
      expectExecuteStepRejects(
        {
          stepId: 's1',
          kind: 'DBT_TEST',
          inputBindings: [{ targetPath: '/x', sourceStepId: 's0', sourcePath: '/y' }],
        },
        EXPECTED_ERRORS.inputBindingsNotSupported
      )
    );

    it(
      'rejects unsupported task step kind when no activity is registered',
      expectExecuteStepRejects(
        { stepId: 's-python', kind: 'PYTHON_SCRIPT', dependsOn: [] },
        EXPECTED_ERRORS.unsupportedStepKind
      )
    );

    it('executes a registered non-DBT step kind without changing workflow logic', async () => {
      const pythonActivity: StepActivity = {
        async execute(step) {
          return { stepId: step.stepId, status: 'COMPLETED' };
        },
      };
      const { acts } = setupActivities({
        stepActivitiesByKind: new Map([['PYTHON_SCRIPT', pythonActivity]]),
      });

      const result = await acts.executeStep({
        step: { stepId: 's-python', kind: 'PYTHON_SCRIPT', dependsOn: [] },
        ctx: CTX,
      });

      expect(result).toEqual({ stepId: 's-python', status: 'COMPLETED' });
    });

    it('throws transient error when executor raises retryable failure', async () => {
      const { acts } = setupActivities({
        stepExecutors: withErrorExecutors(transientErrorExecutor('s1')),
      });
      await expect(
        acts.executeStep({ step: { stepId: 's1', kind: 'DBT_TEST' }, ctx: CTX })
      ).rejects.toThrow(EXPECTED_ERRORS.transientStepErrorS1);
    });

    it('throws permanent error when executor raises non-retryable failure', async () => {
      const { acts } = setupActivities({
        stepExecutors: withErrorExecutors(permanentErrorExecutor('s1')),
      });
      await expect(
        acts.executeStep({ step: { stepId: 's1', kind: 'DBT_TEST' }, ctx: CTX })
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
});
