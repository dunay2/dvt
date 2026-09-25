/** Derive the draft graph and reconcile selection after an atomic relation replacement. */
import { useEffect, useMemo } from 'react';
import { projectCanvasRelationalTreeAuthoringDraft } from './canvasRelationalTreeAuthoringProjection';
import { flattenCanvasRelationalTree } from './canvasRelationalTreeWorkbenchModel';

export function useCanvasRelationalDraftProjection(
  args: Parameters<typeof projectCanvasRelationalTreeAuthoringDraft>[0],
  selectedRelationId: string | null,
  onSelect: (relationId: string | null) => void
) {
  const { edges, joinDraft, nodes, operation, transformNode } = args;
  const projection = useMemo(
    () =>
      projectCanvasRelationalTreeAuthoringDraft({
        edges,
        joinDraft,
        nodes,
        operation,
        transformNode,
      }),
    [edges, joinDraft, nodes, operation, transformNode]
  );
  const tree = useMemo(
    () => (projection == null ? [] : flattenCanvasRelationalTree(projection.root)),
    [projection]
  );
  const selected = tree.find((node) => node.relationId === selectedRelationId);
  const rootId = projection?.root.relationId ?? null;
  const selectedId = selected?.relationId ?? null;
  useEffect(() => {
    if (selectedId == null && rootId != null) onSelect(rootId);
  }, [onSelect, rootId, selectedId]);
  return {
    projection,
    selectedLocator: selected?.locator ?? '',
    relationIdFor: (locator: string) =>
      tree.find((node) => node.locator === locator)?.relationId ?? null,
  };
}
