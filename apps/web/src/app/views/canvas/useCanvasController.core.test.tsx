import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  SaveWorkspaceGraphDraftResult,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
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

  it('scopes execution and prunes hidden selection when bootstrapping from a persisted draft subset', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-17T00:00:00Z',
      draft: {
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      },
    };
    harness.state.store.selectedNodes = ['node_2'];
    harness.state.store.inspectorNodeId = 'node_2';

    await harness.renderProbe();
    await harness.renderProbe();

    const latestExecutionCall = harness.mocks.useCanvasExecutionActions.mock.calls.at(-1)?.[0] as
      | {
          canonicalNodes?: Array<{ id: string }>;
          canonicalEdges?: Array<{ id: string }>;
          selectedNodeIds?: string[];
          workspaceNodeIds?: string[];
        }
      | undefined;

    expect(harness.state.store.setSelectedNodes).toHaveBeenCalledWith([]);
    expect(harness.state.store.setInspectorNode).toHaveBeenCalledWith(null);
    expect(harness.getLatestResult()?.inspectorNode).toBeNull();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
    expect(harness.getLatestResult()?.transformationValidation.scopedNodeIds).toEqual(['node_1']);
    expect(latestExecutionCall?.canonicalNodes?.map((node) => node.id)).toEqual(['node_1']);
    expect(latestExecutionCall?.canonicalEdges).toEqual([]);
    expect(latestExecutionCall?.selectedNodeIds).toEqual([]);
    expect(latestExecutionCall?.workspaceNodeIds).toEqual(['node_1']);
  });

  it('blocks editing and persistence until the workspace snapshot can project the full persisted draft', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.canonicalNodes = [
      ...harness.state.canonicalNodes,
      {
        id: 'node_remote_only',
        name: 'remote_only',
        pluginId: 'dbt',
        kind: 'dbt:model',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
    ];
    harness.state.canonicalEdges = [
      {
        id: 'edge_remote',
        sourceId: 'node_1',
        targetId: 'node_remote_only',
        relation: 'lineage',
      },
    ];
    harness.state.graphData = {
      nodes: [{ id: 'node_1' }],
      edges: [],
    };
    harness.state.graphDraftRecord = {
      revision: 'rev-remote',
      savedAt: '2026-04-17T00:00:00Z',
      draft: {
        nodeIds: ['node_1', 'node_remote_only'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_remote_only: { x: 240, y: 80 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_remote_only' }],
      },
    };

    await harness.renderProbe();
    await harness.renderProbe();

    let latestExecutionCall = harness.mocks.useCanvasExecutionActions.mock.calls.at(-1)?.[0] as
      | { canPlan?: boolean; canRun?: boolean }
      | undefined;

    expect(harness.getLatestResult()?.hasDraftProjectionGap).toBe(true);
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
    expect(latestExecutionCall?.canPlan).toBe(false);
    expect(latestExecutionCall?.canRun).toBe(false);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(harness.state.services.workspaceService.saveGraphDraft).not.toHaveBeenCalled();

    harness.state.graphData = {
      nodes: [{ id: 'node_1' }, { id: 'node_remote_only' }],
      edges: [{ id: 'edge_remote' }],
    };

    await harness.renderProbe();

    latestExecutionCall = harness.mocks.useCanvasExecutionActions.mock.calls.at(-1)?.[0] as
      | { canPlan?: boolean; canRun?: boolean }
      | undefined;

    expect(harness.getLatestResult()?.hasDraftProjectionGap).toBe(false);
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: true,
      })
    );
    expect(latestExecutionCall?.canPlan).toBe(true);
    expect(latestExecutionCall?.canRun).toBe(true);
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

  it('treats a CAS conflict as a blocked runtime state for editing and execution', async () => {
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

    const latestExecutionCall = harness.mocks.useCanvasExecutionActions.mock.calls.at(-1)?.[0] as
      | { canPlan?: boolean; canRun?: boolean }
      | undefined;

    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(true);
    expect(harness.getLatestResult()?.canStartRun).toBe(false);
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
    expect(latestExecutionCall?.canPlan).toBe(false);
    expect(latestExecutionCall?.canRun).toBe(false);
  });

  it('does not overwrite the remote draft while reloading after a CAS conflict', async () => {
    let saveAttempts = 0;
    harness.state.services.workspaceService.getGraphDraft = vi.fn(async () => ({
      revision: 'rev-remote',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: ['node_2'],
        nodePositions: {
          node_2: { x: 220, y: 120 },
        },
        edges: [],
      },
    }));
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

    await act(async () => {
      harness.getLatestResult()?.reloadLatestDraft();
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(saveAttempts).toBe(1);
    expect(harness.state.queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: ['workspace', 'graph-draft', 'tenant-a::project-a::dev'],
    });
    expect(harness.state.queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: ['workspace', 'graph', 'tenant-a::project-a::dev'],
    });
    expect(harness.state.queryClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['workspace', 'graph-draft', 'tenant-a::project-a::dev'],
      })
    );
    expect(harness.state.queryClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['workspace', 'graph', 'tenant-a::project-a::dev'],
      })
    );
    expect(harness.state.services.workspaceService.getGraphDraft).toHaveBeenCalledTimes(1);
    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(false);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_2']);
  });

  it('reloads against a fresh graph snapshot so remote draft nodes are not truncated by stale local canon', async () => {
    harness.state.services.workspaceService.getGraphDraft = vi.fn(async () => ({
      revision: 'rev-remote',
      savedAt: '2026-04-17T00:00:01Z',
      draft: {
        nodeIds: ['node_1', 'node_3'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_3: { x: 220, y: 120 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_3' }],
      },
    }));
    harness.state.services.workspaceService.getGraphSnapshot = vi.fn(async () => {
      harness.state.canonicalNodes = [
        ...harness.state.canonicalNodes,
        {
          id: 'node_3',
          name: 'src_erp_orders',
          pluginId: 'dbt',
          kind: 'dbt:model',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ];
      harness.state.canonicalEdges = [
        ...harness.state.canonicalEdges,
        {
          id: 'edge_imported',
          sourceId: 'node_1',
          targetId: 'node_3',
          relation: 'lineage',
        },
      ];

      const graphSnapshot: WorkspaceGraphSnapshot = {
        nodes: [
          {
            id: 'node_1',
            name: 'orders',
            type: 'MODEL',
            package: 'analytics',
            path: 'models/orders.sql',
            tags: [],
            status: 'idle',
            dependencies: [],
          },
          {
            id: 'node_2',
            name: 'customers',
            type: 'MODEL',
            package: 'analytics',
            path: 'models/customers.sql',
            tags: [],
            status: 'idle',
            dependencies: ['node_1'],
          },
          {
            id: 'node_3',
            name: 'src_erp_orders',
            type: 'MODEL',
            package: 'analytics',
            path: 'models/src_erp_orders.sql',
            tags: [],
            status: 'idle',
            dependencies: ['node_1'],
          },
        ],
        edges: [
          {
            id: 'edge_1',
            source: 'node_1',
            target: 'node_2',
            type: 'ref',
          },
          {
            id: 'edge_imported',
            source: 'node_1',
            target: 'node_3',
            type: 'ref',
          },
        ],
      };

      return graphSnapshot;
    });

    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.reloadLatestDraft();
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.state.services.workspaceService.getGraphSnapshot).toHaveBeenCalledTimes(1);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_3',
    ]);
    expect(harness.getLatestResult()?.edges).toEqual([
      { id: 'edge_imported', source: 'node_1', target: 'node_3' },
    ]);
  });

  it('ignores a late successful autosave after reload hydrates a newer remote draft', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-17T00:00:00Z',
      draft: {
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 120, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      },
    };

    let resolveSave: ((value: SaveWorkspaceGraphDraftResult) => void) | null = null;
    harness.state.services.workspaceService.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<SaveWorkspaceGraphDraftResult>((resolve) => {
          resolveSave = resolve;
        })
    );

    await harness.renderProbe();
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

    expect(harness.state.services.workspaceService.saveGraphDraft).toHaveBeenCalledTimes(1);

    harness.state.services.workspaceService.getGraphDraft = vi.fn(async () => ({
      revision: 'rev-remote',
      savedAt: '2026-04-17T00:00:01Z',
      draft: {
        nodeIds: ['node_2'],
        nodePositions: {
          node_2: { x: 220, y: 120 },
        },
        edges: [],
      },
    }));

    await act(async () => {
      harness.getLatestResult()?.reloadLatestDraft();
      await Promise.resolve();
    });
    await harness.renderProbe();
    harness.state.queryClient.setQueryData.mockClear();

    await act(async () => {
      resolveSave?.({
        outcome: 'saved',
        record: {
          revision: 'rev-stale',
          savedAt: '2026-04-17T00:00:02Z',
          draft: {
            nodeIds: ['node_1', 'node_2'],
            nodePositions: {
              node_1: { x: 48, y: 24 },
              node_2: { x: 148, y: 24 },
            },
            edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
          },
        },
      });
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.state.queryClient.setQueryData).not.toHaveBeenCalledWith(
      ['workspace', 'graph-draft', workspaceLayoutKey],
      expect.objectContaining({
        revision: 'rev-stale',
      })
    );
    expect(harness.state.services.workspaceService.getGraphDraft).toHaveBeenCalledTimes(1);
    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(false);
    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(false);
    expect(harness.getLatestResult()?.draftSaveStatus).toBe('idle');
  });

  it('clears selection and inspector state when reload hydrates a narrower remote draft', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-17T00:00:00Z',
      draft: {
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 120, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      },
    };

    await harness.renderProbe();
    await harness.renderProbe();

    harness.state.store.selectedNodes = ['node_2'];
    harness.state.store.inspectorNodeId = 'node_2';
    const storeActions = harness.state.store as typeof harness.state.store & {
      setSelectedNodes: ReturnType<typeof vi.fn>;
      setInspectorNode: ReturnType<typeof vi.fn>;
    };
    storeActions.setSelectedNodes.mockClear();
    storeActions.setInspectorNode.mockClear();

    harness.state.services.workspaceService.getGraphDraft = vi.fn(async () => ({
      revision: 'rev-2',
      savedAt: '2026-04-17T00:00:01Z',
      draft: {
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 32, y: 24 },
        },
        edges: [],
      },
    }));

    await act(async () => {
      harness.getLatestResult()?.reloadLatestDraft();
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(storeActions.setSelectedNodes).toHaveBeenCalledWith([]);
    expect(storeActions.setInspectorNode).toHaveBeenCalledWith(null);
    expect(harness.getLatestResult()?.inspectorNode).toBeNull();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
  });

  it('continues autosaving local edits after hydrating an existing remote draft', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
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
    harness.cleanup();
    harness = setupCanvasControllerHarness();
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

  it('adds imported nodes and refreshed canonical edges into an active persisted draft', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      },
    };

    await harness.renderProbe();
    await harness.renderProbe();

    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);

    await act(async () => {
      harness.getLatestResult()?.handleSourceImportComplete({
        success: true,
        sourcesCreated: 1,
        tablesImported: 1,
        yamlFiles: ['models/sources/src_erp.yml'],
        importedNodeIds: ['node_3'],
        grouping: 'schema',
        options: {
          includeColumns: true,
          addTests: false,
          addFreshness: false,
        },
      });
    });

    harness.state.graphData.nodes = [...harness.state.graphData.nodes, { id: 'node_3' }];
    harness.state.graphData.edges = [...harness.state.graphData.edges, { id: 'edge_imported' }];
    harness.state.canonicalNodes = [
      ...harness.state.canonicalNodes,
      {
        id: 'node_3',
        name: 'src_erp_orders',
        pluginId: 'dbt',
        kind: 'dbt:model',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
    ];
    harness.state.canonicalEdges = [
      ...harness.state.canonicalEdges,
      {
        id: 'edge_imported',
        sourceId: 'node_1',
        targetId: 'node_3',
        relation: 'lineage',
      },
    ];

    await harness.renderProbe();

    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_3',
    ]);
    expect(harness.getLatestResult()?.edges).toEqual([
      { id: 'edge_imported', source: 'node_1', target: 'node_3' },
    ]);
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual(['node_3']);
  });

  it('keeps a dropped canonical node visible and persistible under an active draft', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
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
    harness.mocks.useCanvasGraphHandlers.mockImplementation((params) => ({
      ...harness.state.graphHandlersResult,
      handleDrop: vi.fn(() => {
        params.setNodes((existingNodes: Array<Record<string, unknown>>) => [
          ...existingNodes,
          {
            id: 'node_2',
            type: 'dbtNode',
            position: { x: 220, y: 120 },
            data: {
              name: 'customers',
              pluginKind: 'dbt:model',
              showColumns: false,
              overlayDecoration: null,
            },
          },
        ]);
        params.onNodeAddedToCanvas?.('node_2');
      }),
    }));

    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleDrop({} as React.DragEvent<HTMLDivElement>);
    });
    await harness.renderProbe();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_2',
    ]);
    expect(harness.state.services.workspaceService.saveGraphDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodeIds: ['node_1', 'node_2'],
        }),
      })
    );
  });

  it('enters missing_remote when a previously loaded draft disappears and blocks autosave', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      },
    };

    await harness.renderProbe();
    await harness.renderProbe();

    harness.state.graphDraftRecord = null;
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
          node_1: { x: 24, y: 24 },
        },
      },
    };

    await harness.renderProbe();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
    expect(harness.state.services.workspaceService.saveGraphDraft).not.toHaveBeenCalled();
  });

  it('adopts the current workspace snapshot after missing_remote and exits the blocked state', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      },
    };

    await harness.renderProbe();
    await harness.renderProbe();

    harness.state.graphDraftRecord = null;
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.adoptCurrentWorkspaceSnapshot();
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(false);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_2',
    ]);
  });

  it('reloads the remote draft after entering missing_remote when the persisted draft reappears', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.graphDraftRecord = {
      revision: 'rev-1',
      savedAt: '2026-04-16T00:00:00Z',
      draft: {
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      },
    };

    await harness.renderProbe();
    await harness.renderProbe();

    harness.state.graphDraftRecord = null;
    await harness.renderProbe();

    harness.state.services.workspaceService.getGraphDraft = vi.fn(async () => ({
      revision: 'rev-restored',
      savedAt: '2026-04-17T00:00:02Z',
      draft: {
        nodeIds: ['node_2'],
        nodePositions: {
          node_2: { x: 220, y: 120 },
        },
        edges: [],
      },
    }));

    await act(async () => {
      harness.getLatestResult()?.reloadLatestDraft();
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.state.services.workspaceService.getGraphDraft).toHaveBeenCalledTimes(1);
    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(false);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_2']);
    expect(harness.state.queryClient.setQueryData).toHaveBeenCalledWith(
      ['workspace', 'graph-draft', 'tenant-a::project-a::dev'],
      expect.objectContaining({
        revision: 'rev-restored',
      })
    );
  });
});
