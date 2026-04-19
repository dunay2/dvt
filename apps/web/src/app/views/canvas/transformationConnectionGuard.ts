import type { Edge } from '@xyflow/react';
import type { CanonicalNode, CoreNodeRole } from '../../types/canonical';

export type TransformationConnectionGuardReasonCode =
  | 'invalid_edge_order'
  | 'edge_count_exceeded'
  | 'duplicate_edge';

type TransformationConnectionGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      reasonCode: TransformationConnectionGuardReasonCode;
    };

type GuardArgs = {
  sourceNode: CanonicalNode;
  targetNode: CanonicalNode;
  canonicalNodes: Iterable<CanonicalNode>;
  edges: Edge[];
};

const ALLOWED_ROLES = new Set<CoreNodeRole>(['input', 'transform', 'output']);

function isConstrainedTransformationGraph(canonicalNodes: CanonicalNode[]): boolean {
  return canonicalNodes.length === 3 && canonicalNodes.every((node) => ALLOWED_ROLES.has(node.role));
}

function isAllowedTransformationEdge(sourceRole: CoreNodeRole, targetRole: CoreNodeRole): boolean {
  return (
    (sourceRole === 'input' && targetRole === 'transform') ||
    (sourceRole === 'transform' && targetRole === 'output')
  );
}

export function guardTransformationConnection({
  sourceNode,
  targetNode,
  canonicalNodes,
  edges,
}: GuardArgs): TransformationConnectionGuardResult {
  const scopedNodes = Array.from(canonicalNodes);
  if (!isConstrainedTransformationGraph(scopedNodes)) {
    return { allowed: true };
  }

  if (!isAllowedTransformationEdge(sourceNode.role, targetNode.role)) {
    return {
      allowed: false,
      reasonCode: 'invalid_edge_order',
    };
  }

  if (edges.length >= 2) {
    return {
      allowed: false,
      reasonCode: 'edge_count_exceeded',
    };
  }

  const duplicateEdge = edges.some(
    (edge) => edge.source === sourceNode.id && edge.target === targetNode.id
  );
  if (duplicateEdge) {
    return {
      allowed: false,
      reasonCode: 'duplicate_edge',
    };
  }

  return { allowed: true };
}
