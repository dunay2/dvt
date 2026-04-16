import { act } from 'react';
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
        summary: 'Plan requires exactly 3 nodes: source, sql_transform, and sink.',
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

  it('surfaces stale draft state when saveGraphDraft returns a CAS conflict', async () => {
    harness.state.services.workspaceService.saveGraphDraft = async () => ({
      outcome: 'conflict',
      current: {
        revision: 'rev-conflict',
        savedAt: '2026-04-16T00:00:00Z',
        draft: {
          nodeIds: ['node_1', 'node_2'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 100, y: 0 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        },
      },
    });

    await harness.renderProbe();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(true);
    expect(harness.getLatestResult()?.draftConflictRevision).toBe('rev-conflict');
  });

  it('does not overwrite the remote draft while reloading after a CAS conflict', async () => {
    let saveAttempts = 0;
    harness.state.services.workspaceService.saveGraphDraft = async () => {
      saveAttempts += 1;
      return {
        outcome: 'conflict',
        current: {
          revision: 'rev-remote',
          savedAt: '2026-04-16T00:00:00Z',
          draft: {
            nodeIds: ['node_2'],
            nodePositions: {
              node_2: { x: 220, y: 120 },
            },
            edges: [],
          },
        },
      };
    };

    await harness.renderProbe();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(true);
    harness.state.graphDraftRecord = {
      revision: 'rev-remote',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: ['node_2'],
        nodePositions: {
          node_2: { x: 220, y: 120 },
        },
        edges: [],
      },
    };

    await act(async () => {
      harness.getLatestResult()?.reloadLatestDraft();
    });
    await harness.renderProbe();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(saveAttempts).toBe(1);
    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(false);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_2']);
  });

  it('continues autosaving local edits after hydrating an existing remote draft', async () => {
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      },
    };
    harness.state.services.workspaceService.saveGraphDraft = vi.fn(async ({ draft }) => ({
      outcome: 'saved' as const,
      record: {
        revision: 'rev-2',
        savedAt: '2026-04-16T00:00:01Z',
        draft,
      },
    }));

    await harness.renderProbe();

    const workspaceLayoutKey = 'tenant-a::project-a::dev';
    const storeState = harness.state.store as unknown as {
      canvasLayouts: Record<
        string,
        { nodePositions?: Record<string, { x: number; y: number }>; viewport?: unknown }
      >;
    };
    storeState.canvasLayouts = {
      ...storeState.canvasLayouts,
      [workspaceLayoutKey]: {
        nodePositions: {
          node_1: { x: 48, y: 24 },
          node_2: { x: 148, y: 24 },
        },
      },
    };

    await harness.renderProbe();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(harness.state.services.workspaceService.saveGraphDraft).toHaveBeenCalled();
    expect(harness.state.queryClient.setQueryData).toHaveBeenCalledWith(
      ['workspace', 'graph-draft', workspaceLayoutKey],
      expect.objectContaining({
        revision: 'rev-2',
      })
    );
  });

  it('does not snap node positions back to the hydrated remote draft after a local move', async () => {
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: ['node_2'],
        nodePositions: {
          node_2: { x: 220, y: 120 },
        },
        edges: [],
      },
    };

    await harness.renderProbe();

    const workspaceLayoutKey = 'tenant-a::project-a::dev';
    const storeState = harness.state.store as unknown as {
      canvasLayouts: Record<
        string,
        { nodePositions?: Record<string, { x: number; y: number }>; viewport?: unknown }
      >;
    };
    storeState.canvasLayouts = {
      ...storeState.canvasLayouts,
      [workspaceLayoutKey]: {
        nodePositions: {
          node_2: { x: 420, y: 260 },
        },
      },
    };

    await harness.renderProbe();

    expect(
      harness.getLatestResult()?.nodesWithImpact.find((node) => node.id === 'node_2')?.position
    ).toEqual({ x: 420, y: 260 });
  });
});
