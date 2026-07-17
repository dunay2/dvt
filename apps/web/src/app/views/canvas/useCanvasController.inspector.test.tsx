import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController inspector contract', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;

  beforeEach(async () => {
    harness = await createHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    );
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('applies inspector-authored node details back into the authoritative route projection', async () => {
    await act(async () => {
      harness.getLatestResult()?.applyInspectorNodeDraft({
        name: 'orders_source_renamed',
        description: 'Edited through the route-owned inspector',
        tags: ['authoring', 'reviewed'],
      });
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.inspectorNode).toEqual(
      expect.objectContaining({
        id: 'node_1',
        name: 'orders_source_renamed',
        description: 'Edited through the route-owned inspector',
      })
    );
    expect(harness.getLatestResult()?.inspectorGraphNodes[0]).toEqual(
      expect.objectContaining({
        id: 'node_1',
        name: 'orders_source_renamed',
        description: 'Edited through the route-owned inspector',
      })
    );
  });

  it('keeps inspector panel commands idempotent', async () => {
    harness.state.store.inspectorPanelVisible = false;
    await harness.renderProbe();

    harness.getLatestResult()?.showInspectorPanel();
    harness.state.store.inspectorPanelVisible = true;
    await harness.renderProbe();
    harness.getLatestResult()?.showInspectorPanel();

    expect(harness.state.store.showInspectorPanel).toHaveBeenCalledTimes(1);
  });

  it('clears selection and inspector state when a node is removed through onNodesChange', async () => {
    harness.state.store.setExecutionSelectionIntent({
      mode: 'explicit',
      nodeIds: ['node_1', 'node_2'],
    });
    harness.state.store.inspectorNodeId = 'node_1';
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.onNodesChange([
        {
          id: 'node_1',
          type: 'remove',
        },
      ]);
    });
    await harness.renderProbe();

    expect(harness.state.store.setSelectedNodes).toHaveBeenCalledWith(['node_2']);
    expect(harness.state.store.setInspectorNode).toHaveBeenCalledWith(null);
    expect(harness.getLatestResult()?.inspectorNode).toBeNull();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_2']);
    expect(harness.getLatestResult()?.edges).toEqual([]);
  });
});
