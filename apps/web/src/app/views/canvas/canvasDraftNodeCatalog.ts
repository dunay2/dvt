/** Owned concern: resolve the visible node catalog from canonical and local draft truth. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';

export function resolveCanvasDraftNodes(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): CanonicalNode[] {
  const nodesById = new Map(canonicalNodesById);
  for (const node of Object.values(draftSession.localNodeCatalog ?? {})) {
    nodesById.set(node.id, node);
  }
  return draftSession.workingSet.visibleNodeIds.flatMap((nodeId) => {
    const node = nodesById.get(nodeId);
    return node == null ? [] : [node];
  });
}
