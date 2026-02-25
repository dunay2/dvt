/**
 * Computes topological depth for selected DAG.
 * ADR baseline: ADR-0004-security-limits (maxDepth)
 */
import type { BuiltGraph } from './GraphBuilder.js';

/**
 * Returns the maximum number of nodes on a path within the selected subgraph.
 * For a single node, depth is 1.
 */
export function computeTopoDepth(
  graph: BuiltGraph,
  topo: readonly string[],
  selectedSet: ReadonlySet<string>
): number {
  const depthById = new Map<string, number>();

  let maxDepth = 0;
  for (const id of topo) {
    const node = graph.nodesById.get(id);
    if (!node) continue;

    let bestParent = 0;
    for (const dep of node.dependsOn) {
      if (!selectedSet.has(dep)) continue;
      const d = depthById.get(dep) ?? 0;
      if (d > bestParent) bestParent = d;
    }

    const dHere = bestParent + 1;
    depthById.set(id, dHere);
    if (dHere > maxDepth) maxDepth = dHere;
  }

  return maxDepth;
}
