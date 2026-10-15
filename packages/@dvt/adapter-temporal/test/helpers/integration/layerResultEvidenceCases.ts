/**
 * @ownedConcern Real Temporal recording and replay of mixed layer outcomes.
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0004: Event Sourcing Strategy
 * @decision Reuse the real Temporal harness with controlled step outcomes and verify canonical events before replay.
 * @version 1.0.0
 */
import type { MaterializationEvidence } from '@dvt/contracts';
import { Worker } from '@temporalio/worker';
import { afterEach, describe, expect, it } from 'vitest';

import type { TemporalWorkerHost } from '../../../src/TemporalWorkerHost.js';
import {
  createSingleRunDbtTimeSkippingHarness,
  INTEGRATION_TEST_TIMEOUT,
  RunId,
  WORKFLOW_PATH,
} from '../../integration.time-skipping.shared.js';
import { createExecutionPlan, iso, nb } from '../contractFixtures.js';

import { INTEGRATION_PLAN_OWNERSHIP } from './testPlans.js';

export function registerLayerResultEvidenceCases(): void {
  describe('confirmed layer evidence with real Temporal', () => {
    let harness: Awaited<ReturnType<typeof createSingleRunDbtTimeSkippingHarness>> | undefined;
    let worker: TemporalWorkerHost | undefined;

    afterEach(async () => {
      try {
        await worker?.shutdown();
      } finally {
        worker = undefined;
        await harness?.env.teardown();
        harness = undefined;
      }
    });

    it.each(['a', 'b', 'c'])(
      'retains siblings when %s fails and replays the complete history',
      async (failedStepId) => {
        const stepIds = ['a', 'b', 'c'];
        const plan = createExecutionPlan({
          ownership: INTEGRATION_PLAN_OWNERSHIP,
          steps: [
            ...stepIds.map((stepId) => ({ stepId, kind: 'DBT_MODEL', dependsOn: [] })),
            { stepId: 'downstream', kind: 'DBT_MODEL', dependsOn: stepIds },
          ],
        });
        harness = await createSingleRunDbtTimeSkippingHarness({
          plan,
          planRefId: 'mixed-layer',
          runId: `mixed-layer-${failedStepId}`,
          taskQueue: `mixed-layer-${failedStepId}`,
        });
        const executed: string[] = [];
        const evidenceByStep = new Map<string, MaterializationEvidence>();
        worker = await harness.startWorker({
          dbtPluginRunner: {
            async execute({ step }) {
              executed.push(step.stepId);
              if (step.stepId === failedStepId) {
                return {
                  stepId: step.stepId,
                  status: 'FAILED',
                  error: 'denied',
                  failureReason: 'DENIED',
                };
              }
              const evidence: MaterializationEvidence = {
                executor: 'dbt',
                environmentId: nb('test'),
                sinkTable: nb(`analytics.${step.stepId}`),
                rowsWritten: 3,
                startedAt: iso('2026-10-15T00:00:00.000Z'),
                completedAt: iso('2026-10-15T00:00:01.000Z'),
                durationMs: 1000,
              };
              evidenceByStep.set(step.stepId, evidence);
              return { stepId: step.stepId, status: 'COMPLETED', resultEvidence: evidence };
            },
          },
        });

        const runRef = await harness.adapter.startRun(harness.planRef, harness.ctx);
        const handle = harness.env.client.workflow.getHandle(runRef.workflowId);
        await expect(handle.result()).resolves.toMatchObject({ status: 'FAILED' });
        const events = await harness.store.listRunEvents(RunId.of(harness.ctx.runId));
        expect([...executed].sort()).toEqual(stepIds);
        expect(events.map(({ eventType, stepId }) => [eventType, stepId])).toEqual([
          ['RunStarted', undefined],
          ...stepIds.map((id) => ['StepStarted', id]),
          ...stepIds.map((id) => [id === failedStepId ? 'StepFailed' : 'StepCompleted', id]),
          ['RunFailed', undefined],
        ]);
        for (const [stepId, resultEvidence] of evidenceByStep) {
          expect(
            events.find((event) => event.eventType === 'StepCompleted' && event.stepId === stepId)
              ?.payload
          ).toEqual({ resultEvidence });
        }
        expect(events.at(-1)?.payload).not.toHaveProperty('resultEvidence');
        await Worker.runReplayHistory(
          { workflowsPath: WORKFLOW_PATH },
          await handle.fetchHistory(),
          runRef.workflowId
        );
        expect(executed).toHaveLength(3);
      },
      INTEGRATION_TEST_TIMEOUT
    );
  });
}
