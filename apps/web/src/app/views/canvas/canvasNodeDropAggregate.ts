import type { Node } from '@xyflow/react';

import type { CanonicalNode } from '../../types/canonical';
import { mapDroppedCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { canvasViewCopy } from './copy';

type DropCanonicalNodeArgs = {
  canonicalNode: CanonicalNode;
  position: { x: number; y: number };
  nodes: Node[];
  columnLevelLineageEnabled: boolean;
};

export type DropCanonicalNodeResult =
  | {
      outcome: 'added';
      nextNodes: Node[];
    }
  | {
      outcome: 'noop';
      reason: string;
    };

export function dropCanonicalNode({
  canonicalNode,
  position,
  nodes,
  columnLevelLineageEnabled,
}: DropCanonicalNodeArgs): DropCanonicalNodeResult {
  if (nodes.some((node) => node.id === canonicalNode.id)) {
    return { outcome: 'noop', reason: canvasViewCopy.nodeAlreadyOnCanvasMessage };
  }

  const newNode = mapDroppedCanonicalNodeToCanvasNode(
    canonicalNode,
    position,
    columnLevelLineageEnabled
  );

  return {
    outcome: 'added',
    nextNodes: [...nodes, newNode],
  };
}
