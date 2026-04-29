import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildDraftSaveConflictResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  buildRemoteDraftRecord,
  createTransformationAuthoringHarnessWithDraft,
  TRANSFORMATION_AUTHORING_CANONICAL_NODES,
  type CanvasControllerHarness,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';

describe('useCanvasController draft lifecycle conflict state', () => {
  let harness: CanvasControllerHarness | null = null;

  afterEach(() => {
    harness?.cleanup();
    harness = null;
  });

  function configureConflictTrigger(currentHarness: CanvasControllerHarness): void {
    const droppedCanonicalNode =
      TRANSFORMATION_AUTHORING_CANONICAL_NODES.find((node) => node.id === 'node_3') ??
      (() => {
        throw new Error('EXPECTED_NODE_3_CANONICAL_NODE');
      })();

    currentHarness.mocks.useCanvasGraphHandlers.mockImplementation((params) => ({
      ...currentHarness.state.graphHandlersResult,
      handleDrop: vi.fn(() => {
        currentHarness.state.graphDraftQueryData = projectCanvasHarnessDraftReadModel(
          buildRemoteDraftRecord(
            {
              nodeIds: ['node_1', 'node_2', 'node_3'],
              nodePositions: {
                node_1: { x: 0, y: 0 },
                node_2: { x: 100, y: 0 },
                node_3: { x: 200, y: 0 },
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
            position: { x: 200, y: 0 },
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
        currentHarness.state.graphData = {
          nodes: [{ id: 'node_1' }, { id: 'node_2' }, { id: 'node_3' }],
          edges: [{ id: 'edge_1' }, { id: 'edge_2' }],
        };
      }),
    }));
  }

  it('surfaces stale draft state when saveGraphDraft returns a CAS conflict', async () => {
    harness = await createTransformationAuthoringHarnessWithDraft(
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1', 'node_2'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 100, y: 0 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        },
        'rev-conflict'
      ),
      ['node_1', 'node_2']
    );
    configureConflictTrigger(harness);
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = async () =>
      buildDraftSaveConflictResponse(
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        { currentRevision: 'rev-conflict' }
      );

    await harness.renderProbe();
    await act(async () => {
      harness?.getLatestResult()?.handleDrop({} as React.DragEvent<HTMLDivElement>);
    });
    await harness.renderProbe();
    await waitForAutosaveDebounce();
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(true);
    expect(harness.getLatestResult()?.draftConflictRevision).toBe('rev-conflict');
  });

  it('treats a CAS conflict as a blocked runtime state for editing and execution', async () => {
    harness = await createTransformationAuthoringHarnessWithDraft(
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1', 'node_2'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 100, y: 0 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        },
        'rev-conflict'
      ),
      ['node_1', 'node_2']
    );
    configureConflictTrigger(harness);
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = async () =>
      buildDraftSaveConflictResponse(
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        { currentRevision: 'rev-conflict' }
      );

    await harness.renderProbe();
    await act(async () => {
      harness?.getLatestResult()?.handleDrop({} as React.DragEvent<HTMLDivElement>);
    });
    await harness.renderProbe();
    await waitForAutosaveDebounce();
    await harness.renderProbe();

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
});
