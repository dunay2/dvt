import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkspaceGraphDraftAuthoringSaveResult } from '../../ports/workspaceGraphDraftAuthoring';
import { buildDraftSaveSavedResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  applyTransformationAuthoringFixture,
  buildRemoteDraftRecord,
  setCanvasLayoutNodePositions,
  setHarnessRemoteDraftRecord,
  TRANSFORMATION_AUTHORING_CANONICAL_NODES,
  type CanvasControllerHarness,
  WORKSPACE_LAYOUT_KEY,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';
import {
  createReloadRecoveryHarness,
  reloadLatestDraft,
  replaceHarnessWithDraft,
} from './useCanvasController.reloadRecovery.test.support';

describe('useCanvasController reload hydration guards', () => {
  let harness: CanvasControllerHarness;

  beforeEach(async () => {
    harness = await createReloadRecoveryHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  function configureDropToCompleteGovernedDraft(): void {
    const droppedCanonicalNode =
      TRANSFORMATION_AUTHORING_CANONICAL_NODES.find((node) => node.id === 'node_3') ??
      (() => {
        throw new Error('EXPECTED_NODE_3_CANONICAL_NODE');
      })();

    applyTransformationAuthoringFixture(harness, ['node_1', 'node_2']);
    harness.mocks.useCanvasGraphHandlers.mockImplementation((params) => ({
      ...harness.state.graphHandlersResult,
      handleDrop: vi.fn(() => {
        harness.state.graphDraftQueryData = projectCanvasHarnessDraftReadModel(
          buildRemoteDraftRecord(
            {
              nodeIds: ['node_1', 'node_2', 'node_3'],
              nodePositions: {
                node_1: { x: 0, y: 0 },
                node_2: { x: 120, y: 0 },
                node_3: { x: 240, y: 0 },
              },
              edges: [
                { sourceId: 'node_1', targetId: 'node_2' },
                { sourceId: 'node_2', targetId: 'node_3' },
              ],
            },
            'rev-local-semantic',
            '2026-04-18T00:00:02Z'
          )
        );
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
          localNodeCatalog:
            currentSession.localNodeCatalog == null
              ? { node_3: droppedCanonicalNode }
              : {
                  ...currentSession.localNodeCatalog,
                  node_3: droppedCanonicalNode,
                },
        }));
        harness.state.graphData = {
          nodes: [{ id: 'node_1' }, { id: 'node_2' }, { id: 'node_3' }],
          edges: [{ id: 'edge_1' }, { id: 'edge_2' }],
        };
      }),
    }));
  }

  it('ignores a late successful autosave after reload hydrates a newer remote draft', async () => {
    configureDropToCompleteGovernedDraft();
    harness = await replaceHarnessWithDraft(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1', 'node_2'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 120, y: 0 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        },
        'rev-1',
        '2026-04-17T00:00:00Z'
      )
    );
    configureDropToCompleteGovernedDraft();

    let resolveSave: ((value: WorkspaceGraphDraftAuthoringSaveResult) => void) | null = null;
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<WorkspaceGraphDraftAuthoringSaveResult>((resolve) => {
          resolveSave = resolve;
        })
    );

    await harness.renderProbe();
    await act(async () => {
      harness.getLatestResult()?.handleDrop({} as React.DragEvent<HTMLDivElement>);
    });
    await waitForAutosaveDebounce();

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalledTimes(1);

    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_2'],
          nodePositions: {
            node_2: { x: 220, y: 120 },
          },
          edges: [],
        },
        'rev-remote',
        '2026-04-17T00:00:01Z'
      )
    );

    await reloadLatestDraft(harness);
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

    expect(harness.state.queryClient.setQueryData).not.toHaveBeenCalledWith(
      ['workspace', 'graph-draft', WORKSPACE_LAYOUT_KEY],
      expect.objectContaining({
        revision: 'rev-stale',
      })
    );
    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(false);
    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(false);
    expect(harness.getLatestResult()?.draftSaveStatus).toBe('idle');
  });

  it('clears selection and inspector state when reload hydrates a narrower remote draft', async () => {
    harness = await replaceHarnessWithDraft(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1', 'node_2'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 120, y: 0 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        },
        'rev-1',
        '2026-04-17T00:00:00Z'
      )
    );

    harness.state.store.selectedNodes = ['node_2'];
    harness.state.store.inspectorNodeId = 'node_2';
    const storeActions = harness.state.store;
    storeActions.setSelectedNodes.mockClear();
    storeActions.setInspectorNode.mockClear();

    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 32, y: 24 },
          },
          edges: [],
        },
        'rev-2',
        '2026-04-17T00:00:01Z'
      )
    );

    await reloadLatestDraft(harness);

    expect(storeActions.setSelectedNodes).toHaveBeenCalledWith([]);
    expect(storeActions.setInspectorNode).toHaveBeenCalledWith(null);
    expect(harness.getLatestResult()?.inspectorNode).toBeNull();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
  });

  it('keeps locally persisted node positions when reload hydrates a remote draft', async () => {
    harness = await replaceHarnessWithDraft(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
          },
          edges: [],
        },
        'rev-1',
        '2026-04-17T00:00:00Z'
      )
    );
    setCanvasLayoutNodePositions(harness, {
      node_1: { x: 320, y: 240 },
    });
    harness.state.store.setCanvasNodePositions.mockClear();
    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 40, y: 60 },
          },
          edges: [],
        },
        'rev-2',
        '2026-04-17T00:00:01Z'
      )
    );

    await reloadLatestDraft(harness);

    const node = harness
      .getLatestResult()
      ?.nodesWithImpact.find((candidate) => candidate.id === 'node_1');

    expect(harness.state.store.setCanvasNodePositions).not.toHaveBeenCalledWith(
      WORKSPACE_LAYOUT_KEY,
      {
        node_1: { x: 40, y: 60 },
      }
    );
    expect(node?.position).toEqual({ x: 320, y: 240 });
  });
});
