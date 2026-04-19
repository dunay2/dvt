import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    expect(result?.canvasAuthoringMode).toBe('transformation');
    expect(result?.transformationValidation).toEqual(
      expect.objectContaining({
        valid: false,
        summaryCode: 'requires_three_nodes',
      })
    );
    expect(result?.registeredPlugins).toEqual(new Set(['dbt', 'monitoring', 'cost']));
    expect(result?.handlePlan).toBe(harness.state.executionActionsResult.handlePlan);
    expect(result?.handleStartRun).toBe(harness.state.executionActionsResult.handleStartRun);
    expect(result?.canStartRun).toBe(false);
    expect(result?.planStatusSummary).toBe('Preview required before running.');
    expect(result?.handleDrop).toBe(harness.state.graphHandlersResult.handleDrop);
    expect(result?.confirmEdgeCreation).toBe(harness.state.graphHandlersResult.confirmEdgeCreation);
    expect(result?.importedNodeFocusIds).toEqual([]);
    expect(harness.mocks.useCanvasExecutionActions).toHaveBeenCalledWith(
      expect.objectContaining({
        plansService: harness.state.services.plansService,
        runsService: harness.state.services.runsService,
        sessionContext: harness.state.services.sessionContext,
        shellFeedback: harness.state.services.shellFeedback,
        onRunStarted: harness.state.navigationActionsResult.handleRunStarted,
      })
    );
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

    expect(harness.state.store.hideExplorerPanel).toHaveBeenCalledTimes(1);
    expect(harness.state.store.showInspectorPanel).toHaveBeenCalledTimes(1);
  });

  it('stops exposing node removal handlers when graph edits are gated', async () => {
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

    const latestBuildNodesCall = harness.mocks.buildNodesWithImpact.mock.calls.at(-1)?.[0] as
      | { handlers?: { onRemoveNode?: unknown } }
      | undefined;

    expect(latestBuildNodesCall?.handlers?.onRemoveNode).toBeUndefined();
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
  });

  it('invalidates the graph query and prepares focus when imported sources complete', async () => {
    const storeState = harness.state.store as Record<string, unknown>;
    storeState.inspectorPanelVisible = false;
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleSourceImportComplete({
        success: true,
        sourcesCreated: 2,
        tablesImported: 2,
        yamlFiles: ['models/sources/src_erp.yml'],
        importedNodeIds: ['src_erp_orders', 'src_erp_customers'],
        grouping: 'schema',
        options: {
          includeColumns: true,
          addTests: false,
          addFreshness: false,
        },
      });
    });

    expect(harness.state.store.setCurrentPlan).toHaveBeenCalledWith(null);
    expect(harness.state.store.setSelectedNodes).toHaveBeenCalledWith([
      'src_erp_orders',
      'src_erp_customers',
    ]);
    expect(harness.state.store.setInspectorNode).toHaveBeenCalledWith('src_erp_orders');
    expect(harness.state.store.showInspectorPanel).toHaveBeenCalledTimes(1);
    expect(harness.state.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workspace', 'graph', 'tenant-a::project-a::dev'],
    });
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([
      'src_erp_orders',
      'src_erp_customers',
    ]);

    await act(async () => {
      harness.getLatestResult()?.handleImportedNodeFocusComplete();
    });

    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([]);
  });

  it('clears selection and inspector state when a node is removed through onNodesChange', async () => {
    harness.state.store.selectedNodes = ['node_1', 'node_2'];
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
