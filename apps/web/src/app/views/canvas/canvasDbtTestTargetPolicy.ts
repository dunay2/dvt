/** Owned concern: resolve the canonical DBT model targets connected to a DBT test. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';

export function readEffectiveDbtModelColumnNames(args: {
  node: CanonicalNode | undefined;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): readonly string[] {
  if (args.node == null || !isDbtCompatibleModel(args.node)) return [];

  return [
    ...new Set(
      projectCanvasNodePresentationTruth({
        node: args.node,
        nodes: args.nodes,
        edges: args.edges,
      }).columns.visible.map((column) => column.name)
    ),
  ];
}

export function resolveConnectedDbtTestTargets(args: {
  testNodeId: string;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): readonly CanonicalNode[] {
  const nodesById = new Map(args.nodes.map((node) => [node.id, node]));
  const connectedModels = args.edges
    .filter((edge) => edge.targetId === args.testNodeId)
    .map((edge) => nodesById.get(edge.sourceId))
    .filter((node): node is CanonicalNode => node != null && isDbtCompatibleModel(node));

  return [...new Map(connectedModels.map((node) => [node.id, node])).values()];
}
