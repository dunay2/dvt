import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController negative invariants', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;

  beforeEach(async () => {
    harness = setupCanvasControllerHarness();
    await harness.renderProbe();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('returns a safe state when graph query fails', async () => {
    harness.setGraphQueryError();
    await harness.renderProbe();

    const result = harness.getLatestResult();
    expect(result).not.toBeNull();
    expect(result?.explorerNodes).toEqual([]);
    expect(result?.edges).toEqual([]);
    expect(result?.nodesWithImpact).toEqual([]);
  });

  it('falls back from cost overlay to runtime when cost data disappears', async () => {
    await harness.toggleCostOverlay();
    await harness.renderProbe();
    expect(harness.getLatestResult()?.exclusiveOverlayMode).toBe('cost');

    harness.removeNodeCostsAndRefreshGraphSnapshot();
    await harness.renderProbe();

    expect(harness.getLatestResult()?.canUseCostOverlay).toBe(false);
    expect(harness.getLatestResult()?.exclusiveOverlayMode).toBe('runtime');
  });
});
