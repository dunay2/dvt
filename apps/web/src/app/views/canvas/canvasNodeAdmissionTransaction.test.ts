import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { canvasViewCopy } from './copy';
import { resolveCanvasNodeAdmissionTransaction } from './canvasNodeAdmissionTransaction';

function buildDraftSession(visibleNodeIds: string[] = []): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
    },
    draftRevision: 'rev-1',
    workingSet: {
      visibleNodeIds,
      visibleEdges: [],
      pendingExplicitNodeIds: [],
    },
  };
}

function buildCanonicalNode(id: string): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
  };
}

describe('canvasNodeAdmissionTransaction', () => {
  it('returns an added transaction with concrete graph nodes and draft session', () => {
    const existingNodes: Node[] = [
      { id: 'source-node', data: { name: 'source-node' }, position: { x: 0, y: 0 } },
    ];

    const transaction = resolveCanvasNodeAdmissionTransaction({
      canonicalNode: buildCanonicalNode('transform-node'),
      draftSession: buildDraftSession(['source-node']),
      existingNodes,
      position: { x: 120, y: 80 },
      columnLevelLineageEnabled: false,
    });

    expect(transaction.outcome).toBe('added');
    if (transaction.outcome !== 'added') {
      return;
    }

    expect(transaction.nodes.map((node) => node.id)).toEqual(['source-node', 'transform-node']);
    expect(transaction.nodes).not.toBe(existingNodes);
    expect(transaction.draftSession.workingSet.visibleNodeIds).toEqual([
      'source-node',
      'transform-node',
    ]);
    expect(transaction.draftSession.localNodeCatalog?.['transform-node']).toEqual(
      expect.objectContaining({ id: 'transform-node' })
    );
  });

  it('passes column-level lineage posture into the created viewport node', () => {
    const transaction = resolveCanvasNodeAdmissionTransaction({
      canonicalNode: {
        ...buildCanonicalNode('transform-node'),
        metadata: {
          columns: [{ name: 'customer_id', type: 'varchar' }],
        },
      },
      draftSession: buildDraftSession(),
      existingNodes: [],
      position: { x: 120, y: 80 },
      columnLevelLineageEnabled: true,
    });

    expect(transaction.outcome).toBe('added');
    if (transaction.outcome !== 'added') {
      return;
    }

    expect(transaction.nodes[0]?.data).toEqual(
      expect.objectContaining({
        showColumns: true,
        columns: [{ name: 'customer_id', type: 'varchar' }],
      })
    );
  });

  it('returns noop without graph or draft fallouts for duplicate visible nodes', () => {
    const transaction = resolveCanvasNodeAdmissionTransaction({
      canonicalNode: buildCanonicalNode('transform-node'),
      draftSession: buildDraftSession(['transform-node']),
      existingNodes: [],
      position: { x: 120, y: 80 },
      columnLevelLineageEnabled: false,
    });

    expect(transaction).toEqual({
      outcome: 'noop',
      reason: canvasViewCopy.nodeAlreadyOnCanvasMessage,
    });
  });
});
