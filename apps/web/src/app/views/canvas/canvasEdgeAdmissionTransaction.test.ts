import type { Connection, Edge } from '@xyflow/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  resolveCanvasEdgeConfirmationTransaction,
  resolveCanvasEdgeReconnectTransaction,
} from './canvasEdgeAdmissionTransaction';

function buildCanonicalNode(
  id: string,
  role: CanonicalNode['role'],
  kind: CanonicalNode['kind']
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

function buildDraftSession(
  visibleEdges: CanvasDraftSession['workingSet']['visibleEdges'] = []
): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
    },
    draftRevision: 'rev-1',
    workingSet: {
      visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
      visibleEdges,
      pendingExplicitNodeIds: [],
    },
  } satisfies CanvasDraftSession;
}

const pluginPortMap = new Map([
  [
    'dvt',
    {
      connectionRules: [],
      produces: [],
      consumes: [],
    },
  ],
]) satisfies PluginPortMap;

describe('canvasEdgeAdmissionTransaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('confirms an edge with the next viewport edges and draft visible edges together', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const canonicalNodesById = new Map([
      ['source-node', buildCanonicalNode('source-node', 'input', 'dvt:source')],
      ['sink-node', buildCanonicalNode('sink-node', 'output', 'dvt:sink')],
    ]);
    const connection: Connection = {
      source: 'source-node',
      sourceHandle: null,
      target: 'sink-node',
      targetHandle: null,
    };

    const transaction = resolveCanvasEdgeConfirmationTransaction({
      canonicalNodesById,
      connection,
      draftSession: buildDraftSession(),
      edges: [],
      pluginPortMap,
    });

    expect(transaction.outcome).toBe('confirmed');
    if (transaction.outcome !== 'confirmed') {
      throw new Error('Expected a confirmed edge transaction');
    }
    expect(transaction.edges).toMatchObject([
      {
        id: 'source-node->sink-node:123',
        source: 'source-node',
        target: 'sink-node',
      },
    ]);
    expect(transaction.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source-node', targetId: 'sink-node' },
    ]);
  });

  it('reconnects an edge with a stable edge identity and draft visible edges together', () => {
    const canonicalNodesById = new Map([
      ['source-node', buildCanonicalNode('source-node', 'input', 'dvt:source')],
      [
        'transform-node',
        buildCanonicalNode('transform-node', 'transform', 'dvt:sql_transform'),
      ],
      ['sink-node', buildCanonicalNode('sink-node', 'output', 'dvt:sink')],
    ]);
    const edge: Edge = {
      id: 'edge-1',
      source: 'source-node',
      target: 'sink-node',
    };

    const transaction = resolveCanvasEdgeReconnectTransaction({
      canonicalNodesById,
      connection: {
        source: 'source-node',
        sourceHandle: null,
        target: 'transform-node',
        targetHandle: null,
      },
      draftSession: buildDraftSession([{ sourceId: 'source-node', targetId: 'sink-node' }]),
      edge,
      edges: [edge],
      pluginPortMap,
    });

    expect(transaction.outcome).toBe('reconnected');
    if (transaction.outcome !== 'reconnected') {
      throw new Error('Expected a reconnected edge transaction');
    }
    expect(transaction.edges).toEqual([
      {
        id: 'edge-1',
        source: 'source-node',
        sourceHandle: null,
        target: 'transform-node',
        targetHandle: null,
      },
    ]);
    expect(transaction.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source-node', targetId: 'transform-node' },
    ]);
  });
});
