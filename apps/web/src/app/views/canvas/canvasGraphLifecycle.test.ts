import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import type { CanvasDraftSession } from './canvasDraftSession';
import { canvasGraphLifecycle, type CanvasGraphLifecycleState } from './canvasGraphLifecycle';

function buildDraftSession(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
    },
    draftRevision: 'rev-1',
    workingSet: {
      visibleNodeIds: ['source-node', 'sink-node'],
      visibleEdges: [{ sourceId: 'source-node', targetId: 'sink-node' }],
      pendingExplicitNodeIds: [],
    },
  };
}

function buildNodes(): Node[] {
  return [
    { id: 'source-node', data: { name: 'source-node' }, position: { x: 0, y: 0 } },
    { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
  ];
}

function buildEdges(): Edge[] {
  return [{ id: 'edge-1', source: 'source-node', target: 'sink-node' }];
}

function buildState(): CanvasGraphLifecycleState {
  return {
    draftSession: buildDraftSession(),
    nodes: buildNodes(),
    edges: buildEdges(),
    selectedNodeIds: ['source-node', 'sink-node'],
    inspectorNodeId: 'source-node',
  };
}

describe('canvasGraphLifecycle', () => {
  it('replaces visible edges on the draft aggregate from canvas edges', () => {
    const nextSession = canvasGraphLifecycle.edge.replaceVisible(buildDraftSession(), [
      { id: 'edge-2', source: 'sink-node', target: 'source-node' },
    ]);

    expect(nextSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'sink-node', targetId: 'source-node' },
    ]);
  });

  it('admits an explicit node through the aggregate owner', () => {
    const nextSession = canvasGraphLifecycle.node.admitExplicit(buildDraftSession(), {
      id: 'transform-node',
      name: 'transform-node',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      path: 'models/transform.sql',
    });

    expect(nextSession.workingSet.visibleNodeIds).toEqual([
      'source-node',
      'sink-node',
      'transform-node',
    ]);
    expect(nextSession.localNodeCatalog?.['transform-node']).toEqual(
      expect.objectContaining({
        id: 'transform-node',
      })
    );
  });

  it('queues imported source nodes through the aggregate owner', () => {
    const nextSession = canvasGraphLifecycle.node.queueImported(buildDraftSession(), [
      'transform-node',
      'source-node',
    ]);

    expect(nextSession.workingSet.pendingExplicitNodeIds).toEqual(['transform-node']);
  });

  it('removes a node from visible graph, ui fallout, and draft session in one command', () => {
    const result = canvasGraphLifecycle.node.remove(buildState(), 'source-node');

    expect(result.outcome).toBe('removed');
    if (result.outcome !== 'removed') {
      return;
    }

    expect(result.removedNodeName).toBe('source-node');
    expect(result.state.nodes.map((node) => node.id)).toEqual(['sink-node']);
    expect(result.state.edges).toEqual([]);
    expect(result.state.selectedNodeIds).toEqual(['sink-node']);
    expect(result.state.inspectorNodeId).toBeNull();
    expect(result.state.draftSession.workingSet.visibleNodeIds).toEqual(['sink-node']);
    expect(result.state.draftSession.workingSet.visibleEdges).toEqual([]);
  });

  it('preserves unrelated inspector state when removing a different node', () => {
    const result = canvasGraphLifecycle.node.remove(
      {
        ...buildState(),
        selectedNodeIds: ['source-node'],
        inspectorNodeId: 'sink-node',
      },
      'source-node'
    );

    expect(result.outcome).toBe('removed');
    if (result.outcome !== 'removed') {
      return;
    }

    expect(result.state.inspectorNodeId).toBe('sink-node');
  });

  it('returns noop when the node is already absent', () => {
    const state = buildState();

    const result = canvasGraphLifecycle.node.remove(state, 'missing-node');

    expect(result).toEqual({
      outcome: 'noop',
      state,
    });
  });

  it('applies node position changes without mutating unrelated lifecycle state', () => {
    const state = buildState();

    const nextState = canvasGraphLifecycle.node.applyChanges(state, [
      {
        id: 'source-node',
        type: 'position',
        position: { x: 42, y: 24 },
      },
    ]);

    expect(nextState.nodes.find((node) => node.id === 'source-node')?.position).toEqual({
      x: 42,
      y: 24,
    });
    expect(nextState.edges).toBe(state.edges);
    expect(nextState.draftSession).toBe(state.draftSession);
    expect(nextState.selectedNodeIds).toBe(state.selectedNodeIds);
    expect(nextState.inspectorNodeId).toBe(state.inspectorNodeId);
  });

  it('applies edge changes through the lifecycle component and updates visible edge truth', () => {
    const nextState = canvasGraphLifecycle.edge.applyChanges(buildState(), [
      {
        id: 'edge-1',
        type: 'remove',
      },
    ]);

    expect(nextState.edges).toEqual([]);
    expect(nextState.draftSession.workingSet.visibleEdges).toEqual([]);
  });
});
