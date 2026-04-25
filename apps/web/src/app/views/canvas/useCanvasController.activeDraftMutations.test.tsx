import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDraftSaveSavedResponse } from '../../services/workspace/workspaceGraphDraft.test.fixtures';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  createTransformationAuthoringHarnessWithDraft,
  setCanvasLayoutNodePositions,
  TRANSFORMATION_AUTHORING_CANONICAL_NODES,
  type CanvasControllerHarness,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController active draft mutations', () => {
  let harness: CanvasControllerHarness;

  beforeEach(async () => {
    harness = setupCanvasControllerHarness();
    await harness.renderProbe();
  });

  afterEach(() => {
    harness.cleanup();
  });

  async function replaceHarnessWithDraft(
    record: ReturnType<typeof buildRemoteDraftRecord>
  ): Promise<void> {
    harness.cleanup();
    harness = await createHarnessWithDraft(record);
  }

  async function replaceHarnessWithTransformationDraft(
    record: ReturnType<typeof buildRemoteDraftRecord>,
    visibleNodeIds: string[] = ['node_1', 'node_2', 'node_3']
  ): Promise<void> {
    harness.cleanup();
    harness = await createTransformationAuthoringHarnessWithDraft(record, visibleNodeIds);
  }

  it('does not autosave pure layout edits after hydrating an existing remote draft', async () => {
    await replaceHarnessWithTransformationDraft(
      buildRemoteDraftRecord({
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
      })
    );

    const storeState = harness.state.store as unknown as {
      canvasLayouts: Record<
        string,
        { nodePositions?: Record<string, { x: number; y: number }>; viewport?: unknown }
      >;
    };
    storeState.canvasLayouts = {
      ...storeState.canvasLayouts,
      'tenant-a::project-a::dev': {
        nodePositions: {
          node_1: { x: 48, y: 24 },
          node_2: { x: 148, y: 24 },
          node_3: { x: 248, y: 24 },
        },
      },
    };

    await harness.renderProbe();
    await waitForAutosaveDebounce();

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).not.toHaveBeenCalled();
  });

  it('does not snap node positions back to the hydrated remote draft after a local move', async () => {
    await replaceHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_2'],
        nodePositions: {
          node_2: { x: 220, y: 120 },
        },
        edges: [],
      })
    );

    setCanvasLayoutNodePositions(harness, {
      node_2: { x: 420, y: 260 },
    });

    await harness.renderProbe();

    expect(
      harness.getLatestResult()?.nodesWithImpact.find((node) => node.id === 'node_2')?.position
    ).toEqual({ x: 420, y: 260 });
  });

  it('adds imported nodes and refreshed canonical edges into an active persisted draft', async () => {
    await replaceHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      })
    );

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
    harness.state.graphDraftQueryData = projectCanvasHarnessDraftReadModel(
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1', 'node_3'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_3: { x: 220, y: 120 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_3' }],
        },
        'rev-imported',
        '2026-04-18T00:00:01Z'
      )
    );

    await harness.renderProbe();

    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_3',
    ]);
    expect(harness.getLatestResult()?.edges).toEqual([
      { id: 'draft_edge_node_1_node_3', source: 'node_1', target: 'node_3' },
    ]);
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual(['node_3']);
  });

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
