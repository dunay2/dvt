import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkspaceGraphSnapshot } from '../../ports/workspace';
import {
  buildDraftRecord,
  createHarnessWithDraft,
  type CanvasControllerHarness,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController draft lifecycle', () => {
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

  it('scopes execution and prunes hidden selection when bootstrapping from a persisted draft subset', async () => {
    await replaceHarnessWithDraft(
      buildDraftRecord(
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
    harness.state.store.selectedNodes = ['node_2'];
    harness.state.store.inspectorNodeId = 'node_2';

    await harness.renderProbe();

    const latestExecutionCall = harness.mocks.useCanvasExecutionActions.mock.calls.at(-1)?.[0] as
      | {
          canonicalNodes?: Array<{ id: string }>;
          canonicalEdges?: Array<{ id: string }>;
          selectedNodeIds?: string[];
          workspaceNodeIds?: string[];
        }
      | undefined;

    expect(harness.state.store.setSelectedNodes).toHaveBeenCalledWith([]);
    expect(harness.state.store.setInspectorNode).toHaveBeenCalledWith(null);
    expect(harness.getLatestResult()?.inspectorNode).toBeNull();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
    expect(harness.getLatestResult()?.transformationValidation.scopedNodeIds).toEqual(['node_1']);
    expect(latestExecutionCall?.canonicalNodes?.map((node) => node.id)).toEqual(['node_1']);
    expect(latestExecutionCall?.canonicalEdges).toEqual([]);
    expect(latestExecutionCall?.selectedNodeIds).toEqual([]);
    expect(latestExecutionCall?.workspaceNodeIds).toEqual(['node_1']);
  });

  it('blocks editing and persistence until the workspace snapshot can project the full persisted draft', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    harness.state.canonicalNodes = [
      ...harness.state.canonicalNodes,
      {
        id: 'node_remote_only',
        name: 'remote_only',
        pluginId: 'dbt',
        kind: 'dbt:model',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
    ];
    harness.state.canonicalEdges = [
      {
        id: 'edge_remote',
        sourceId: 'node_1',
        targetId: 'node_remote_only',
        relation: 'lineage',
      },
    ];
    harness.state.graphData = {
      nodes: [{ id: 'node_1' }],
      edges: [],
    };
    harness.state.graphDraftRecord = buildDraftRecord(
      {
        nodeIds: ['node_1', 'node_remote_only'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_remote_only: { x: 240, y: 80 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_remote_only' }],
      },
      'rev-remote',
      '2026-04-17T00:00:00Z'
    );

    await harness.renderProbe();
    await harness.renderProbe();

    let latestExecutionCall = harness.mocks.useCanvasExecutionActions.mock.calls.at(-1)?.[0] as
      | { canPlan?: boolean; canRun?: boolean }
      | undefined;

    expect(harness.getLatestResult()?.hasDraftProjectionGap).toBe(true);
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
    expect(latestExecutionCall?.canPlan).toBe(false);
    expect(latestExecutionCall?.canRun).toBe(false);

    await waitForAutosaveDebounce();
    expect(harness.state.services.workspaceService.saveGraphDraft).not.toHaveBeenCalled();

    harness.state.graphData = {
      nodes: [{ id: 'node_1' }, { id: 'node_remote_only' }],
      edges: [{ id: 'edge_remote' }],
    };

    await harness.renderProbe();

    latestExecutionCall = harness.mocks.useCanvasExecutionActions.mock.calls.at(-1)?.[0] as
      | { canPlan?: boolean; canRun?: boolean }
      | undefined;

    expect(harness.getLatestResult()?.hasDraftProjectionGap).toBe(false);
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: true,
      })
    );
    expect(latestExecutionCall?.canPlan).toBe(true);
    expect(latestExecutionCall?.canRun).toBe(true);
  });

  it('surfaces stale draft state when saveGraphDraft returns a CAS conflict', async () => {
    harness.state.services.workspaceService.saveGraphDraft = async () => ({
      outcome: 'conflict',
      current: buildDraftRecord(
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
    });

    await harness.renderProbe();
    await waitForAutosaveDebounce();

    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(true);
    expect(harness.getLatestResult()?.draftConflictRevision).toBe('rev-conflict');
  });

  it('treats a CAS conflict as a blocked runtime state for editing and execution', async () => {
    harness.state.services.workspaceService.saveGraphDraft = async () => ({
      outcome: 'conflict',
      current: buildDraftRecord(
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
    });

    await harness.renderProbe();
    await waitForAutosaveDebounce();

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
