/** Owned concern: compute pure Canvas node-admission transactions for graph handlers. */
import type { Node } from '@xyflow/react';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import { admitCanonicalNodeToCanvas } from './canvasNodeDropAggregate';
import { mapDroppedCanonicalNodeToCanvasNode } from './canvasNodeMapper';

type ResolveCanvasNodeAdmissionTransactionArgs = {
  canonicalNode: CanonicalNode;
  draftSession: CanvasDraftSession;
  existingNodes: readonly Node[];
  position: { x: number; y: number };
  columnLevelLineageEnabled: boolean;
};

export type CanvasNodeAdmissionTransaction =
  | {
      outcome: 'noop';
      reason: string;
    }
  | {
      outcome: 'added';
      canonicalNode: CanonicalNode;
      nodes: Node[];
      draftSession: CanvasDraftSession;
    };

export function resolveCanvasNodeAdmissionTransaction({
  canonicalNode,
  draftSession,
  existingNodes,
  position,
  columnLevelLineageEnabled,
}: ResolveCanvasNodeAdmissionTransactionArgs): CanvasNodeAdmissionTransaction {
  const admission = admitCanonicalNodeToCanvas({
    canonicalNode,
    visibleNodeIds: draftSession.workingSet.visibleNodeIds,
  });

  if (admission.outcome === 'noop') {
    return {
      outcome: 'noop',
      reason: admission.reason,
    };
  }

  return {
    outcome: 'added',
    canonicalNode: admission.canonicalNode,
    nodes: [
      ...existingNodes,
      mapDroppedCanonicalNodeToCanvasNode(
        admission.canonicalNode,
        position,
        columnLevelLineageEnabled
      ),
    ],
    draftSession: canvasGraphLifecycle.node.admitExplicit(
      draftSession,
      admission.canonicalNode
    ),
  };
}
