import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';

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
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(harness.state.services.workspaceService.saveGraphDraft).not.toHaveBeenCalled();
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

  it('does not autosave the draft when graph edits are gated', async () => {
    const userPermissions = harness.state.store.userPermissions as {
      canPlan: boolean;
      canRun: boolean;
      canEditEdges: boolean;
      canManagePlugins: boolean;
      canManageRBAC: boolean;
    };
    harness.state.store.userPermissions = {
      ...userPermissions,
      canEditEdges: false,
    };

    await harness.renderProbe();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(harness.state.services.workspaceService.saveGraphDraft).not.toHaveBeenCalled();
  });

  it('renders an intentionally empty persisted draft without falling back to the snapshot graph', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.graphDraftRecord = {
      revision: 'rev-empty',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: [],
        nodePositions: {},
        edges: [],
      },
    };

    await harness.renderProbe();
    await act(async () => {
      await Promise.resolve();
    });

    expect(harness.getLatestResult()?.nodesWithImpact).toEqual([]);
    expect(harness.getLatestResult()?.edges).toEqual([]);
  });
});
