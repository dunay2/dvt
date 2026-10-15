/**
 * @ownedConcern Per-plan layer admission limits, refill and deterministic result order.
 * @baseline ADR-0003: Execution Model
 * @decision Observe activity admission and ordered results through the existing execution port.
 * @consequence Tests exercise the canonical boundary rather than copying its implementation.
 * @version 1.0.0
 */
import { describe, expect, it, vi } from 'vitest';

import { createLayerConcurrencyHarness } from './helpers/layerConcurrencyHarness.js';

describe('layer concurrency admission', () => {
  it.each([1, 2])('admits only K=%i of three independent steps', async (limit) => {
    const h = createLayerConcurrencyHarness(limit);
    const run = h.run();
    await vi.waitFor(() => expect(h.executed.length).toBeGreaterThanOrEqual(limit));
    expect(h.maximum).toBe(limit);
    expect(h.admitted).toEqual(['a', 'b', 'c'].slice(0, limit));
    for (const stepId of ['a', 'b', 'c']) {
      await vi.waitFor(() => expect(h.executed).toContain(stepId));
      h.finish(stepId);
    }
    expect((await run).map(({ stepId }) => stepId)).toEqual(['a', 'b', 'c']);
    expect(h.maximum).toBe(limit);
    expect(h.executed).toEqual(['a', 'b', 'c']);
  });

  it('refills a free slot without waiting for a slower sibling and returns plan order', async () => {
    const h = createLayerConcurrencyHarness(2);
    const run = h.run();
    await vi.waitFor(() => expect(h.executed).toContain('b'));
    h.finish('b');
    await vi.waitFor(() => expect(h.executed).toContain('c'));
    h.finish('c');
    h.finish('a');
    expect((await run).map(({ stepId }) => stepId)).toEqual(['a', 'b', 'c']);
    expect(h.maximum).toBe(2);
  });

  it('preserves explicit unbounded execution without a runtime default', async () => {
    const h = createLayerConcurrencyHarness();
    const run = h.run();
    await vi.waitFor(() => expect(h.executed).toHaveLength(3));
    for (const id of ['c', 'b', 'a']) h.finish(id);
    expect((await run).map(({ stepId }) => stepId)).toEqual(['a', 'b', 'c']);
    expect(h.maximum).toBe(3);
  });
});
