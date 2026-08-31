import type {
  ScopedTransformationGraph,
  TransformationValidationContext,
  ValidateTransformationGraphArgs,
} from './transformationGraphValidation.types';
import { TRANSFORMATION_REQUIRED_NODE_COUNT } from './transformationGraphValidation.types';

function resolveScopeNodeIds({
  nodes,
  selectedNodeIds,
  workspaceNodeIds,
}: ValidateTransformationGraphArgs): readonly string[] {
  if (
    selectedNodeIds?.length === TRANSFORMATION_REQUIRED_NODE_COUNT ||
    selectedNodeIds?.length === TRANSFORMATION_REQUIRED_NODE_COUNT + 1
  ) {
    return selectedNodeIds;
  }

  if (workspaceNodeIds?.length) {
    return workspaceNodeIds;
  }

  return nodes.map((node) => node.id);
}

function scopeTransformationGraph(
  nodes: ValidateTransformationGraphArgs['nodes'],
  edges: ValidateTransformationGraphArgs['edges'],
  scopeNodeIds: readonly string[]
): ScopedTransformationGraph {
  const scopedNodeIdSet = new Set(scopeNodeIds);
  const scopedNodes = nodes.filter((node) => scopedNodeIdSet.has(node.id));
  const scopedNodeIds = scopedNodes.map((node) => node.id);
  const resolvedScopedNodeIdSet = new Set(scopedNodeIds);
  const scopedEdges = edges.filter(
    (edge) =>
      resolvedScopedNodeIdSet.has(edge.sourceId) && resolvedScopedNodeIdSet.has(edge.targetId)
  );

  return {
    scopedNodes,
    scopedNodeIds,
    scopedEdges,
    scopedEdgeIds: scopedEdges.map((edge) => edge.id),
  };
}

export function resolveTransformationValidationContext(
  args: ValidateTransformationGraphArgs
): TransformationValidationContext {
  const scopeNodeIds = resolveScopeNodeIds(args);

  return {
    allNodes: args.nodes,
    allEdges: args.edges,
    ...scopeTransformationGraph(args.nodes, args.edges, scopeNodeIds),
  };
}
