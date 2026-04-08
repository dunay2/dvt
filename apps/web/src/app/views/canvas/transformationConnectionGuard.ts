import type { Edge } from '@xyflow/react';
import type { CanonicalNode, CoreNodeRole } from '../../types/canonical';

type TransformationConnectionGuardResult =
  | { allowed: true }
  | { allowed: false; reason: string };

type GuardArgs = {
  sourceNode: CanonicalNode;
  targetNode: CanonicalNode;
  canonicalNodes: Iterable<CanonicalNode>;
  edges: Edge[];
};

const ALLOWED_ROLES: ReadonlySet<CoreNodeRole> = new Set(['input', 'transform', 'output']);

function isConstrainedTransformationGraph(canonicalNodes: CanonicalNode[]): boolean {
  return (
    canonicalNodes.length === 3 &&
    canonicalNodes.every((node) => ALLOWED_ROLES.has(node.role as CoreNodeRole))
  );
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
      reason: 'Plan edges must follow source -> sql_transform -> sink.',
    };
  }

  if (edges.length >= 2) {
    return {
      allowed: false,
      reason: 'Plan requires exactly 2 edges: source -> sql_transform and sql_transform -> sink.',
    };
  }

  const duplicateEdge = edges.some(
    (edge) => edge.source === sourceNode.id && edge.target === targetNode.id
  );
  if (duplicateEdge) {
    return {
      allowed: false,
      reason: 'Dependency already exists in this transformation draft.',
    };
  }

  return { allowed: true };
}
