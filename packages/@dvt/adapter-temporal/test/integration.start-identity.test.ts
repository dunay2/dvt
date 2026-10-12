/**
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @decision Use the existing prepared harness, environment client and sole teardown owner.
 * @ownedConcern Prove logical-start duplicate rejection against an isolated Temporal server.
 * @version 1.0.0
 */
import { asNonBlankString } from '@dvt/contracts';
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadTemporalAdapterConfig } from '../src/config.js';
import { TemporalAdapter } from '../src/TemporalAdapter.js';
import type { TemporalWorkerHost } from '../src/TemporalWorkerHost.js';

import {
  assertWorkflowArtifactPresentInCi,
  createPlanRef,
  createRunContext,
  createSingleRunDbtTimeSkippingHarness,
  INTEGRATION_TEST_TIMEOUT,
  mkLinearPlan,
  RunId,
  type SingleRunDbtTimeSkippingHarness,
} from './integration.time-skipping.shared.js';

assertWorkflowArtifactPresentInCi();

describe('Temporal logical-start identity (service-backed)', () => {
  let harness: SingleRunDbtTimeSkippingHarness | undefined;
  let worker: TemporalWorkerHost | undefined;

  beforeAll(async () => {
    harness = await createSingleRunDbtTimeSkippingHarness({
      plan: mkLinearPlan(1),
      planRefId: 'start-identity-plan',
      runId: 'start-identity-parent',
      taskQueue: 'start-identity',
    });
  }, INTEGRATION_TEST_TIMEOUT);

  afterAll(async () => {
    try {
      await worker?.shutdown();
    } finally {
      await harness?.env.teardown();
    }
  }, INTEGRATION_TEST_TIMEOUT);

  it(
    'preserves the running and completed winner, but allows a distinct child identity',
    async () => {
      if (!harness) throw new Error('Temporal identity harness not initialized');
      const { adapter, ctx, env, planRef, store } = harness;
      const original = await adapter.startRun(planRef, ctx);
      const handle = env.client.workflow.getHandle(original.workflowId);
      const before = await handle.describe();
      expect(before.status.name).toBe('RUNNING');

      // No worker yet: the first execution cannot complete before this assertion.
      await expect(adapter.startRun(planRef, ctx)).rejects.toBeInstanceOf(
        WorkflowExecutionAlreadyStartedError
      );
      expect((await handle.describe()).runId).toBe(before.runId);

      worker = await harness.startWorker();
      await handle.result();
      expect((await handle.describe()).status.name).toBe('COMPLETED');
      const completedHistory = await handle.fetchHistory();
      const completedEvents = await store.listRunEvents(RunId.of(ctx.runId));

      await expect(adapter.startRun(planRef, ctx)).rejects.toBeInstanceOf(
        WorkflowExecutionAlreadyStartedError
      );
      expect((await handle.describe()).runId).toBe(before.runId);
      expect(await handle.fetchHistory()).toEqual(completedHistory);
      expect(await store.listRunEvents(RunId.of(ctx.runId))).toEqual(completedEvents);

      const childContext = {
        ...ctx,
        runId: asNonBlankString('start-identity-child'),
        parentRunId: ctx.runId,
        originRunId: ctx.runId,
        logicalAttemptId: 2,
      };
      // This child proves dispatch admission, not recovery execution. An unpolled
      // queue keeps termination deterministic without racing the parent's worker.
      const childAdapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: {
          ...harness.temporalConfig,
          connection: { ...harness.temporalConfig.connection, taskQueue: 'start-identity-child' },
        },
      });
      const child = await childAdapter.startRun(planRef, childContext);
      expect(child.workflowId).not.toBe(original.workflowId);
      const childHandle = env.client.workflow.getHandle(child.workflowId);
      await childHandle.terminate('Isolated start-identity test cleanup');
      const terminated = await childHandle.describe();
      expect(terminated.status.name).toBe('TERMINATED');
      await expect(childAdapter.startRun(planRef, childContext)).rejects.toBeInstanceOf(
        WorkflowExecutionAlreadyStartedError
      );
      expect((await childHandle.describe()).runId).toBe(terminated.runId);
    },
    INTEGRATION_TEST_TIMEOUT
  );
});

describe('Temporal retained-identity boundary (full local server)', () => {
  let env: TestWorkflowEnvironment | undefined;

  beforeAll(async () => {
    // DeleteWorkflowExecution is intentionally not emulated by the time-skipping
    // service. This evidence requires the real local Temporal server instead.
    env = await TestWorkflowEnvironment.createLocal();
  }, INTEGRATION_TEST_TIMEOUT);

  afterAll(async () => {
    await env?.teardown();
  }, INTEGRATION_TEST_TIMEOUT);

  it(
    'observes cancellation acknowledgement as active until the exact execution terminates',
    async () => {
      if (!env) throw new Error('Temporal local environment not initialized');
      const config = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'unpolled-cancel-observation',
        TEMPORAL_IDENTITY: 'cancel-observation-test',
      });
      const adapter = new TemporalAdapter({ workflowClient: env.client.workflow, config });
      const ctx = createRunContext(RunId.of('cancel-observation-only'));
      const planRef = createPlanRef(
        'cancel-observation-plan',
        Buffer.from(JSON.stringify(mkLinearPlan(1)))
      );
      const runRef = await adapter.startRun(planRef, ctx);
      const active = await adapter.observeStartRun(ctx.runId, ctx.tenantId);
      if (active.kind !== 'active') throw new Error('Expected unpolled workflow to be active');
      await adapter.cancelRun(runRef, active.target.executionId);
      expect(await adapter.observeStartRun(ctx.runId, ctx.tenantId)).toEqual(active);
      await env.client.workflow
        .getHandle(runRef.workflowId, active.target.executionId)
        .terminate('Isolated cancellation-observation cleanup');
      expect(await adapter.observeStartRun(ctx.runId, ctx.tenantId)).toEqual({
        kind: 'terminal',
        target: active.target,
        disposition: 'terminated',
      });
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'does not claim durable deduplication after provider history is removed',
    async () => {
      if (!env) throw new Error('Temporal local environment not initialized');
      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'unpolled-dedup-boundary',
        TEMPORAL_IDENTITY: 'dedup-boundary-test',
      });
      const ctx = createRunContext(RunId.of('dedup-boundary-only'));
      const planRef = createPlanRef(
        'dedup-boundary-plan',
        Buffer.from(JSON.stringify(mkLinearPlan(1)))
      );
      const isolatedAdapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: {
          ...temporalConfig,
          connection: { ...temporalConfig.connection, taskQueue: 'unpolled-dedup-boundary' },
        },
      });
      const isolatedContext = { ...ctx, runId: asNonBlankString('dedup-boundary-only') };
      const first = await isolatedAdapter.startRun(planRef, isolatedContext);
      const firstHandle = env.client.workflow.getHandle(first.workflowId);
      const firstExecution = await firstHandle.describe();
      await firstHandle.terminate('Isolated deduplication-boundary test');

      await expect(isolatedAdapter.startRun(planRef, isolatedContext)).rejects.toBeInstanceOf(
        WorkflowExecutionAlreadyStartedError
      );

      // Only this test's execution in its ephemeral server is removed. A retained
      // closed execution is a prerequisite of REJECT_DUPLICATE, not a tombstone.
      await env.client.workflowService.deleteWorkflowExecution({
        namespace: temporalConfig.connection.namespace,
        workflowExecution: { workflowId: first.workflowId, runId: firstExecution.runId },
      });
      await expect
        .poll(
          async () =>
            (await isolatedAdapter.observeStartRun(isolatedContext.runId, ctx.tenantId)).kind,
          { timeout: 60_000, interval: 500 }
        )
        .toBe('missing_at_observation');

      const second = await isolatedAdapter.startRun(planRef, isolatedContext);
      const secondHandle = env.client.workflow.getHandle(second.workflowId);
      const secondExecution = await secondHandle.describe();
      expect(second.workflowId).toBe(first.workflowId);
      expect(secondExecution.runId).not.toBe(firstExecution.runId);
      await secondHandle.terminate('Isolated deduplication-boundary test cleanup');
    },
    INTEGRATION_TEST_TIMEOUT
  );
});
