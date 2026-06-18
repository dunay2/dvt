import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDraftSaveSavedResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  buildRemoteDraftRecord,
  createTransformationAuthoringHarnessWithDraft,
  TRANSFORMATION_AUTHORING_CANONICAL_NODES,
  type CanvasControllerHarness,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController active draft node authoring', () => {
  let harness: CanvasControllerHarness;

  beforeEach(async () => {
    harness = setupCanvasControllerHarness();
    await harness.renderProbe();
  });

  afterEach(() => {
    harness.cleanup();
  });

  async function replaceHarnessWithTransformationDraft(
    record: ReturnType<typeof buildRemoteDraftRecord>,
    visibleNodeIds: string[] = ['node_1', 'node_2', 'node_3']
  ): Promise<void> {
    harness.cleanup();
    harness = await createTransformationAuthoringHarnessWithDraft(record, visibleNodeIds);
  }

  it('keeps a dropped canonical node visible and persistible under an active draft', async () => {
    await replaceHarnessWithTransformationDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 120, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      }),
      ['node_1', 'node_2']
    );
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = vi.fn(async () =>
      buildDraftSaveSavedResponse(
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        { revision: 'rev-2' }
      )
    );
    const droppedCanonicalNode =
      TRANSFORMATION_AUTHORING_CANONICAL_NODES.find((node) => node.id === 'node_3') ??
      (() => {
        throw new Error('EXPECTED_NODE_3_CANONICAL_NODE');
      })();
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
                node_3: { x: 220, y: 120 },
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
            position: { x: 220, y: 120 },
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

    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleDrop({} as React.DragEvent<HTMLDivElement>);
    });
    await harness.renderProbe();
    await waitForAutosaveDebounce();
    await harness.renderProbe();

    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_2',
      'node_3',
    ]);
    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({ id: 'node_1' }),
            expect.objectContaining({ id: 'node_2' }),
            expect.objectContaining({ id: 'node_3' }),
          ]),
        }),
      })
    );
  });

  it('autosaves inspector-authored node details through the authoring draft boundary', async () => {
    await replaceHarnessWithTransformationDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      }),
      ['node_1']
    );
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = vi.fn(async () =>
      buildDraftSaveSavedResponse(
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        { revision: 'rev-inspector' }
      )
    );

    await act(async () => {
      harness.getLatestResult()?.applyInspectorNodeDraft({
        name: 'orders_source_renamed',
        description: 'Edited through Inspector',
        tags: ['authoring', 'reviewed'],
      });
    });
    await harness.renderProbe();
    await waitForAutosaveDebounce();
    await harness.renderProbe();

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 'rev-1',
        draft: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              id: 'node_1',
              name: 'orders_source_renamed',
              description: 'Edited through Inspector',
            }),
          ]),
        }),
      })
    );
  });
});
