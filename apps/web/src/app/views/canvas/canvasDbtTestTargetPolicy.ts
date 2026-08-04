/** Owned concern: resolve the canonical DBT model targets connected to a DBT test. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export function resolveConnectedDbtTestTargets(args: {
  testNodeId: string;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): readonly CanonicalNode[] {
  const nodesById = new Map(args.nodes.map((node) => [node.id, node]));
  const connectedModels = args.edges
    .filter((edge) => edge.targetId === args.testNodeId)
    .map((edge) => nodesById.get(edge.sourceId))
    .filter((node): node is CanonicalNode => node?.pluginId === 'dbt' && node.kind === 'dbt:model');

  return [...new Map(connectedModels.map((node) => [node.id, node])).values()];
}
