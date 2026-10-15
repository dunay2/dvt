import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildGraphDraftSourceImportResult } from '../../../testing/sourceImportTestFixtures';
import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  waitForAutosaveDebounce,
  type CanvasControllerHarness,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';

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

  it('refreshes registered sources without placing them in the active persisted graph', async () => {
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

    const registeredRecord = buildRemoteDraftRecord(
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
    );
    registeredRecord.draft.nodes = registeredRecord.draft.nodes.map((node) =>
      node.id === 'node_3'
        ? {
            ...registeredRecord.draft.nodes[0]!,
            id: node.id,
            name: 'Registered source',
            metadata: {
              schema: 'raw',
              tableName: 'orders',
              connectedSourceRef: {
                schemaVersion: 'connected-source-ref.v1',
                connectionRef: {
                  schemaVersion: 'connection-ref.v1',
                  connectionId: 'warehouse-main',
                  provider: 'postgres',
                },
                sourceObjectId: 'raw.orders',
              },
            },
          }
        : node
    );
    registeredRecord.draft.nodeIds = ['node_1'];
    registeredRecord.draft.nodePositions = { node_1: { x: 0, y: 0 } };
    registeredRecord.draft.edges = [];
    registeredRecord.draft.canvases = [
      {
        canvas: registeredRecord.draft.canvases![0]!.canvas,
        nodes: registeredRecord.draft.nodes,
        nodeIds: registeredRecord.draft.nodeIds,
        nodePositions: registeredRecord.draft.nodePositions,
        edges: [],
      },
    ];
    harness.state.remoteDraftRecord = registeredRecord;
    harness.state.graphDraftQueryData = projectCanvasHarnessDraftReadModel(registeredRecord);

    await harness.renderProbe();

    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
    expect(harness.getLatestResult()?.edges).toEqual([]);
    expect(harness.getLatestResult()?.inspectorGraphNodes.map((node) => node.id)).toContain(
      'node_3'
    );
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual(['node_3']);

    const registered = harness
      .getLatestResult()!
      .inspectorGraphNodes.find((node) => node.id === 'node_3')!;
    await act(async () => {
      const result = harness.getLatestResult()?.applyNodeDraft(registered.id, {
        ...createCanvasInspectorNodeDraft(registered),
        description: 'Configured without placing a card',
      });
      expect(result).toMatchObject({ outcome: 'applied' });
    });
    await waitForAutosaveDebounce();
    await harness.renderProbe();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodeIds: ['node_1'],
          nodes: expect.arrayContaining([
            expect.objectContaining({
              id: 'node_3',
              description: 'Configured without placing a card',
            }),
          ]),
        }),
      })
    );
  });
});
