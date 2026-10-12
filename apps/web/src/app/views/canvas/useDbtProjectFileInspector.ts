/**
Owned concern: retain only an already-admitted file inspector while graph analysis is unconfirmed.
@baseline InspectCanvasNode: analysis failure is not confirmation that the inspected file was removed.
@decision Fence transient inspector continuity by authority key, node identity and fresh membership.
@consequence The same editor can repair invalid SQL without retaining graph or execution admission.
@version 1.0.0
 */
import { useEffect, useState } from 'react';
import type { CanonicalNode } from '../../types/canonical';

export function useDbtProjectFileInspector({
  authorityKey,
  inspectorNodeId,
  analysisFresh,
  nodesById,
}: Readonly<{
  authorityKey: string;
  inspectorNodeId: string | null;
  analysisFresh: boolean;
  nodesById: ReadonlyMap<string, CanonicalNode>;
}>): CanonicalNode | null {
  const current = inspectorNodeId == null ? null : (nodesById.get(inspectorNodeId) ?? null);
  const [retained, setRetained] = useState<Readonly<{
    authorityKey: string;
    node: CanonicalNode;
  }> | null>(null);

  useEffect(() => {
    setRetained((previous) => {
      if (analysisFresh) {
        return current?.path?.trim() ? { authorityKey, node: current } : null;
      }
      return previous?.authorityKey === authorityKey && previous.node.id === inspectorNodeId
        ? previous
        : null;
    });
  }, [analysisFresh, authorityKey, current, inspectorNodeId]);

  if (
    analysisFresh ||
    retained == null ||
    retained.authorityKey !== authorityKey ||
    retained.node.id !== inspectorNodeId
  ) {
    return current;
  }
  return current ?? retained.node;
}
