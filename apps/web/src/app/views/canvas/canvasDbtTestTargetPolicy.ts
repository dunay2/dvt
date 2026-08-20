/** Owned concern: resolve the canonical DBT model targets connected to a DBT test. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export function readDeclaredDbtModelColumnNames(
  node: CanonicalNode | undefined
): readonly string[] {
  if (!node || !Array.isArray(node.metadata?.columns)) return [];

  const names = node.metadata.columns.flatMap((column) => {
    if (column === null || typeof column !== 'object' || Array.isArray(column)) return [];
    const name = 'name' in column && typeof column.name === 'string' ? column.name.trim() : '';
    return name.length > 0 ? [name] : [];
  });

  return [...new Set(names)];
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
    .filter((node): node is CanonicalNode => node?.pluginId === 'dbt' && node.kind === 'dbt:model');

  return [...new Map(connectedModels.map((node) => [node.id, node])).values()];
}
