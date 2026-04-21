import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';

import type { WorkspaceGraphDraftAuthoringSaveResult } from '../../ports/workspaceGraphDraftAuthoring';
import { buildDraftSaveSavedResponse } from '../../services/workspace/workspaceGraphDraft.test.fixtures';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  applyTransformationAuthoringFixture,
  buildRemoteDraftRecord,
  clearHarnessRemoteDraftRecord,
  setHarnessRemoteDraftRecord,
} from './useCanvasController.draftLifecycle.test.support';
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

  function configureDropToCompleteGovernedDraft(): void {
    applyTransformationAuthoringFixture(harness, ['node_1', 'node_2']);
    harness.mocks.useCanvasGraphHandlers.mockImplementation((params) => ({
      ...harness.state.graphHandlersResult,
      handleDrop: vi.fn(() => {
        params.setNodes((existingNodes: Array<Record<string, unknown>>) => [
          ...existingNodes,
          {
            id: 'node_3',
            type: 'dbtNode',
            position: { x: 240, y: 0 },
            data: {
              name: 'orders_sink',
              pluginKind: 'dvt:sink',
              showColumns: false,
              overlayDecoration: null,
            },
          },
        ]);
        params.setDraftSession((currentSession: CanvasDraftSession) => ({
          ...currentSession,
          workingSet: {
            ...currentSession.workingSet,
            visibleNodeIds: [...currentSession.workingSet.visibleNodeIds, 'node_3'],
            visibleEdges: [
              ...currentSession.workingSet.visibleEdges,
              { sourceId: 'node_2', targetId: 'node_3' },
            ],
          },
        }));
        harness.state.graphData = {
          nodes: [{ id: 'node_1' }, { id: 'node_2' }, { id: 'node_3' }],
          edges: [{ id: 'edge_1' }, { id: 'edge_2' }],
        };
      }),
    }));
  }

  async function triggerGovernedAutosave(): Promise<void> {
    await harness.renderProbe();
    await act(async () => {
      harness.getLatestResult()?.handleDrop({} as React.DragEvent<HTMLDivElement>);
    });
    await harness.renderProbe();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
  }

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
    expect(harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft).not.toHaveBeenCalled();
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

    expect(harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft).not.toHaveBeenCalled();
  });

  it('renders an intentionally empty persisted draft without falling back to the snapshot graph', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    setHarnessRemoteDraftRecord(harness, buildRemoteDraftRecord({
        nodeIds: [],
        nodePositions: {},
        edges: [],
      }, 'rev-empty', '2026-04-16T00:00:00Z'));

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
    setHarnessRemoteDraftRecord(harness, buildRemoteDraftRecord({
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      }, 'rev-1', '2026-04-16T00:00:00Z'));

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
    configureDropToCompleteGovernedDraft();
    setHarnessRemoteDraftRecord(harness, buildRemoteDraftRecord({
      nodeIds: ['node_1', 'node_2'],
      nodePositions: {
        node_1: { x: 0, y: 0 },
        node_2: { x: 120, y: 0 },
      },
      edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    }));

    let rejectSave: ((reason?: unknown) => void) | null = null;
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<never>((_, reject) => {
          rejectSave = reject;
        })
    );

    await triggerGovernedAutosave();

    expect(harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft).toHaveBeenCalledTimes(1);

    clearHarnessRemoteDraftRecord(harness);
    await harness.renderProbe();

    await act(async () => {
      rejectSave?.(new Error('network down'));
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(harness.getLatestResult()?.draftSaveStatus).toBe('idle');
    expect(harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft).toHaveBeenCalledTimes(1);
  });

  it('ignores a late successful autosave after the draft disappears remotely', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    configureDropToCompleteGovernedDraft();
    setHarnessRemoteDraftRecord(harness, buildRemoteDraftRecord({
      nodeIds: ['node_1', 'node_2'],
      nodePositions: {
        node_1: { x: 0, y: 0 },
        node_2: { x: 120, y: 0 },
      },
      edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    }));

    let resolveSave: ((value: WorkspaceGraphDraftAuthoringSaveResult) => void) | null = null;
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<WorkspaceGraphDraftAuthoringSaveResult>((resolve) => {
          resolveSave = resolve;
        })
    );

    await triggerGovernedAutosave();

    expect(harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft).toHaveBeenCalledTimes(1);

    clearHarnessRemoteDraftRecord(harness);
    await harness.renderProbe();
    harness.state.queryClient.setQueryData.mockClear();

    await act(async () => {
      resolveSave?.({
        ...buildDraftSaveSavedResponse(
          {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'dev',
          },
          { revision: 'rev-stale' }
        ),
      });
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(harness.getLatestResult()?.draftSaveStatus).toBe('idle');
    expect(harness.state.queryClient.setQueryData).not.toHaveBeenCalledWith(
      ['workspace', 'graph-draft', 'tenant-a::project-a::dev'],
      expect.objectContaining({
        revision: 'rev-stale',
      })
    );
  });

  it('ignores source import completion once the canvas is blocked by missing_remote', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    setHarnessRemoteDraftRecord(harness, buildRemoteDraftRecord({
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      }, 'rev-1', '2026-04-16T00:00:00Z'));

    await harness.renderProbe();
    await harness.renderProbe();

    clearHarnessRemoteDraftRecord(harness);
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
