/**
 * @ownedConcern Service-backed concurrency bounds, refill and continuation replay.
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @decision Measure real activity overlap and replay every supported continuation history.
 * @consequence Service-backed evidence complements focused admission tests without a parallel scheduler.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';

import {
  INTEGRATION_TEST_TIMEOUT,
  waitForCondition,
} from '../../integration.time-skipping.shared.js';

import { usePlanConcurrencyHarness } from './planConcurrencySupport.js';

export function registerPlanConcurrencyCases(): void {
  describe('plan concurrency with real Temporal', () => {
    const setup = usePlanConcurrencyHarness();

    it.each([1, 2, undefined])(
      'bounds actual activity admission at K=%s and replays',
      async (limit) => {
        const h = await setup({ id: `concurrency-${limit ?? 'unbounded'}`, limit });
        const { ref, handle, executionId } = await h.start();
        const admitted = ['a', 'b', 'c'].slice(0, limit ?? 3);
        await h.waitForStep(admitted.at(-1)!);
        const history = await handle.fetchHistory();
        expect(
          history.events?.filter(
            (event) =>
              event.activityTaskScheduledEventAttributes?.activityType?.name === 'executeStep'
          )
        ).toHaveLength(admitted.length);
        expect(
          (await h.events())
            .filter(({ eventType }) => eventType === 'StepStarted')
            .map(({ stepId }) => stepId)
        ).toEqual(admitted);
        // At K=2, b releases a slot while a remains blocked: c must be admitted without a batch barrier.
        const finishOrder = limit === 2 ? ['b', 'c', 'a'] : ['a', 'b', 'c'];
        for (const stepId of finishOrder) {
          await h.waitForStep(stepId);
          h.release(stepId);
        }
        await expect(handle.result()).resolves.toMatchObject({ status: 'COMPLETED' });
        expect(h.maximum).toBe(limit ?? 3);
        expect(h.executed).toEqual(['a', 'b', 'c', 'downstream']);
        expect(
          (await h.events())
            .filter(({ eventType }) => eventType === 'StepCompleted')
            .map(({ stepId }) => stepId)
        ).toEqual(['a', 'b', 'c', 'downstream']);
        expect(await h.replay(ref.workflowId, executionId)).toBe(1);
        expect(h.executed).toHaveLength(4);
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      'keeps the logical slot through a technical activity retry',
      async () => {
        const h = await setup({ id: 'concurrency-retry', limit: 2, retryStepId: 'a' });
        const { ref, handle, executionId } = await h.start();
        await h.waitForStep('b');
        h.release('a');
        await waitForCondition(
          async () => h.executed.filter((id) => id === 'a').length,
          (attempts) => attempts === 2,
          { timeoutMs: 30_000 }
        );
        expect(
          (await h.events())
            .filter(({ eventType }) => eventType === 'StepStarted')
            .map(({ stepId }) => stepId)
        ).toEqual(['a', 'b']);
        h.release('a');
        await h.waitForStep('c');
        h.release('c');
        h.release('b');
        await expect(handle.result()).resolves.toMatchObject({ status: 'COMPLETED' });
        expect(h.maximum).toBe(2);
        expect(h.executed).toEqual(['a', 'b', 'a', 'c', 'downstream']);
        expect(await h.replay(ref.workflowId, executionId)).toBe(1);
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      're-resolves K across continuation with no duplicated or abandoned work',
      async () => {
        const first = ['a', 'b', 'c'];
        const second = ['d', 'e', 'f'];
        const h = await setup({
          id: 'concurrency-continuation',
          limit: 2,
          rollover: 1,
          steps: [
            ...first.map((stepId) => ({ stepId, kind: 'DBT_MODEL', dependsOn: [] })),
            ...second.map((stepId) => ({ stepId, kind: 'DBT_MODEL', dependsOn: first })),
          ],
        });
        const { ref, handle, executionId } = await h.start();
        for (const layer of [first, second]) {
          await h.waitForStep(layer[1]!);
          for (const stepId of [layer[1]!, layer[2]!, layer[0]!]) {
            await h.waitForStep(stepId);
            h.release(stepId);
          }
        }
        await expect(handle.result()).resolves.toMatchObject({
          status: 'COMPLETED',
          continuedAsNewCount: 1,
        });
        expect(h.maximum).toBe(2);
        expect(h.executed).toEqual([...first, ...second]);
        expect(await h.replay(ref.workflowId, executionId)).toBe(2);
        expect(h.executed).toHaveLength(6);
      },
      INTEGRATION_TEST_TIMEOUT
    );
  });
}
