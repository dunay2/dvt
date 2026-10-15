/**
 * @ownedConcern Queued admission under cancellation, pause and publication or step failure.
 * @baseline ADR-0003: Execution Model
 * @decision Keep control semantics explicit while proving queued steps are never prematurely started.
 * @consequence Tests exercise the canonical boundary rather than copying its implementation.
 * @version 1.0.0
 */
import { CancelledFailure } from '@temporalio/workflow';
import { describe, expect, it, vi } from 'vitest';

import { createLayerConcurrencyHarness } from './helpers/layerConcurrencyHarness.js';

describe('bounded admission controls', () => {
  it('does not start queued work after cooperative cancellation', async () => {
    const h = createLayerConcurrencyHarness(1);
    const run = h.run();
    await vi.waitFor(() => expect(h.executed).toEqual(['a']));
    h.state.cancelRequested = true;
    h.finish('a');
    expect((await run).map(({ stepId }) => stepId)).toEqual(['a']);
    expect(h.admitted).toEqual(['a']);
  });

  it('drains admitted work before propagating native cancellation', async () => {
    const h = createLayerConcurrencyHarness(2);
    const cancelled = new CancelledFailure('cancelled');
    let settled = false;
    const outcome = h.run().then(
      () => {
        settled = true;
        return undefined;
      },
      (error: unknown) => {
        settled = true;
        return error;
      }
    );
    await vi.waitFor(() => expect(h.executed).toEqual(['a', 'b']));
    h.reject('b', cancelled);
    // Waiting on the rejected activity's handler makes the stop-admission transition observable.
    await vi.waitFor(() => expect(h.admitted).toEqual(['a', 'b']));
    expect(settled).toBe(false);
    h.finish('a');
    expect(await outcome).toBe(cancelled);
    expect(h.admitted).toEqual(['a', 'b']);
  });

  it('drains active work and stops queued admission if StepStarted publication fails', async () => {
    const h = createLayerConcurrencyHarness(2);
    const denied = new Error('append denied');
    let settled = false;
    h.emit.mockImplementation(async ({ stepId }) => {
      if (stepId === 'b') throw denied;
    });
    const outcome = h.run().catch((error: unknown) => {
      settled = true;
      return error;
    });
    await vi.waitFor(() => expect(h.emit).toHaveBeenCalledTimes(2));
    expect(h.executed).toEqual(['a']);
    expect(settled).toBe(false);
    h.finish('a');
    expect(await outcome).toBe(denied);
    expect(h.emit).toHaveBeenCalledTimes(2);
  });

  it.each(['result', 'exception'] as const)(
    'keeps same-layer siblings after an ordinary step %s failure',
    async (mode) => {
      const h = createLayerConcurrencyHarness(1);
      const run = h.run();
      await vi.waitFor(() => expect(h.executed).toEqual(['a']));
      if (mode === 'result') h.finish('a', 'FAILED');
      else h.reject('a', new Error('DENIED: step rejected'));
      for (const id of ['b', 'c']) {
        await vi.waitFor(() => expect(h.executed).toContain(id));
        h.finish(id);
      }
      expect((await run).map(({ result }) => result.status)).toEqual([
        'FAILED',
        'COMPLETED',
        'COMPLETED',
      ]);
      expect(h.maximum).toBe(1);
    }
  );

  it('preserves pause at the layer boundary instead of stopping its remaining steps', async () => {
    const h = createLayerConcurrencyHarness(1);
    const run = h.run();
    await vi.waitFor(() => expect(h.executed).toEqual(['a']));
    h.state.paused = true;
    for (const id of ['a', 'b', 'c']) {
      await vi.waitFor(() => expect(h.executed).toContain(id));
      h.finish(id);
    }
    expect(await run).toHaveLength(3);
    expect(h.state.paused).toBe(true);
  });

  it('reserves the slot while publishing admission and never executes an unacknowledged start', async () => {
    const h = createLayerConcurrencyHarness(1);
    let acknowledge: (() => void) | undefined;
    h.emit.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          acknowledge = resolve;
        })
    );
    const run = h.run();
    expect(h.executed).toEqual([]);
    expect(h.emit).toHaveBeenCalledTimes(1);
    h.state.cancelRequested = true;
    acknowledge?.();
    await vi.waitFor(() => expect(h.executed).toEqual(['a']));
    h.finish('a');
    expect(await run).toHaveLength(1);
    expect(h.emit).toHaveBeenCalledTimes(1);
  });
});
