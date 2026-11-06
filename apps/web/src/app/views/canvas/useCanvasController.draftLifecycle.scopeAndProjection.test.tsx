import { afterEach, describe, expect, it } from 'vitest';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  createUnrenderedHarness,
  setHarnessRemoteDraftRecord,
  type CanvasControllerHarness,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import type { UseCanvasExecutionActionsParams } from './canvasExecutionActions.types';
import { projectCanonicalNodeToAuthoringNode } from './canvasDraftAuthoring';
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';
import { createCanvasNodeInstance } from './canvasNodeInstance';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

function readLatestExecutionCall(
  harness: CanvasControllerHarness
):
  | Pick<
      UseCanvasExecutionActionsParams,
      | 'canonicalNodes'
      | 'canonicalEdges'
      | 'selectionIntent'
      | 'workspaceNodeIds'
      | 'canPlan'
      | 'runAdmission'
    >
  | undefined {
  return harness.mocks.useCanvasExecutionActions.mock.calls.at(-1)?.[0];
}

function expectSelectionPrunedToVisibleScope(harness: CanvasControllerHarness): void {
  expect(harness.state.store.setSelectedNodes).toHaveBeenCalledWith([]);
  expect(harness.state.store.setInspectorNode).toHaveBeenCalledWith(null);
  expect(harness.getLatestResult()?.inspectorNode).toBeNull();
}

function expectTransformationExecutionScopeSubset(harness: CanvasControllerHarness): void {
  const latestExecutionCall = readLatestExecutionCall(harness);

  expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
  expect(latestExecutionCall?.canonicalNodes?.map((node) => node.id)).toEqual(['node_1']);
  expect(latestExecutionCall?.canonicalEdges).toEqual([]);
  expect(latestExecutionCall?.selectionIntent).toEqual({ mode: 'workspace', nodeIds: [] });
  expect(latestExecutionCall?.workspaceNodeIds).toEqual(['node_1']);
}

function configureProtectedSemanticProjectionHarness(harness: CanvasControllerHarness): void {
  harness.state.canonicalNodes = [
    ...harness.state.canonicalNodes,
    {
      id: 'node_remote_only',
      name: 'remote_only',
      pluginId: 'dvt',
      kind: 'dvt:transform',
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
  setHarnessRemoteDraftRecord(
    harness,
    buildRemoteDraftRecord(
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
    )
  );
}

function expectProtectedSemanticProjectionState(
  harness: CanvasControllerHarness,
  expectedCanEditEdges: boolean,
  expectedCanPlan: boolean
): void {
  const latestExecutionCall = readLatestExecutionCall(harness);

  expect(harness.getLatestResult()?.hasDraftProjectionGap).toBe(false);
  expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
    expect.objectContaining({
      canEditEdges: expectedCanEditEdges,
    })
  );
  expect(latestExecutionCall?.canPlan).toBe(expectedCanPlan);
  expect(latestExecutionCall?.runAdmission.allowed).toBe(expectedCanPlan);
}

describe('useCanvasController draft lifecycle scope and projection', () => {
  let harness: CanvasControllerHarness | null = null;

  afterEach(() => {
    harness?.cleanup();
    harness = null;
  });

  it('plans a placed Source reference while keeping its definition outside executable scope', async () => {
    const graph = occurrenceGraph();
    const instance = createCanvasNodeInstance(graph.source, new Set(), 'placed-source');
    const nodes = [graph.source, instance, graph.targetNode];
    const edge = { ...graph.edges[0]!, sourceId: instance.id };
    const nodeIds = [instance.id, graph.targetNode.id];
    const baseline = buildRemoteDraftRecord({
      nodeIds,
      nodePositions: { [instance.id]: { x: 0, y: 0 }, [graph.targetNode.id]: { x: 240, y: 0 } },
      edges: [edge],
    });
    const authoringNodes = nodes.map(projectCanonicalNodeToAuthoringNode);
    harness = createUnrenderedHarness();
    harness.state.canonicalNodes = nodes;
    harness.state.canonicalEdges = [edge];
    setHarnessRemoteDraftRecord(harness, {
      ...baseline,
      draft: {
        ...baseline.draft,
        nodes: authoringNodes,
        canvases: baseline.draft.canvases!.map((canvas) => ({ ...canvas, nodes: authoringNodes })),
      },
    });
    harness.state.store.setExecutionSelectionIntent({
      mode: 'explicit',
      nodeIds: [graph.targetNode.id],
    });

    await harness.renderProbe();
    await harness.renderProbe();

    const execution = readLatestExecutionCall(harness)!;
    const input = { ...execution, canvasId: baseline.draft.canvas.id ?? null };
    expect(buildProtectedDvtPreviewProjection(input)).toMatchObject({
      ok: true,
      selection: { mode: 'upstream', nodeIds: [graph.targetNode.id] },
      scopedNodeIds: [...nodeIds].sort(),
    });
    expect(execution.workspaceNodeIds).toEqual(nodeIds);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(nodeIds);
    expect(execution.canonicalEdges).toEqual([
      expect.objectContaining({
        sourceId: instance.id,
        targetId: graph.targetNode.id,
        relation: 'lineage',
      }),
    ]);
    expect(
      buildProtectedDvtPreviewProjection({ ...input, workspaceNodeIds: [instance.id] }).ok
    ).toBe(false);
    expect(
      buildProtectedDvtPreviewProjection({
        ...input,
        canonicalNodes: input.canonicalNodes.filter((node) => node.id !== graph.source.id),
      }).ok
    ).toBe(false);
    await waitForAutosaveDebounce();
    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).not.toHaveBeenCalled();
  });

  it('scopes execution and prunes hidden selection when bootstrapping from a persisted draft subset', async () => {
    harness = await createHarnessWithDraft(
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
    harness.state.store.setExecutionSelectionIntent({
      mode: 'explicit',
      nodeIds: ['node_2'],
    });
    harness.state.store.inspectorNodeId = 'node_2';

    await harness.renderProbe();
    await harness.renderProbe();

    expectSelectionPrunedToVisibleScope(harness);
    expectTransformationExecutionScopeSubset(harness);
  });

  it('projects the full persisted draft from protected semantic truth even before snapshot hydration catches up', async () => {
    harness = createUnrenderedHarness();
    configureProtectedSemanticProjectionHarness(harness);

    await harness.renderProbe();
    await harness.renderProbe();

    expectProtectedSemanticProjectionState(harness, true, false);

    await waitForAutosaveDebounce();
    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).not.toHaveBeenCalled();

    harness.state.graphData = {
      nodes: [{ id: 'node_1' }, { id: 'node_remote_only' }],
      edges: [{ id: 'edge_remote' }],
    };

    await harness.renderProbe();

    expectProtectedSemanticProjectionState(harness, true, false);
  });
});
