import { describe, expect, it } from 'vitest';

import type { CanvasDraftSession } from './canvasDraftSession';
import {
  areNodeIdsEqual,
  deriveExecutionScope,
  deriveVisibleScope,
  reconcileUiScope,
} from './canvasDraftScope';

const draftSession: CanvasDraftSession = {
  syncState: 'editing',
  baseline: {
    record: null,
  },
  draftRevision: null,
  workingSet: {
    visibleNodeIds: ['node_2', 'node_1'],
    visibleEdges: [
      { sourceId: 'node_2', targetId: 'node_1' },
      { sourceId: 'node_1', targetId: 'node_3' },
    ],
    pendingExplicitNodeIds: ['node_pending'],
  },
};

describe('canvasDraftScope', () => {
  it('derives visible scope from the draft working set instead of the full snapshot', () => {
    const visibleScope = deriveVisibleScope({
      draftSession,
      canonicalNodes: [
        {
          id: 'node_1',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
        {
          id: 'node_2',
          name: 'customers',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
        {
          id: 'node_3',
          name: 'payments',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      canonicalEdges: [
        { id: 'edge_1', sourceId: 'node_2', targetId: 'node_1', relation: 'lineage' },
      ],
    });

    expect(visibleScope.visibleNodeIds).toEqual(['node_2', 'node_1']);
    expect(visibleScope.canonicalNodes.map((node) => node.id)).toEqual(['node_2', 'node_1']);
    expect(visibleScope.visibleEdges).toEqual([{ sourceId: 'node_2', targetId: 'node_1' }]);
    expect(visibleScope.canonicalEdges).toEqual([
      { id: 'edge_1', sourceId: 'node_2', targetId: 'node_1', relation: 'lineage' },
    ]);
    expect(visibleScope.unresolvedNodeIds).toEqual([]);
    expect(visibleScope.unresolvedEdges).toEqual([{ sourceId: 'node_1', targetId: 'node_3' }]);
    expect(visibleScope.isProjectionComplete).toBe(false);
  });

  it('derives execution scope from the visible draft subset and filters hidden selections', () => {
    const visibleScope = deriveVisibleScope({
      draftSession,
      canonicalNodes: [
        {
          id: 'node_1',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
        {
          id: 'node_2',
          name: 'customers',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      canonicalEdges: [
        { id: 'edge_1', sourceId: 'node_2', targetId: 'node_1', relation: 'lineage' },
      ],
    });

    const executionScope = deriveExecutionScope({
      visibleNodeIds: visibleScope.visibleNodeIds,
      selectionIntent: {
        mode: 'explicit',
        nodeIds: ['node_hidden', 'node_2'],
      },
    });

    expect(executionScope.selectionMode).toBe('explicit');
    expect(executionScope.requestedNodeIds).toEqual(['node_hidden', 'node_2']);
    expect(executionScope.selectedNodeIds).toEqual(['node_2']);
    expect(executionScope.workspaceNodeIds).toEqual(['node_2', 'node_1']);
  });

  it('keeps pending explicit ids in UI scope while pruning hidden stale ids', () => {
    const visibleScope = deriveVisibleScope({
      draftSession,
      canonicalNodes: [
        {
          id: 'node_1',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
        {
          id: 'node_2',
          name: 'customers',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      canonicalEdges: [
        { id: 'edge_1', sourceId: 'node_2', targetId: 'node_1', relation: 'lineage' },
      ],
    });

    const uiScope = reconcileUiScope({
      visibleScope,
      pendingExplicitNodeIds: ['node_pending'],
      selectedNodeIds: ['node_hidden', 'node_pending', 'node_1'],
      inspectorNodeId: 'node_pending',
    });

    expect(uiScope.selectedNodeIds).toEqual(['node_pending', 'node_1']);
    expect(uiScope.inspectorNodeId).toBe('node_pending');
  });

  it('reports projection completeness once the working set fully maps onto the canonical graph', () => {
    const visibleScope = deriveVisibleScope({
      draftSession: {
        ...draftSession,
        workingSet: {
          visibleNodeIds: ['node_1', 'node_2'],
          visibleEdges: [{ sourceId: 'node_2', targetId: 'node_1' }],
          pendingExplicitNodeIds: [],
        },
      },
      canonicalNodes: [
        {
          id: 'node_1',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
        {
          id: 'node_2',
          name: 'customers',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      canonicalEdges: [
        { id: 'edge_1', sourceId: 'node_2', targetId: 'node_1', relation: 'lineage' },
      ],
    });

    expect(visibleScope.unresolvedNodeIds).toEqual([]);
    expect(visibleScope.unresolvedEdges).toEqual([]);
    expect(visibleScope.isProjectionComplete).toBe(true);
  });

  it('compares node id arrays by order and value', () => {
    expect(areNodeIdsEqual(['node_1', 'node_2'], ['node_1', 'node_2'])).toBe(true);
    expect(areNodeIdsEqual(['node_1', 'node_2'], ['node_2', 'node_1'])).toBe(false);
  });
});
