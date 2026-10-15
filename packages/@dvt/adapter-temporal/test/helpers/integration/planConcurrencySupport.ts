/**
 * @ownedConcern Controlled real activities and lifecycle cleanup for concurrency integration tests.
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @decision Reuse the real Temporal harness with controlled activities and one cleanup owner.
 * @consequence Service-backed evidence complements focused admission tests without a parallel scheduler.
 * @version 1.0.0
 */
import type { ExecutionStep } from '@dvt/contracts';
import { ApplicationFailure, Context } from '@temporalio/activity';
import { Worker } from '@temporalio/worker';
import { afterEach } from 'vitest';

import type { TemporalWorkerHost } from '../../../src/TemporalWorkerHost.js';
import {
  createSingleRunDbtTimeSkippingHarness,
  RunId,
  WORKFLOW_PATH,
  waitForCondition,
} from '../../integration.time-skipping.shared.js';
import { createExecutionPlan } from '../contractFixtures.js';

import { INTEGRATION_PLAN_OWNERSHIP } from './testPlans.js';

export function usePlanConcurrencyHarness() {
  let harness: Awaited<ReturnType<typeof createSingleRunDbtTimeSkippingHarness>> | undefined;
  let worker: TemporalWorkerHost | undefined;
  let releaseAll: (() => void) | undefined;
  afterEach(async () => {
    releaseAll?.();
    try {
      await worker?.shutdown();
    } finally {
      worker = undefined;
      await harness?.env.teardown();
      harness = undefined;
      releaseAll = undefined;
    }
  });

  return async (options: {
    id: string;
    limit?: number;
    steps?: readonly ExecutionStep[];
    rollover?: number;
    failedStepId?: string;
    retryStepId?: string;
  }) => {
    const independent = ['a', 'b', 'c'];
    const steps = options.steps ?? [
      ...independent.map((stepId) => ({ stepId, kind: 'DBT_MODEL', dependsOn: [] })),
      { stepId: 'downstream', kind: 'DBT_MODEL', dependsOn: independent },
    ];
    harness = await createSingleRunDbtTimeSkippingHarness({
      plan: createExecutionPlan({
        ownership: INTEGRATION_PLAN_OWNERSHIP,
        steps: steps.map((step) => ({
          ...step,
          stepTypeConfig:
            options.limit === undefined ? {} : { concurrency: { maxInFlight: options.limit } },
        })),
      }),
      planRefId: options.id,
      runId: options.id,
      taskQueue: options.id,
      temporalEnv: { TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: String(options.rollover ?? 100) },
    });
    const releases = new Map<string, () => void>();
    const executed: string[] = [];
    let active = 0;
    let maximum = 0;
    let draining = false;
    releaseAll = () => {
      draining = true;
      for (const release of releases.values()) release();
    };
    worker = await harness.startWorker({
      dbtPluginRunner: {
        async execute({ step }) {
          executed.push(step.stepId);
          active += 1;
          maximum = Math.max(maximum, active);
          try {
            if (!draining && step.stepId !== 'downstream') {
              const ctx = Context.current();
              const heartbeat = setInterval(() => ctx.heartbeat(), 100);
              try {
                await new Promise<void>((resolve, reject) => {
                  const abort = (): void => reject(ctx.cancellationSignal.reason);
                  const release = (): void => {
                    ctx.cancellationSignal.removeEventListener('abort', abort);
                    resolve();
                  };
                  releases.set(step.stepId, release);
                  ctx.cancellationSignal.addEventListener('abort', abort, { once: true });
                  if (ctx.cancellationSignal.aborted) abort();
                });
              } finally {
                clearInterval(heartbeat);
              }
            }
            if (step.stepId === options.retryStepId && Context.current().info.attempt === 1) {
              throw ApplicationFailure.create({
                message: 'Retry controlled activity',
                type: 'RetryableStepError',
              });
            }
            return {
              stepId: step.stepId,
              status: step.stepId === options.failedStepId ? 'FAILED' : 'COMPLETED',
            };
          } finally {
            active -= 1;
          }
        },
      },
    });
    const current = harness;
    return {
      ...current,
      executed,
      async start() {
        const ref = await current.adapter.startRun(current.planRef, current.ctx);
        const handle = current.env.client.workflow.getHandle(ref.workflowId);
        return { ref, handle, executionId: (await handle.describe()).runId };
      },
      get maximum() {
        return maximum;
      },
      get active() {
        return active;
      },
      release(stepId: string) {
        const release = releases.get(stepId);
        if (release === undefined) throw new Error(`Activity not running: ${stepId}`);
        release();
      },
      waitForStep(stepId: string) {
        return waitForCondition(async () => releases.has(stepId), Boolean, { timeoutMs: 30_000 });
      },
      events: () => current.store.listRunEvents(RunId.of(current.ctx.runId)),
      async replay(workflowId: string, firstRunId: string) {
        let runId: string | undefined = firstRunId;
        let histories = 0;
        while (runId !== undefined) {
          const history = await current.env.client.workflow
            .getHandle(workflowId, runId)
            .fetchHistory();
          await Worker.runReplayHistory({ workflowsPath: WORKFLOW_PATH }, history, workflowId);
          histories += 1;
          runId =
            history.events?.find((event) => event.workflowExecutionContinuedAsNewEventAttributes)
              ?.workflowExecutionContinuedAsNewEventAttributes?.newExecutionRunId ?? undefined;
        }
        return histories;
      },
    };
  };
}
