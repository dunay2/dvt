import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createTransformationAuthoringHarness,
  setHarnessRemoteDraftRecord,
  type CanvasControllerHarness,
} from './useCanvasController.draftLifecycle.test.support';
import {
  appendRemoteSinkGraphState,
  buildProtectedDraftReadResult,
  buildProtectedTableNode,
  buildProtectedTransformNode,
  buildSingleNodeDraftRecord,
  buildSourceTransformDraftRecord,
} from './useCanvasController.reloadConflictRecovery.test.support';
import {
  createReloadRecoveryHarness,
  reloadLatestDraft,
} from './useCanvasController.reloadRecovery.test.support';

describe('useCanvasController protected draft reload', () => {
  let harness: CanvasControllerHarness;

  beforeEach(async () => {
    harness = await createReloadRecoveryHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('reloads from the typed authoring port instead of bypassing through injected graph-draft cache state', async () => {
    harness.cleanup();
    harness = await createTransformationAuthoringHarness();
    setHarnessRemoteDraftRecord(
      harness,
      buildSingleNodeDraftRecord({ nodeId: 'node_2', revision: 'rev-stale' })
    );
    appendRemoteSinkGraphState(harness);
    harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft = vi.fn(async () =>
      buildProtectedDraftReadResult({
        revision: 'rev-remote',
        updatedAt: '2026-04-18T00:00:05Z',
        nodes: [
          buildProtectedTransformNode({
            nodeId: 'node_2',
            path: 'models/transform.sql',
            contentShaSeed: 'c',
          }),
          buildProtectedTableNode({
            nodeId: 'node_4',
            type: 'sink',
            schema: 'analytics',
            table: 'remote_sink',
            materialization: 'table',
            writeMode: 'replace',
          }),
        ],
        edges: [{ sourceId: 'node_2', targetId: 'node_4' }],
      })
    );

    await reloadLatestDraft(harness);

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft
    ).toHaveBeenCalled();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_2',
      'node_4',
    ]);
    expect(harness.getLatestResult()?.edges).toEqual([
      expect.objectContaining({
        id: 'draft_edge_node_2_node_4',
        source: 'node_2',
        target: 'node_4',
        ariaLabel: 'Edge from node_2 to remote_sink',
      }),
    ]);
  });

  it('reloads protected draft nodes without truncating them by stale local canon', async () => {
    setHarnessRemoteDraftRecord(
      harness,
      buildSourceTransformDraftRecord({ revision: 'rev-remote' })
    );
    harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft = vi.fn(async () =>
      buildProtectedDraftReadResult({
        revision: 'rev-remote',
        updatedAt: '2026-04-17T00:00:02Z',
        nodes: [
          buildProtectedTableNode({
            nodeId: 'node_1',
            type: 'source',
            schema: 'raw',
            table: 'orders',
            alias: 'orders',
          }),
          buildProtectedTransformNode({
            nodeId: 'node_3',
            path: 'models/src_erp_orders.sql',
            contentShaSeed: 'd',
          }),
        ],
        edges: [{ sourceId: 'node_1', targetId: 'node_3' }],
      })
    );

    await harness.renderProbe();
    await reloadLatestDraft(harness);

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft
    ).toHaveBeenCalled();
    expect('workspaceService' in harness.state.services).toBe(false);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_3',
    ]);
    expect(harness.getLatestResult()?.edges).toEqual([
      expect.objectContaining({
        id: 'draft_edge_node_1_node_3',
        source: 'node_1',
        target: 'node_3',
        ariaLabel: 'Edge from orders to node_3',
      }),
    ]);
  });
});
