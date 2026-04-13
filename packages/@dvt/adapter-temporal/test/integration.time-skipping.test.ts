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

import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { describe, expect, it } from 'vitest';

import { DEFAULT_STEP_EXECUTORS, type StepExecutor } from '../src/activities/stepActivities.js';
import {
  loadTemporalAdapterConfig,
  TemporalAdapter,
  TemporalWorkerHost,
  toTemporalTaskQueue,
} from '../src/index.js';

import {
  INTEGRATION_TEST_TIMEOUT,
  type RunStatusValue,
  type WaitForConditionFn,
  RunId,
  TestOutbox,
  TestProjector,
  TestStateStore,
  WORKFLOW_PATH,
  assertWorkflowArtifactPresentInCi,
  createActivityDeps,
  createPlanRef,
  createRunContext,
  mkLinearThreeStepPlan,
  waitForCondition,
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
  runId: RunId;
  store: TestStateStore;
  waitForCondition: WaitForConditionFn;
}

async function runCancelScenario(args: CancelScenarioRequest): Promise<{
  status: RunStatusValue;
  cancelledCount: number;
  eventTypes: string[];
}> {
  const runCtx = createRunContext(args.runId);
  const runRef = await args.adapter.startRun(args.plan, args.planRef, runCtx);
  await args.waitForCondition(
    () => args.store.listRunEvents(args.runId),
    (events) => events.some((event) => event.eventType === 'StepStarted'),
    { timeoutMs: 30_000 }
  );

  if (args.mode === 'signal') {
    await args.adapter.signal(runRef, { signalId: `s-${args.runId.value}`, type: 'CANCEL' });
  } else {
    await args.adapter.cancelRun(runRef);
  }

  const status = await waitForTerminalStatus(args.adapter, runRef, args.waitForCondition);
  await args.waitForCondition(
    () => args.store.listRunEvents(args.runId),
    (events) => events.some((event) => event.eventType === 'RunCancelled'),
    { timeoutMs: 30_000 }
  );
  const events = await args.store.listRunEvents(RunId.of(runRef.runId));
  const cancelledCount = events.filter((e) => e.eventType === 'RunCancelled').length;
  const eventTypes = events.map((event) => event.eventType);

  return { status, cancelledCount, eventTypes };
}

function assertOrderedCancellationLifecycle(eventTypes: string[]): void {
  expect(eventTypes.indexOf('RunCancelRequested')).toBeGreaterThanOrEqual(0);
  expect(eventTypes.indexOf('RunCancelled')).toBeGreaterThan(
    eventTypes.indexOf('RunCancelRequested')
  );
  expect(eventTypes).not.toContain('RunCompleted');
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

function mkPlan(stepCount: number): unknown {
  return {
    metadata: {
      planId: 'it-plan',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: Array.from({ length: stepCount }, (_, i) => ({
      stepId: `s-${i + 1}`,
      kind: 'DBT_MODEL',
    })),
  } as const;
}

function mkLinearPlan(stepCount: number): unknown {
  return {
    metadata: {
      planId: 'it-plan',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: Array.from({ length: stepCount }, (_, i) => ({
      stepId: `s-${i + 1}`,
      kind: 'DBT_MODEL',
      ...(i === 0 ? {} : { dependsOn: [`s-${i}`] }),
    })),
  } as const;
}

function mkGatewaySkipPlan(): unknown {
  return {
    metadata: {
      planId: 'it-plan-gateway-skip',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: [
      { stepId: 's-1', kind: 'DBT_MODEL' },
      {
        stepId: 'gw-1',
        type: 'gateway',
        gateway: {
          dslVersion: '1.0',
          expression: "status='FAILED'",
        },
        dependsOn: ['s-1'],
      },
      { stepId: 's-2', kind: 'DBT_MODEL', dependsOn: ['gw-1'] },
    ],
  } as const;
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
      // Setup (ADR-0001 Section 4: usar environment-provided client)
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearPlan(250);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan', planBytes);
      const ctx = createRunContext(RunId.of('run-it-1'));

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
      });

      await worker.start(env.nativeConnection); // ? usa env.nativeConnection

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow, // ? usa env.client
        config: temporalConfig,
      });

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
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearThreeStepPlan();
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan-linear-3', planBytes, {
        uri: 'dvt-plan://stored/it-plan-linear-3',
      });
      const ctx = createRunContext(RunId.of('run-it-stored-plan-temporal'));

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-stored-plan',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

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
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearPlan(10);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');
      const planRef = createPlanRef('it-plan', planBytes);

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-cancel',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue('t-it', temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

      try {
        const signalResult = await runCancelScenario({
          mode: 'signal',
          adapter,
          plan,
          planRef,
          runId: RunId.of('run-it-cancel-1'),
          store,
          waitForCondition,
        });
        expect(signalResult.status).toBe('COMPLETED');
        expect(signalResult.cancelledCount).toBeLessThanOrEqual(1);
        expect(signalResult.eventTypes.indexOf('RunCancelRequested')).toBeGreaterThanOrEqual(0);
        expect(signalResult.eventTypes.indexOf('RunCancelled')).toBeGreaterThan(
          signalResult.eventTypes.indexOf('RunCancelRequested')
        );

        const cancelResult = await runCancelScenario({
          mode: 'cancel',
          adapter,
          plan,
          planRef,
          runId: RunId.of('run-it-cancel-2'),
          store,
          waitForCondition,
        });
        expect(cancelResult.status).toBe('CANCELLED');
        expect(cancelResult.cancelledCount).toBeLessThanOrEqual(1);
        expect(cancelResult.eventTypes.indexOf('RunCancelRequested')).toBeGreaterThanOrEqual(0);
        expect(cancelResult.eventTypes.indexOf('RunCancelled')).toBeGreaterThan(
          cancelResult.eventTypes.indexOf('RunCancelRequested')
        );

        expect(signalResult.cancelledCount).toBe(cancelResult.cancelledCount);
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
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const projector = new TestProjector();
      const plan = mkPlan(1);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');
      const planRef = createPlanRef('it-plan', planBytes);
      const blocker = createBlockingExecutor('s-1');

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-cancel-finalization',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue('t-it', temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
        stepExecutors: [blocker.executor, ...DEFAULT_STEP_EXECUTORS],
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
        stateStore: store,
        projector,
      });

      try {
        const runId = RunId.of('run-it-cancel-finalization-1');
        const runRef = await adapter.startRun(plan, planRef, createRunContext(runId));

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
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearPlan(10);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');
      const planRef = createPlanRef('it-plan', planBytes);
      const ctx = createRunContext(RunId.of('run-it-native-cancel-1'));

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-native-cancel',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

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
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const projector = new TestProjector();
      const plan = mkGatewaySkipPlan();
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan-gateway-skip', planBytes);
      const ctx: ResolvedRunContext = {
        ...createRunContext(RunId.of('run-it-gateway-skip')),
        tenantId: 't-it',
      };

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-gateway-skip',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

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
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearPlan(40);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan', planBytes);
      const ctx = createRunContext(RunId.of('run-it-crash-recovery'));

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-crash-recovery',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const mkWorker = (): TemporalWorkerHost =>
        new TemporalWorkerHost({
          temporalConfig: {
            ...temporalConfig,
            taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
          },
          workflowsPath: WORKFLOW_PATH,
          activityDeps: createActivityDeps(store, outbox, planBytes),
        });

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

      const worker1 = mkWorker();
      await worker1.start(env.nativeConnection);

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

        const worker2 = mkWorker();
        await worker2.start(env.nativeConnection);

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
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearThreeStepPlan();
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');
      const planRef = createPlanRef('it-plan-pause-signal-id-dedupe', planBytes);
      const blocker1 = createBlockingExecutor('s-1');
      const blocker2 = createBlockingExecutor('s-2');

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-pause-signal-id-dedupe',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue('t-it', temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
        stepExecutors: [blocker1.executor, blocker2.executor, ...DEFAULT_STEP_EXECUTORS],
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

      try {
        const runId = RunId.of('run-it-pause-signal-id-dedupe-1');
        const runRef = await adapter.startRun(plan, planRef, createRunContext(runId));

        await blocker1.waitUntilExecuting;
        await adapter.signal(runRef, { signalId: 'sig-pause-1', type: 'PAUSE' });
        blocker1.release();

        await waitForCondition(
          () => store.listRunEvents(runId),
          (events) => events.filter((event) => event.eventType === 'RunPaused').length === 1,
          { timeoutMs: 30_000 }
        );

        await adapter.signal(runRef, { signalId: 'sig-resume-1', type: 'RESUME' });

        await waitForCondition(
          () => store.listRunEvents(runId),
          (events) => events.filter((event) => event.eventType === 'RunResumed').length === 1,
          { timeoutMs: 30_000 }
        );

        await blocker2.waitUntilExecuting;
        await adapter.signal(runRef, { signalId: 'sig-pause-1', type: 'PAUSE' });
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
