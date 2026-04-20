import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDraftSaveSavedResponse } from '../../services/workspace/workspaceGraphDraft.test.fixtures';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  buildDraftRecord,
  createHarnessWithDraft,
  createTransformationAuthoringHarnessWithDraft,
  setCanvasLayoutNodePositions,
  type CanvasControllerHarness,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
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

  async function replaceHarnessWithDraft(record: ReturnType<typeof buildDraftRecord>): Promise<void> {
    harness.cleanup();
    harness = await createHarnessWithDraft(record);
  }

  async function replaceHarnessWithTransformationDraft(
    record: ReturnType<typeof buildDraftRecord>,
    visibleNodeIds: string[] = ['node_1', 'node_2', 'node_3']
  ): Promise<void> {
    harness.cleanup();
    harness = await createTransformationAuthoringHarnessWithDraft(record, visibleNodeIds);
  }

  it('does not autosave pure layout edits after hydrating an existing remote draft', async () => {
    await replaceHarnessWithTransformationDraft(
      buildDraftRecord({
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

    expect(harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft).not.toHaveBeenCalled();
  });

  it('does not snap node positions back to the hydrated remote draft after a local move', async () => {
    await replaceHarnessWithDraft(
      buildDraftRecord({
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
      buildDraftRecord({
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
    await replaceHarnessWithTransformationDraft(
      buildDraftRecord({
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
    harness.mocks.useCanvasGraphHandlers.mockImplementation((params) => ({
      ...harness.state.graphHandlersResult,
      handleDrop: vi.fn(() => {
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

    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_2',
      'node_3',
    ]);
    expect(harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft).toHaveBeenCalledWith(
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
});
