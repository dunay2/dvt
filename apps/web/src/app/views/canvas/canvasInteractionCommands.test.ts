import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import type { CanvasDraftSession } from './canvasDraftSession';
import {
  admitExplicitCanvasNode,
  queueImportedCanvasSourceNodes,
  removeNodeFromCanvasWorkingSet,
  replaceCanvasVisibleEdges,
} from './canvasInteractionCommands';

function buildDraftSession(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
      signature: null,
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

describe('canvasInteractionCommands', () => {
  it('replaces visible edges on the draft aggregate from canvas edges', () => {
    const draftSession = buildDraftSession();

    const nextSession = replaceCanvasVisibleEdges(draftSession, [
      { id: 'edge-2', source: 'sink-node', target: 'source-node' },
    ]);

    expect(nextSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'sink-node', targetId: 'source-node' },
    ]);
  });

  it('admits an explicit node through the aggregate owner', () => {
    const draftSession = buildDraftSession();

    const nextSession = admitExplicitCanvasNode(draftSession, 'transform-node');

    expect(nextSession.workingSet.visibleNodeIds).toEqual([
      'source-node',
      'sink-node',
      'transform-node',
    ]);
  });

  it('queues imported source nodes through the aggregate owner', () => {
    const draftSession = buildDraftSession();

    const nextSession = queueImportedCanvasSourceNodes(draftSession, [
      'transform-node',
      'source-node',
    ]);

    expect(nextSession.workingSet.pendingExplicitNodeIds).toEqual(['transform-node']);
  });

  it('removes a node from visible graph, ui fallout, and draft session in one command', () => {
    const result = removeNodeFromCanvasWorkingSet(
      {
        draftSession: buildDraftSession(),
        nodes: buildNodes(),
        edges: buildEdges(),
        selectedNodeIds: ['source-node', 'sink-node'],
        inspectorNodeId: 'source-node',
      },
      'source-node'
    );

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
    const result = removeNodeFromCanvasWorkingSet(
      {
        draftSession: buildDraftSession(),
        nodes: buildNodes(),
        edges: buildEdges(),
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
    const state = {
      draftSession: buildDraftSession(),
      nodes: buildNodes(),
      edges: buildEdges(),
      selectedNodeIds: ['source-node'],
      inspectorNodeId: null,
    };

    const result = removeNodeFromCanvasWorkingSet(state, 'missing-node');

    expect(result).toEqual({
      outcome: 'noop',
      state,
    });
  });
});
