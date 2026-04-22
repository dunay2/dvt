/** Owned concern: derive local canonical-node catalogs from authoritative draft semantics. */

import type { WorkspaceGraphDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalNode } from '../../types/canonical';

export function buildLocalNodeCatalogFromSemanticGraph(
  semanticGraph: WorkspaceGraphDraftSemanticGraph | null,
  scopedNodeIds: readonly string[]
): Record<string, CanonicalNode> {
  if (semanticGraph == null || scopedNodeIds.length === 0) {
    return {};
  }

  const semanticNodesById = new Map(
    semanticGraph.canonicalNodes.map((node) => [node.id, node])
  );

  return Object.fromEntries(
    scopedNodeIds.flatMap((nodeId) => {
      const node = semanticNodesById.get(nodeId);
      return node == null ? [] : [[nodeId, node] as const];
    })
  );
}
