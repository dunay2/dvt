/**
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @decision Use the existing prepared harness, environment client and sole teardown owner.
 * @ownedConcern Prove logical-start duplicate rejection against an isolated Temporal server.
 * @version 1.0.0
 */
import { asNonBlankString } from '@dvt/contracts';
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TemporalAdapter } from '../src/TemporalAdapter.js';
import type { TemporalWorkerHost } from '../src/TemporalWorkerHost.js';

import {
  assertWorkflowArtifactPresentInCi,
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
