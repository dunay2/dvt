import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController core', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;

  beforeEach(async () => {
    harness = setupCanvasControllerHarness();
    await harness.renderProbe();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('maps workspace graph into canonical explorer state and injects overlay decorations', () => {
    const result = harness.getLatestResult();
    expect(result?.explorerNodes).toEqual(harness.state.canonicalNodes);
    expect(result?.edges).toEqual([{ id: 'edge_1', source: 'node_1', target: 'node_2' }]);
    expect(result?.nodesWithImpact).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'node_1',
          data: expect.objectContaining({ overlayDecoration: { borderColor: '#ef4444' } }),
        }),
      ])
    );
    expect(result?.impactOverlayEnabled).toBe(true);
    expect(harness.mocks.buildNodeDecorations).toHaveBeenCalledWith(
      harness.state.canonicalNodes,
      [{ id: 'impact' }],
      null,
      { overlay: 'ctx' }
    );
  });

  it('derives inspector node and forwards graph and execution hook results', () => {
    const result = harness.getLatestResult();
    expect(result?.inspectorNode).toEqual(harness.state.canonicalNodes[0]);
    expect(result?.currentPlan).toEqual(harness.state.currentPlan);
    expect(result?.registeredPlugins).toEqual(new Set(['dbt', 'monitoring', 'cost']));
    expect(result?.handlePlan).toBe(harness.state.executionActionsResult.handlePlan);
    expect(result?.handleStartRun).toBe(harness.state.executionActionsResult.handleStartRun);
    expect(result?.handleDrop).toBe(harness.state.graphHandlersResult.handleDrop);
    expect(result?.confirmEdgeCreation).toBe(harness.state.graphHandlersResult.confirmEdgeCreation);
  });

  it('keeps hide or show panel commands idempotent', async () => {
    harness.state.store.explorerPanelVisible = true;
    harness.state.store.inspectorPanelVisible = false;
    await harness.renderProbe();

    harness.getLatestResult()?.hideExplorerPanel();
    harness.state.store.explorerPanelVisible = false;
    await harness.renderProbe();
    harness.getLatestResult()?.hideExplorerPanel();

    harness.getLatestResult()?.showInspectorPanel();
    harness.state.store.inspectorPanelVisible = true;
    await harness.renderProbe();
    harness.getLatestResult()?.showInspectorPanel();

    expect(harness.state.store.toggleExplorerPanel).toHaveBeenCalledTimes(1);
    expect(harness.state.store.toggleInspectorPanel).toHaveBeenCalledTimes(1);
  });
});
