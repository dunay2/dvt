/**
 * @ownedConcern Real workflow failure policy after canonical outcome publication rejection.
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0004: Event Sourcing Strategy
 * @decision Inject canonical write rejection at the existing test command port and replay the real workflow history.
 * @version 1.0.0
 */
import { ApplicationFailure } from '@temporalio/activity';
import { Worker } from '@temporalio/worker';
import { describe, expect, it, vi } from 'vitest';

import type { TemporalWorkerHost } from '../../../src/TemporalWorkerHost.js';
import {
  createSingleRunDbtTimeSkippingHarness,
  INTEGRATION_TEST_TIMEOUT,
  RunId,
  WORKFLOW_PATH,
} from '../../integration.time-skipping.shared.js';
import { createExecutionPlan } from '../contractFixtures.js';

import { INTEGRATION_PLAN_OWNERSHIP } from './testPlans.js';

export function registerLayerPublicationFailureCases(): void {
  describe('incomplete layer publication through real workflow catch', () => {
    it.each([
      { mode: 'permanent', nonRetryable: true, attempts: 1 },
      { mode: 'exhausted', nonRetryable: false, attempts: 3 },
    ])(
      'does not substitute RunFailed after $mode append rejection',
      async ({ mode, nonRetryable, attempts }) => {
        const stepIds = ['a', 'b', 'c'];
        const plan = createExecutionPlan({
          ownership: INTEGRATION_PLAN_OWNERSHIP,
          steps: [
            ...stepIds.map((stepId) => ({ stepId, kind: 'DBT_MODEL', dependsOn: [] })),
            { stepId: 'downstream', kind: 'DBT_MODEL', dependsOn: stepIds },
          ],
        });
        const harness = await createSingleRunDbtTimeSkippingHarness({
          plan,
          planRefId: 'publication-failure',
          runId: `publication-${mode}`,
          taskQueue: `publication-${mode}`,
        });
        const append = harness.store.appendAndEnqueueTx.bind(harness.store);
        let rejectedWrites = 0;
        const publication = vi
          .spyOn(harness.store, 'appendAndEnqueueTx')
          .mockImplementation(async (runId, events) => {
            if (
              events.some((event) => event.eventType === 'StepCompleted' && event.stepId === 'b')
            ) {
              rejectedWrites += 1;
              throw ApplicationFailure.create({
                message: 'WRITE_REJECTED',
                type: 'CanonicalWriteRejected',
                nonRetryable,
              });
            }
            return append(runId, events);
          });
        let worker: TemporalWorkerHost | undefined;
        try {
          const executed: string[] = [];
          worker = await harness.startWorker({
            dbtPluginRunner: {
              async execute({ step }) {
                executed.push(step.stepId);
                return step.stepId === 'c'
                  ? { stepId: step.stepId, status: 'FAILED', error: 'step failure' }
                  : { stepId: step.stepId, status: 'COMPLETED' };
              },
            },
          });
          const runRef = await harness.adapter.startRun(harness.planRef, harness.ctx);
          const handle = harness.env.client.workflow.getHandle(runRef.workflowId);
          await expect(handle.result()).rejects.toMatchObject({
            cause: { activityType: 'emitEvent', cause: { message: 'WRITE_REJECTED' } },
          });
          expect(rejectedWrites).toBe(attempts);
          expect([...executed].sort()).toEqual(stepIds);
          const events = await harness.store.listRunEvents(RunId.of(harness.ctx.runId));
          expect(events.map(({ eventType, stepId }) => [eventType, stepId])).toEqual([
            ['RunStarted', undefined],
            ...stepIds.map((id) => ['StepStarted', id]),
            ['StepCompleted', 'a'],
          ]);
          await Worker.runReplayHistory(
            { workflowsPath: WORKFLOW_PATH },
            await handle.fetchHistory(),
            runRef.workflowId
          );
          expect(rejectedWrites).toBe(attempts);
          expect(executed).toHaveLength(3);
        } finally {
          try {
            await worker?.shutdown();
          } finally {
            publication.mockRestore();
            await harness.env.teardown();
          }
        }
      },
      INTEGRATION_TEST_TIMEOUT
    );
  });
}
