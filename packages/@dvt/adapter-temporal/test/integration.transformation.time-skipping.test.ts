/**
 * @file packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0010: Run Event Envelope Split
 * @baseline ADR-0011: RunStarted Ownership
 * @decision Transformation-flow verification lives outside the Temporal baseline suite
 * @consequence Temporal baseline stays provider-agnostic while transformation semantics keep dedicated coverage
 */

import type { MaterializationEvidence, ResolvedRunContext } from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { describe, expect, it } from 'vitest';

import { DEFAULT_STEP_EXECUTORS } from '../src/activities/stepActivities.js';
import {
  loadTemporalAdapterConfig,
  TemporalAdapter,
  TemporalWorkerHost,
  toTemporalTaskQueue,
} from '../src/index.js';

import {
  materializationEvidenceExecutor,
  permanentErrorExecutor,
  withErrorExecutors,
} from './helpers/testExecutors.js';
import {
  INTEGRATION_TEST_TIMEOUT,
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
  mkPermanentFailurePlan,
  waitForCondition,
  withTransformationRuntimeBinding,
} from './integration.time-skipping.shared.js';

assertWorkflowArtifactPresentInCi();

describe('temporal integration (transformation runtime)', () => {
  /**
   * @verifies ADR-0010 Section 3.2 — Ordering via runSeq
   * @verifies ADR-0010 Section 3.6 — Atomic append
   * @verifies ADR-0011 — RunStarted ownership
   */
  it(
    'golden path: linear 3-step transformation plan emits result evidence and completes deterministically',
    async () => {
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const projector = new TestProjector();
      const resultEvidence: MaterializationEvidence = {
        executor: 'dbt',
        environmentId: 't-it',
        sinkTable: 'analytics.orders_daily',
        rowsWritten: 42,
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:00:05.000Z',
        durationMs: 5000,
      };
      const plan = withTransformationRuntimeBinding(mkLinearThreeStepPlan(), 'dbt');
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan-linear-3', planBytes);
      const ctx: ResolvedRunContext = {
        ...createRunContext(RunId.of('run-it-linear-3')),
        tenantId: 't-it',
      };

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-linear-3',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
        stepExecutors: [
          materializationEvidenceExecutor('s-3', resultEvidence),
          ...DEFAULT_STEP_EXECUTORS,
        ],
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
          events.find((event) => event.eventType === 'StepCompleted' && event.stepId === 's-3')
            ?.payload
        ).toMatchObject({
          resultEvidence,
        });
        expect(events.find((event) => event.eventType === 'RunCompleted')?.payload).toMatchObject({
          executor: 'dbt',
          resultEvidence,
        });

        const projected = projector.rebuild(ctx.runId, events);
        expect(projected.status).toBe('COMPLETED');
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
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const projector = new TestProjector();
      const plan = withTransformationRuntimeBinding(mkPermanentFailurePlan(), 'dbt');
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan-permanent-failure', planBytes);
      const ctx: ResolvedRunContext = {
        ...createRunContext(RunId.of('run-it-permanent-failure')),
        tenantId: 't-it',
      };

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-permanent-failure',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
        stepExecutors: withErrorExecutors(permanentErrorExecutor('s-fail')),
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
          (events) => events.some((event) => event.eventType === 'RunFailed'),
          { timeoutMs: 30_000 }
        );

        const events = await store.listRunEvents(RunId.of(ctx.runId));
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

        const projected = projector.rebuild(ctx.runId, events);
        expect(projected.status).toBe('FAILED');
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );
});
