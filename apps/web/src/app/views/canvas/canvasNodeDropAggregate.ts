import type { Node } from '@xyflow/react';

import type { CanvasGraphStrategy } from '../../plugins/graphStrategyContracts';
import type { CanonicalNode, CoreNodeRole } from '../../types/canonical';
import { mapDroppedCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { canvasViewCopy } from './copy';
import { guardTransformationAuthoringNode } from './transformationAuthoringGuard';

function resolveExistingRoles(nodes: Node[]): CoreNodeRole[] {
  return nodes
    .map((node) => node.data)
    .map((data) => (data && typeof data === 'object' ? (data as { role?: unknown }).role : null))
    .filter(
      (role): role is CoreNodeRole =>
        role === 'input' ||
        role === 'transform' ||
        role === 'check' ||
        role === 'output' ||
        role === 'control'
    );
}

type DropCanonicalNodeArgs = {
  canonicalNode: CanonicalNode;
  position: { x: number; y: number };
  nodes: Node[];
  graphStrategy: CanvasGraphStrategy;
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
    }
  | {
      outcome: 'rejected';
      reason: string;
    };

export function dropCanonicalNode({
  canonicalNode,
  position,
  nodes,
  graphStrategy,
  columnLevelLineageEnabled,
}: DropCanonicalNodeArgs): DropCanonicalNodeResult {
  if (nodes.some((node) => node.id === canonicalNode.id)) {
    return { outcome: 'noop', reason: canvasViewCopy.nodeAlreadyOnCanvasMessage };
  }

  const authoringGuard = guardTransformationAuthoringNode({
    enforceTransformationTopology: graphStrategy.authoringPolicy.enforceTransformationTopology,
    existingRoles: resolveExistingRoles(nodes),
    nextRole: canonicalNode.role,
  });
  if (!authoringGuard.allowed) {
    return { outcome: 'rejected', reason: authoringGuard.reason };
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
