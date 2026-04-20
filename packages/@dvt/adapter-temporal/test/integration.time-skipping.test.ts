/**
 * @file packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0010: Run Event Envelope Split
 * @baseline ADR-0011: RunStarted Ownership
 * @decision Section 2 — Build precondition mandatory
 * @decision Section 3 — Single teardown owner
 * @decision Section 4 — Prefer environment-provided client
 * @decision Section 5 — Time-skipping semantics
 * @consequence Tests are deterministic, isolated, and follow Temporal best practices
 * @version 1.0.0
 * @date 2026-02-21
 */

import {
  asNonBlankString,
  type EngineRunRef,
  type ExecutionPlan,
  type PlanRef,
  type ResolvedRunContext,
} from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { describe, expect, it } from 'vitest';

import { DEFAULT_STEP_EXECUTORS, type StepExecutor } from '../src/activities/stepActivities.js';
import { loadTemporalAdapterConfig, TemporalAdapter } from '../src/index.js';

import { createExecutionPlan } from './helpers/contractFixtures.js';
import {
  assertWorkflowArtifactPresentInCi,
  createDbtActivityDeps,
  createPlanRef,
  createRunContext,
  createSingleRunDbtTimeSkippingHarness,
  createTenantWorkerHost,
  INTEGRATION_TEST_TIMEOUT,
  mkLinearPlan,
  mkLinearThreeStepPlan,
  mkPlan,
  RunId,
  TestOutbox,
  TestProjector,
  TestStateStore,
  waitForCondition,
  withDbtRunExecutionContext,
  WORKFLOW_PATH,
  type RunStatusValue,
  type WaitForConditionFn,
} from './integration.time-skipping.shared.js';

assertWorkflowArtifactPresentInCi();

async function waitForTerminalStatus(
  adapter: TemporalAdapter,
  runRef: EngineRunRef,
  waitForCondition: WaitForConditionFn,
  timeoutMs = 10_000
): Promise<RunStatusValue> {
  await waitForCondition(
    () => adapter.getProviderStatusView(runRef),
    (s) =>
      s.providerStatus === 'COMPLETED' ||
      s.providerStatus === 'FAILED' ||
      s.providerStatus === 'CANCELLED',
    { timeoutMs }
  );
  const status = await adapter.getProviderStatusView(runRef);
  return status.providerStatus as RunStatusValue;
}

interface CancelScenarioRequest {
  mode: 'signal' | 'cancel';
  adapter: TemporalAdapter;
  plan: Parameters<TemporalAdapter['startRun']>[0];
  planRef: PlanRef;
  runContext: ResolvedRunContext;
  store: TestStateStore;
  waitForCondition: WaitForConditionFn;
}

async function runCancelScenario(args: CancelScenarioRequest): Promise<{
  status: RunStatusValue;
  cancelledCount: number;
  eventTypes: string[];
}> {
  const runRef = await args.adapter.startRun(args.plan, args.planRef, args.runContext);
  const runId = RunId.of(args.runContext.runId);
  await args.waitForCondition(
    () => args.store.listRunEvents(runId),
    (events) => events.some((event) => event.eventType === 'StepStarted'),
    { timeoutMs: 30_000 }
  );

  if (args.mode === 'signal') {
    await args.adapter.signal(runRef, {
      signalId: asNonBlankString(`s-${args.runContext.runId}`),
      type: 'CANCEL',
    });
  } else {
    await args.adapter.cancelRun(runRef);
  }

  const status = await waitForTerminalStatus(args.adapter, runRef, args.waitForCondition);
  await args.waitForCondition(
    () => args.store.listRunEvents(runId),
    (events) => events.some((event) => event.eventType === 'RunCancelled'),
    { timeoutMs: 30_000 }
  );
  const events = await args.store.listRunEvents(RunId.of(runRef.runId));
  const cancelledCount = events.filter((e) => e.eventType === 'RunCancelled').length;
  const eventTypes = events.map((event) => event.eventType);

  return { status, cancelledCount, eventTypes };
}

type CancelScenarioResult = Awaited<ReturnType<typeof runCancelScenario>>;

function assertOrderedCancellationLifecycle(eventTypes: string[]): void {
  expect(eventTypes.indexOf('RunCancelRequested')).toBeGreaterThanOrEqual(0);
  expect(eventTypes.indexOf('RunCancelled')).toBeGreaterThan(
    eventTypes.indexOf('RunCancelRequested')
  );
  expect(eventTypes).not.toContain('RunCompleted');
}

function expectCancelScenarioOutcome(
  result: CancelScenarioResult,
  expectedStatus: RunStatusValue
): void {
  expect(result.status).toBe(expectedStatus);
  expect(result.cancelledCount).toBeLessThanOrEqual(1);
  assertOrderedCancellationLifecycle(result.eventTypes);
}

function createBlockingExecutor(targetStepId: string): {
  executor: StepExecutor;
  waitUntilExecuting: Promise<void>;
  release: () => void;
} {
  let markExecuting: (() => void) | null = null;
  let releaseExecution: (() => void) | null = null;
  const waitUntilExecuting = new Promise<void>((resolve) => {
    markExecuting = resolve;
  });

  return {
    executor: {
      canExecute(step) {
        return step.stepId === targetStepId;
      },
      async execute(step) {
        markExecuting?.();
        await new Promise<void>((resolve) => {
          releaseExecution = resolve;
        });
        return { stepId: step.stepId, status: 'COMPLETED' };
      },
    },
    waitUntilExecuting,
    release() {
      if (!releaseExecution) {
        throw new Error('BLOCKING_EXECUTOR_NOT_READY');
      }
      releaseExecution();
    },
  };
}

function mkGatewaySkipPlan(): ExecutionPlan {
  return createExecutionPlan({
    inputHashSha256: 'b'.repeat(64),
    steps: [
      { stepId: 's-1', kind: 'DBT_MODEL', dependsOn: [] },
      {
        stepId: 'gw-1',
        kind: 'GATEWAY',
        type: 'gateway',
        gateway: {
          dslVersion: '1.0',
          expression: "status='FAILED'",
        },
        dependsOn: ['s-1'],
      },
      { stepId: 's-2', kind: 'DBT_MODEL', dependsOn: ['gw-1'] },
    ],
  });
}

async function createCancellationHarness(args: {
  cancelCtx: ResolvedRunContext;
  planBytes: Buffer;
  planRef: PlanRef;
  signalCtx: ResolvedRunContext;
  taskQueue: string;
}): Promise<{
  adapter: TemporalAdapter;
  env: TestWorkflowEnvironment;
  observedProjectBundles: string[];
  store: TestStateStore;
  worker: ReturnType<typeof createTenantWorkerHost>;
}> {
  const env = await TestWorkflowEnvironment.createTimeSkipping();
  const store = new TestStateStore();
  const outbox = new TestOutbox();
  const observedProjectBundles: string[] = [];

  const temporalConfig = loadTemporalAdapterConfig({
    TEMPORAL_NAMESPACE: 'default',
    TEMPORAL_TASK_QUEUE: args.taskQueue,
    TEMPORAL_IDENTITY: 'adapter-temporal-it',
  });

  const worker = createTenantWorkerHost({
    temporalConfig,
    tenantId: args.signalCtx.tenantId,
    workflowsPath: WORKFLOW_PATH,
    activityDeps: createDbtActivityDeps({
      store,
      outbox,
      bindings: [
        { ctx: args.signalCtx, planRef: args.planRef, planBytes: args.planBytes },
        { ctx: args.cancelCtx, planRef: args.planRef, planBytes: args.planBytes },
      ],
      dbtPluginRunner: {
        async execute(input) {
          observedProjectBundles.push(input.pluginContext.projectBundleRef.uri);
          return { stepId: input.step.stepId, status: 'COMPLETED' };
        },
      },
    }),
  });

  await worker.start(env.nativeConnection);

  return {
    adapter: new TemporalAdapter({
      workflowClient: env.client.workflow,
      config: temporalConfig,
    }),
    env,
    observedProjectBundles,
    store,
    worker,
  };
}

function expectDistinctObservedProjectBundles(observedProjectBundles: readonly string[]): void {
  const uniqueObservedProjectBundles = [...new Set(observedProjectBundles)];
  expect(uniqueObservedProjectBundles).toHaveLength(2);
  expect(uniqueObservedProjectBundles).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^s3:\/\/bundle-bucket\/tenants\/t-it\/[a-f0-9]{64}$/),
      expect.stringMatching(/^s3:\/\/bundle-bucket\/tenants\/t-it\/[a-f0-9]{64}$/),
    ])
  );
}

describe('temporal integration (time-skipping)', () => {
  /**
   * @verifies ADR-0001 Section 2 — Build precondition
   * @verifies ADR-0001 Section 3 — Single teardown owner
   * @verifies ADR-0001 Section 4 — Environment client
   * @verifies ADR-0001 Section 5 — Time-skipping semantics
   */
  it(
    'executes startRun -> status -> cancel against TestWorkflowEnvironment',
    async () => {
      const plan = mkLinearPlan(250);
      const harness = await createSingleRunDbtTimeSkippingHarness({
        plan,
        planRefId: 'it-plan',
        runId: 'run-it-1',
        taskQueue: 'dvt-it-time-skipping',
      });
      const { adapter, ctx, env, planRef, store } = harness;
      const worker = await harness.startWorker();

      try {
        const runRef = await adapter.startRun(plan, planRef, ctx);
        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((event) => event.eventType === 'StepStarted'),
          { timeoutMs: 30_000 }
        );

        const status = await adapter.getProviderStatusView(runRef);
        // After the provider-native status fix, describe() returns Temporal-native
        // statuses only. A DVT-paused workflow is still RUNNING from Temporal's
        // perspective.
        expect(status.providerStatus).toBe('RUNNING');

        await adapter.cancelRun(runRef);

        const afterCancel = await waitForTerminalStatus(adapter, runRef, waitForCondition);
        expect(afterCancel).toBe('CANCELLED');
      } finally {
        // Teardown (ADR-0001 Section 3: single teardown owner)
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'executes a planner-backed stored plan ref through the Temporal runtime',
    async () => {
      const plan = mkLinearThreeStepPlan();
      const harness = await createSingleRunDbtTimeSkippingHarness({
        plan,
        planRefId: 'it-plan-linear-3',
        planRefOptions: { uri: 'dvt-plan://stored/it-plan-linear-3' },
        runId: 'run-it-stored-plan-temporal',
        taskQueue: 'dvt-it-time-skipping-stored-plan',
      });
      const { adapter, ctx, env, planRef, store } = harness;
      const worker = await harness.startWorker();

      try {
        await adapter.startRun(plan, planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((event) => event.eventType === 'RunCompleted'),
          { timeoutMs: 30_000 }
        );

        const events = await store.listRunEvents(RunId.of(ctx.runId));
        expect(events.every((event) => event.planId === planRef.planId)).toBe(true);
        expect(events.every((event) => event.planVersion === planRef.planVersion)).toBe(true);
        expect(events.at(-1)?.eventType).toBe('RunCompleted');
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  /**
   * @verifies ADR-0001 Section 3 — Single teardown owner
   * @verifies ADR-0011 — RunCancelled event semantics
   */
  it(
    'signal(CANCEL) and cancelRun() preserve ordered canonical cancellation while keeping distinct provider terminal semantics',
    async () => {
      const plan = mkLinearPlan(10);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');
      const planRef = createPlanRef('it-plan', planBytes);
      const signalCtx = withDbtRunExecutionContext(
        createRunContext(RunId.of('run-it-cancel-1')),
        planRef
      );
      const cancelCtx = withDbtRunExecutionContext(
        createRunContext(RunId.of('run-it-cancel-2')),
        planRef
      );
      const { adapter, env, observedProjectBundles, store, worker } =
        await createCancellationHarness({
          signalCtx,
          cancelCtx,
          planRef,
          planBytes,
          taskQueue: 'dvt-it-time-skipping-cancel',
        });

      try {
        const signalResult = await runCancelScenario({
          mode: 'signal',
          adapter,
          plan,
          planRef,
          runContext: signalCtx,
          store,
          waitForCondition,
        });
        expectCancelScenarioOutcome(signalResult, 'COMPLETED');

        const cancelResult = await runCancelScenario({
          mode: 'cancel',
          adapter,
          plan,
          planRef,
          runContext: cancelCtx,
          store,
          waitForCondition,
        });
        expectCancelScenarioOutcome(cancelResult, 'CANCELLED');

        expect(signalResult.cancelledCount).toBe(cancelResult.cancelledCount);
        expectDistinctObservedProjectBundles(observedProjectBundles);
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'cancel requested during finalization preserves runtime-owned cancellation ordering',
    async () => {
      const plan = mkPlan(1);
      const blocker = createBlockingExecutor('s-1');
      const harness = await createSingleRunDbtTimeSkippingHarness({
        plan,
        planRefId: 'it-plan',
        runId: 'run-it-cancel-finalization-1',
        taskQueue: 'dvt-it-time-skipping-cancel-finalization',
      });
      const { adapter, ctx, env, planRef, store } = harness;
      const worker = await harness.startWorker({
        stepExecutors: [blocker.executor, ...DEFAULT_STEP_EXECUTORS],
      });

      try {
        const runRef = await adapter.startRun(plan, planRef, ctx);

        await blocker.waitUntilExecuting;
        await adapter.cancelRun(runRef);
        blocker.release();

        await waitForCondition(
          () => store.listRunEvents(RunId.of(runRef.runId)),
          (events) => events.some((event) => event.eventType === 'RunCancelled'),
          { timeoutMs: 30_000 }
        );

        const providerStatus = await waitForTerminalStatus(adapter, runRef, waitForCondition);
        expect(providerStatus).toBe('CANCELLED');

        const eventTypes = (await store.listRunEvents(RunId.of(runRef.runId))).map(
          (event) => event.eventType
        );
        assertOrderedCancellationLifecycle(eventTypes);
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'native Temporal handle cancellation preserves runtime-owned cancellation ordering',
    async () => {
      const plan = mkLinearPlan(10);
      const harness = await createSingleRunDbtTimeSkippingHarness({
        plan,
        planRefId: 'it-plan',
        runId: 'run-it-native-cancel-1',
        taskQueue: 'dvt-it-time-skipping-native-cancel',
      });
      const { adapter, ctx, env, planRef, store } = harness;
      const worker = await harness.startWorker();

      try {
        const runRef = await adapter.startRun(plan, planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((event) => event.eventType === 'StepStarted'),
          { timeoutMs: 30_000 }
        );

        await env.client.workflow.getHandle(runRef.workflowId).cancel();

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((event) => event.eventType === 'RunCancelled'),
          { timeoutMs: 30_000 }
        );

        const providerStatus = await waitForTerminalStatus(adapter, runRef, waitForCondition);
        expect(providerStatus).toBe('CANCELLED');

        const eventTypes = (await store.listRunEvents(RunId.of(runRef.runId))).map(
          (event) => event.eventType
        );
        assertOrderedCancellationLifecycle(eventTypes);
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'gateway path: evaluates DSL in activity boundary and emits StepSkipped deterministically',
    async () => {
      const projector = new TestProjector();
      const plan = mkGatewaySkipPlan();
      const harness = await createSingleRunDbtTimeSkippingHarness({
        plan,
        planRefId: 'it-plan-gateway-skip',
        runId: 'run-it-gateway-skip',
        taskQueue: 'dvt-it-time-skipping-gateway-skip',
        contextOverrides: { tenantId: 't-it' },
      });
      const { adapter, ctx, env, planRef, store } = harness;
      const worker = await harness.startWorker();

      try {
        await adapter.startRun(plan, planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((e) => e.eventType === 'RunCompleted'),
          { timeoutMs: 30_000 }
        );

        const events = await store.listRunEvents(RunId.of(ctx.runId));
        expect(events.map((e) => `${e.eventType}:${e.stepId ?? '-'}`)).toEqual([
          'RunStarted:-',
          'StepStarted:s-1',
          'StepCompleted:s-1',
          'StepStarted:gw-1',
          'StepCompleted:gw-1',
          'StepSkipped:s-2',
          'RunCompleted:-',
        ]);

        const gatewayCompleted = events.find(
          (e) => e.eventType === 'StepCompleted' && e.stepId === 'gw-1'
        );
        expect(gatewayCompleted).toBeDefined();
        expect(
          (gatewayCompleted?.payload as { gatewayDecision?: boolean } | undefined)?.gatewayDecision
        ).toBe(false);

        expect(events.every((e, idx) => e.runSeq === idx + 1)).toBe(true);

        const projected = projector.rebuild(ctx.runId, events);
        expect(projected.status).toBe('COMPLETED');
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'crash recovery: worker restart preserves idempotency (no duplicate idempotencyKey)',
    async () => {
      const plan = mkLinearPlan(40);
      const harness = await createSingleRunDbtTimeSkippingHarness({
        plan,
        planRefId: 'it-plan',
        runId: 'run-it-crash-recovery',
        taskQueue: 'dvt-it-time-skipping-crash-recovery',
      });
      const { adapter, ctx, env, planRef, store } = harness;
      const worker1 = await harness.startWorker();

      try {
        const _runRef = await adapter.startRun(plan, planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((e) => e.eventType === 'StepStarted'),
          { timeoutMs: 30_000 }
        );
        const eventsBeforeRestart = await store.listRunEvents(RunId.of(ctx.runId));
        const lastRunSeqBeforeRestart = eventsBeforeRestart.at(-1)?.runSeq ?? 0;

        await worker1.shutdown();

        const worker2 = await harness.startWorker();

        try {
          await new Promise((resolve) => setTimeout(resolve, 2_000));
          const resumedEvents = await store.listRunEvents(RunId.of(ctx.runId));
          const uniqueKeys = new Set(resumedEvents.map((e) => e.idempotencyKey));
          expect(uniqueKeys.size).toBe(resumedEvents.length);
          expect((resumedEvents.at(-1)?.runSeq ?? 0) >= lastRunSeqBeforeRestart).toBe(true);
        } finally {
          await worker2.shutdown();
        }
      } finally {
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'deduplicates stale PAUSE signal ids across a pause-resume cycle',
    async () => {
      const plan = mkLinearThreeStepPlan();
      const blocker1 = createBlockingExecutor('s-1');
      const blocker2 = createBlockingExecutor('s-2');
      const harness = await createSingleRunDbtTimeSkippingHarness({
        plan,
        planRefId: 'it-plan-pause-signal-id-dedupe',
        runId: 'run-it-pause-signal-id-dedupe-1',
        taskQueue: 'dvt-it-time-skipping-pause-signal-id-dedupe',
      });
      const { adapter, ctx: runCtx, env, planRef, store } = harness;
      const worker = await harness.startWorker({
        stepExecutors: [blocker1.executor, blocker2.executor, ...DEFAULT_STEP_EXECUTORS],
      });

      try {
        const runId = RunId.of(runCtx.runId);
        const runRef = await adapter.startRun(plan, planRef, runCtx);

        await blocker1.waitUntilExecuting;
        await adapter.signal(runRef, {
          signalId: asNonBlankString('sig-pause-1'),
          type: 'PAUSE',
        });
        blocker1.release();

        await waitForCondition(
          () => store.listRunEvents(runId),
          (events) => events.filter((event) => event.eventType === 'RunPaused').length === 1,
          { timeoutMs: 30_000 }
        );

        await adapter.signal(runRef, {
          signalId: asNonBlankString('sig-resume-1'),
          type: 'RESUME',
        });

        await waitForCondition(
          () => store.listRunEvents(runId),
          (events) => events.filter((event) => event.eventType === 'RunResumed').length === 1,
          { timeoutMs: 30_000 }
        );

        await blocker2.waitUntilExecuting;
        await adapter.signal(runRef, {
          signalId: asNonBlankString('sig-pause-1'),
          type: 'PAUSE',
        });
        blocker2.release();

        const status = await waitForTerminalStatus(adapter, runRef, waitForCondition, 30_000);
        expect(status).toBe('COMPLETED');

        const eventTypes = (await store.listRunEvents(runId)).map((event) => event.eventType);
        expect(eventTypes.filter((eventType) => eventType === 'RunPaused')).toHaveLength(1);
        expect(eventTypes.filter((eventType) => eventType === 'RunResumed')).toHaveLength(1);
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );
});
