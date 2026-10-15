/**
 * @ownedConcern Real Temporal cancellation, failure and pause with queued layer work.
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @decision Exercise canonical signals and native cancellation with undispatched work remaining.
 * @consequence Service-backed evidence complements focused admission tests without a parallel scheduler.
 * @version 1.0.0
 * @baseline ADR-0007: Run Cancellation
 */
import { ApplicationFailure } from '@temporalio/activity';
import { describe, expect, it, vi } from 'vitest';

import type { RuntimeWorkflowState } from '../../../src/workflows/runPlanWorkflow.types.js';
import {
  INTEGRATION_TEST_TIMEOUT,
  waitForCondition,
} from '../../integration.time-skipping.shared.js';
import { nb } from '../contractFixtures.js';

import { usePlanConcurrencyHarness } from './planConcurrencySupport.js';

export function registerPlanConcurrencyControlCases(): void {
  describe('bounded layer controls with real Temporal', () => {
    const setup = usePlanConcurrencyHarness();

    it(
      'propagates failed admission publication only after active work drains',
      async () => {
        const h = await setup({ id: 'concurrency-admission-failure', limit: 2 });
        const append = h.store.appendAndEnqueueTx.bind(h.store);
        let rejected = false;
        const publication = vi
          .spyOn(h.store, 'appendAndEnqueueTx')
          .mockImplementation(async (runId, events) => {
            if (events.some((event) => event.eventType === 'StepStarted' && event.stepId === 'b')) {
              rejected = true;
              throw ApplicationFailure.create({
                message: 'Admission append denied',
                type: 'CanonicalWriteRejected',
                nonRetryable: true,
              });
            }
            return append(runId, events);
          });
        try {
          const { ref, handle, executionId } = await h.start();
          await h.waitForStep('a');
          await waitForCondition(async () => rejected, Boolean, { timeoutMs: 30_000 });
          expect(h.active).toBe(1);
          h.release('a');
          await expect(handle.result()).rejects.toMatchObject({
            cause: { activityType: 'emitEvent' },
          });
          expect(h.active).toBe(0);
          expect(h.executed).toEqual(['a']);
          expect((await h.events()).map(({ eventType }) => eventType)).toEqual([
            'RunStarted',
            'StepStarted',
          ]);
          expect(await h.replay(ref.workflowId, executionId)).toBe(1);
        } finally {
          publication.mockRestore();
        }
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      'preserves gateway facts and downstream skip after a bounded layer',
      async () => {
        const h = await setup({
          id: 'concurrency-gateway',
          limit: 2,
          steps: [
            ...['a', 'b', 'c'].map((stepId) => ({ stepId, kind: 'DBT_MODEL', dependsOn: [] })),
            {
              stepId: 'gate',
              kind: 'GATEWAY',
              type: 'gateway',
              dependsOn: ['a'],
              gateway: { dslVersion: '1.0', expression: "status='FAILED'" },
            },
            { stepId: 'downstream', kind: 'DBT_MODEL', dependsOn: ['gate'] },
          ],
        });
        const { ref, handle, executionId } = await h.start();
        await h.waitForStep('b');
        for (const id of ['a', 'b', 'c']) {
          await h.waitForStep(id);
          h.release(id);
        }
        await expect(handle.result()).resolves.toMatchObject({ status: 'COMPLETED' });
        expect(h.executed).toEqual(['a', 'b', 'c']);
        expect(await h.events()).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              eventType: 'StepCompleted',
              stepId: 'gate',
              payload: { gatewayDecision: false },
            }),
            expect.objectContaining({ eventType: 'StepSkipped', stepId: 'downstream' }),
          ])
        );
        expect(await h.replay(ref.workflowId, executionId)).toBe(1);
      },
      INTEGRATION_TEST_TIMEOUT
    );
    it.each(['signal', 'native'] as const)(
      'stops queued admission on %s cancellation',
      async (mode) => {
        const h = await setup({ id: `concurrency-cancel-${mode}`, limit: 2 });
        const { ref, handle, executionId } = await h.start();
        await h.waitForStep('b');
        if (mode === 'signal') {
          await h.adapter.signal(ref, { signalId: nb('stop'), type: 'CANCEL' });
          await waitForCondition(
            () => handle.query<RuntimeWorkflowState>('runtimeState'),
            (state) => state.cancelRequested,
            { timeoutMs: 30_000 }
          );
          h.release('b');
          h.release('a');
          await expect(handle.result()).resolves.toMatchObject({ status: 'CANCELLED' });
        } else {
          await h.adapter.cancelRun(ref);
          await expect(handle.result()).rejects.toMatchObject({
            cause: { name: 'CancelledFailure' },
          });
        }
        expect(h.active).toBe(0);
        expect(h.executed).toEqual(['a', 'b']);
        const events = await h.events();
        expect(
          events.filter(({ eventType }) => eventType === 'StepStarted').map(({ stepId }) => stepId)
        ).toEqual(['a', 'b']);
        expect(events.filter(({ eventType }) => eventType === 'RunCancelled')).toHaveLength(1);
        expect(await h.replay(ref.workflowId, executionId)).toBe(1);
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      'retains confirmed same-layer siblings after failure and blocks the next layer',
      async () => {
        const h = await setup({ id: 'concurrency-failure', limit: 1, failedStepId: 'a' });
        const { ref, handle, executionId } = await h.start();
        for (const stepId of ['a', 'b', 'c']) {
          await h.waitForStep(stepId);
          h.release(stepId);
        }
        await expect(handle.result()).resolves.toMatchObject({ status: 'FAILED' });
        expect(h.maximum).toBe(1);
        expect(h.executed).toEqual(['a', 'b', 'c']);
        expect(
          (await h.events()).slice(-4).map(({ eventType, stepId }) => [eventType, stepId])
        ).toEqual([
          ['StepFailed', 'a'],
          ['StepCompleted', 'b'],
          ['StepCompleted', 'c'],
          ['RunFailed', undefined],
        ]);
        expect(await h.replay(ref.workflowId, executionId)).toBe(1);
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      'realizes pause only after the bounded layer has drained',
      async () => {
        const h = await setup({ id: 'concurrency-pause', limit: 1 });
        const { ref, handle, executionId } = await h.start();
        await h.waitForStep('a');
        await h.adapter.signal(ref, { signalId: nb('pause'), type: 'PAUSE' });
        await waitForCondition(
          () => handle.query<RuntimeWorkflowState>('runtimeState'),
          (state) => state.paused,
          { timeoutMs: 30_000 }
        );
        for (const stepId of ['a', 'b', 'c']) {
          await h.waitForStep(stepId);
          h.release(stepId);
        }
        await waitForCondition(
          h.events,
          (events) => events.some(({ eventType }) => eventType === 'RunPaused'),
          { timeoutMs: 30_000 }
        );
        expect(h.active).toBe(0);
        expect(h.executed).toEqual(['a', 'b', 'c']);
        await h.adapter.signal(ref, { signalId: nb('resume'), type: 'RESUME' });
        await expect(handle.result()).resolves.toMatchObject({ status: 'COMPLETED' });
        expect(h.executed).toEqual(['a', 'b', 'c', 'downstream']);
        expect(await h.replay(ref.workflowId, executionId)).toBe(1);
      },
      INTEGRATION_TEST_TIMEOUT
    );
  });
}
