import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';

import type { SaveWorkspaceGraphDraftResult } from '../../ports/workspace';
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

  it('does not auto-merge unrelated snapshot nodes into an active persisted draft', async () => {
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

    harness.state.graphData.nodes = [...harness.state.graphData.nodes, { id: 'node_3' }];
    harness.state.canonicalNodes = [
      ...harness.state.canonicalNodes,
      {
        id: 'node_3',
        name: 'payments',
        pluginId: 'dbt',
        kind: 'dbt:model',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
    ];

    await harness.renderProbe();

    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
  });

  it('does not reopen editing when an in-flight autosave fails after the draft disappears remotely', async () => {
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

    let rejectSave: ((reason?: unknown) => void) | null = null;
    harness.state.services.workspaceService.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<never>((_, reject) => {
          rejectSave = reject;
        })
    );

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
        },
      },
    };

    await harness.renderProbe();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(harness.state.services.workspaceService.saveGraphDraft).toHaveBeenCalledTimes(1);

    harness.state.graphDraftRecord = null;
    await harness.renderProbe();

    await act(async () => {
      rejectSave?.(new Error('network down'));
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(harness.getLatestResult()?.draftSaveStatus).toBe('idle');
    expect(harness.state.services.workspaceService.saveGraphDraft).toHaveBeenCalledTimes(1);
  });

  it('ignores a late successful autosave after the draft disappears remotely', async () => {
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

    let resolveSave: ((value: SaveWorkspaceGraphDraftResult) => void) | null = null;
    harness.state.services.workspaceService.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<SaveWorkspaceGraphDraftResult>((resolve) => {
          resolveSave = resolve;
        })
    );

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
        },
      },
    };

    await harness.renderProbe();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(harness.state.services.workspaceService.saveGraphDraft).toHaveBeenCalledTimes(1);

    harness.state.graphDraftRecord = null;
    await harness.renderProbe();
    harness.state.queryClient.setQueryData.mockClear();

    await act(async () => {
      resolveSave?.({
        outcome: 'saved',
        record: {
          revision: 'rev-stale',
          savedAt: '2026-04-16T00:00:01Z',
          draft: {
            nodeIds: ['node_1'],
            nodePositions: {
              node_1: { x: 48, y: 24 },
            },
            edges: [],
          },
        },
      });
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(harness.getLatestResult()?.draftSaveStatus).toBe('idle');
    expect(harness.state.queryClient.setQueryData).not.toHaveBeenCalledWith(
      ['workspace', 'graph-draft', workspaceLayoutKey],
      expect.objectContaining({
        revision: 'rev-stale',
      })
    );
  });

  it('ignores source import completion once the canvas is blocked by missing_remote', async () => {
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

    const storeActions = harness.state.store as typeof harness.state.store & {
      setCurrentPlan: ReturnType<typeof vi.fn>;
      setSelectedNodes: ReturnType<typeof vi.fn>;
      setInspectorNode: ReturnType<typeof vi.fn>;
      showInspectorPanel: ReturnType<typeof vi.fn>;
    };

    storeActions.setCurrentPlan.mockClear();
    storeActions.setSelectedNodes.mockClear();
    storeActions.setInspectorNode.mockClear();
    storeActions.showInspectorPanel.mockClear();
    harness.state.queryClient.invalidateQueries.mockClear();

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

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(storeActions.setCurrentPlan).not.toHaveBeenCalled();
    expect(storeActions.setSelectedNodes).not.toHaveBeenCalled();
    expect(storeActions.setInspectorNode).not.toHaveBeenCalled();
    expect(storeActions.showInspectorPanel).not.toHaveBeenCalled();
    expect(harness.state.queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([]);
  });
});
