/**
 * @file packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0010: Run Event Envelope Split
 * @baseline ADR-0011: RunStarted Ownership
 * @decision Transformation-flow verification lives outside the Temporal baseline suite
 * @consequence Temporal baseline stays provider-agnostic while transformation semantics keep dedicated coverage
 */

import {
  asIsoUtcString,
  asNonBlankString,
  type ExecutionPlan,
  type MaterializationEvidence,
} from '@dvt/contracts';
import { ApplicationFailure } from '@temporalio/activity';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { describe, expect, it } from 'vitest';

import { DEFAULT_STEP_EXECUTORS, type DbtPluginRunner } from '../src/activities/stepActivities.js';
import { loadTemporalAdapterConfig, TemporalAdapter } from '../src/index.js';

import {
  createDbtActivityDeps,
  createTenantWorkerHost,
  INTEGRATION_TEST_TIMEOUT,
  RunId,
  TestOutbox,
  TestProjector,
  TestStateStore,
  WORKFLOW_PATH,
  assertWorkflowArtifactPresentInCi,
  createPlanRef,
  createRunContext,
  mkLinearThreeStepPlan,
  mkPermanentFailurePlan,
  waitForCondition,
  withTransformationRuntimeBinding,
  withDbtRunExecutionContext,
} from './integration.time-skipping.shared.js';

assertWorkflowArtifactPresentInCi();

type RunEvents = Awaited<ReturnType<TestStateStore['listRunEvents']>>;

async function createTransformationHarness(args: {
  dbtPluginRunner?: DbtPluginRunner;
  plan: ExecutionPlan;
  planRefId: string;
  runId: string;
  taskQueue: string;
}): Promise<{
  adapter: TemporalAdapter;
  ctx: ReturnType<typeof withDbtRunExecutionContext>;
  env: TestWorkflowEnvironment;
  planBytes: Buffer;
  planRef: ReturnType<typeof createPlanRef>;
  projector: TestProjector;
  store: TestStateStore;
  worker: ReturnType<typeof createTenantWorkerHost>;
}> {
  const env = await TestWorkflowEnvironment.createTimeSkipping();

  const store = new TestStateStore();
  const outbox = new TestOutbox();
  const projector = new TestProjector();
  const planBytes = Buffer.from(JSON.stringify(args.plan), 'utf-8');
  const planRef = createPlanRef(args.planRefId, planBytes);
  const ctx = withDbtRunExecutionContext(
    createRunContext(RunId.of(args.runId), { tenantId: 't-it' }),
    planRef
  );

  const temporalConfig = loadTemporalAdapterConfig({
    TEMPORAL_NAMESPACE: 'default',
    TEMPORAL_TASK_QUEUE: args.taskQueue,
    TEMPORAL_IDENTITY: 'adapter-temporal-it',
  });

  const worker = createTenantWorkerHost({
    temporalConfig,
    tenantId: ctx.tenantId,
    workflowsPath: WORKFLOW_PATH,
    activityDeps: createDbtActivityDeps({
      store,
      outbox,
      bindings: [{ ctx, planRef, planBytes }],
      dbtPluginRunner: args.dbtPluginRunner,
    }),
    stepExecutors: DEFAULT_STEP_EXECUTORS,
  });

  await worker.start(env.nativeConnection);

  const adapter = new TemporalAdapter({
    workflowClient: env.client.workflow,
    config: temporalConfig,
  });

  return {
    adapter,
    ctx,
    env,
    planBytes,
    planRef,
    projector,
    store,
    worker,
  };
}

function expectCompletedTransformationLifecycle(args: {
  events: RunEvents;
  projector: TestProjector;
  resultEvidence: MaterializationEvidence;
  runId: string;
}): void {
  const { events, projector, resultEvidence, runId } = args;

  expect(events.map((event) => `${event.eventType}:${event.stepId ?? '-'}`)).toEqual([
    'RunStarted:-',
    'StepStarted:s-1',
    'StepCompleted:s-1',
    'StepStarted:s-2',
    'StepCompleted:s-2',
    'StepStarted:s-3',
    'StepCompleted:s-3',
    'RunCompleted:-',
  ]);
  expect(events.every((event, index) => event.runSeq === index + 1)).toBe(true);
  expect(events.find((event) => event.eventType === 'RunStarted')?.payload).toMatchObject({
    executor: 'dbt',
  });
  expect(
    events.find((event) => event.eventType === 'StepCompleted' && event.stepId === 's-3')?.payload
  ).toMatchObject({
    resultEvidence,
  });
  expect(events.find((event) => event.eventType === 'RunCompleted')?.payload).toMatchObject({
    executor: 'dbt',
    resultEvidence,
  });

  const projected = projector.rebuild(runId, events);
  expect(projected.status).toBe('COMPLETED');
}

function expectPermanentFailureLifecycle(args: {
  events: RunEvents;
  projector: TestProjector;
  runId: string;
}): void {
  const { events, projector, runId } = args;

  expect(events.map((event) => `${event.eventType}:${event.stepId ?? '-'}`)).toEqual([
    'RunStarted:-',
    'StepStarted:s-fail',
    'StepFailed:s-fail',
    'RunFailed:-',
  ]);
  expect(events.find((event) => event.eventType === 'RunStarted')?.payload).toMatchObject({
    executor: 'dbt',
  });
  expect(events.find((event) => event.eventType === 'StepFailed')?.payload).toMatchObject({
    reason: 'PermanentStepError',
    message: 'PERMANENT_STEP_ERROR:s-fail',
  });
  expect(events.find((event) => event.eventType === 'RunFailed')?.payload).toMatchObject({
    reason: 'STEP_FAILURE',
    executor: 'dbt',
    message: 'PERMANENT_STEP_ERROR:s-fail',
  });

  const projected = projector.rebuild(runId, events);
  expect(projected.status).toBe('FAILED');
}

describe('temporal integration (transformation runtime)', () => {
  /**
   * @verifies ADR-0010 Section 3.2 — Ordering via runSeq
   * @verifies ADR-0010 Section 3.6 — Atomic append
   * @verifies ADR-0011 — RunStarted ownership
   */
  it(
    'golden path: linear 3-step transformation plan emits result evidence and completes deterministically',
    async () => {
      const resultEvidence: MaterializationEvidence = {
        executor: 'dbt',
        environmentId: asNonBlankString('t-it'),
        sinkTable: asNonBlankString('analytics.orders_daily'),
        rowsWritten: 42,
        startedAt: asIsoUtcString('2026-01-01T00:00:00.000Z'),
        completedAt: asIsoUtcString('2026-01-01T00:00:05.000Z'),
        durationMs: 5000,
      };
      const plan = withTransformationRuntimeBinding(mkLinearThreeStepPlan(), 'dbt');
      const { adapter, ctx, env, planRef, projector, store, worker } =
        await createTransformationHarness({
          plan,
          planRefId: 'it-plan-linear-3',
          runId: 'run-it-linear-3',
          taskQueue: 'dvt-it-time-skipping-linear-3',
          dbtPluginRunner: {
            async execute(input) {
              if (input.step.stepId === 's-3') {
                return {
                  stepId: input.step.stepId,
                  status: 'COMPLETED',
                  resultEvidence,
                };
              }
              return { stepId: input.step.stepId, status: 'COMPLETED' };
            },
          },
        });

      try {
        await adapter.startRun(planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((event) => event.eventType === 'RunCompleted'),
          { timeoutMs: 30_000 }
        );

        const events = await store.listRunEvents(RunId.of(ctx.runId));
        expectCompletedTransformationLifecycle({
          events,
          projector,
          resultEvidence,
          runId: ctx.runId,
        });
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  /**
   * @verifies ADR-0012 — Plan integrity validation
   * @verifies ADR-0010 Section 3.5 — Retry semantics
   */
  it(
    'retry/error path: permanent transformation step failure emits StepFailed + RunFailed deterministically',
    async () => {
      const plan = withTransformationRuntimeBinding(mkPermanentFailurePlan(), 'dbt');
      const { adapter, ctx, env, planRef, projector, store, worker } =
        await createTransformationHarness({
          plan,
          planRefId: 'it-plan-permanent-failure',
          runId: 'run-it-permanent-failure',
          taskQueue: 'dvt-it-time-skipping-permanent-failure',
          dbtPluginRunner: {
            async execute(input) {
              throw ApplicationFailure.create({
                type: 'PermanentStepError',
                message: `PERMANENT_STEP_ERROR:${input.step.stepId}`,
                nonRetryable: true,
              });
            },
          },
        });

      try {
        await adapter.startRun(planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((event) => event.eventType === 'RunFailed'),
          { timeoutMs: 30_000 }
        );

        const events = await store.listRunEvents(RunId.of(ctx.runId));
        expectPermanentFailureLifecycle({
          events,
          projector,
          runId: ctx.runId,
        });
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );
});
