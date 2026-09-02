import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildGraphDraftSourceImportResult } from '../../../testing/sourceImportTestFixtures';
import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  type CanvasControllerHarness,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController active draft source import', () => {
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
      harness.getLatestResult()?.handleSourceImportComplete(
        buildGraphDraftSourceImportResult({
          importedNodeIds: ['node_3'],
        })
      );
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
      expect.objectContaining({
        id: 'draft_edge_node_1_node_3',
        source: 'node_1',
        target: 'node_3',
        ariaLabel: 'Edge from node_1 to node_3',
      }),
    ]);
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual(['node_3']);
  });
});
