/** Owned concern: keep Model-local relation identity independent of revision-bound locators. */
import { useState } from 'react';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import { flattenCanvasRelationalTree } from './canvasRelationalTreeWorkbenchModel';

export function useCanvasRelationalSelection(
  modelId: string,
  projection: CanvasRelationalTreeProjection | null
) {
  const [selection, setSelection] = useState<{
    modelId: string;
    relationId: string | null;
    locator: string | null;
  } | null>(null);
  const current = selection?.modelId === modelId ? selection : null;
  const nodes = projection == null ? [] : flattenCanvasRelationalTree(projection.root);
  const selectedNode =
    nodes.find((node) =>
      current?.relationId != null
        ? node.relationId === current.relationId
        : node.locator === current?.locator
    ) ??
    projection?.root ??
    null;
  const selectRelation = (relationId: string | null) =>
    setSelection({ modelId, relationId, locator: null });
  const selectTreeNode = (locator: string) =>
    setSelection({
      modelId,
      locator,
      relationId: nodes.find((node) => node.locator === locator)?.relationId ?? null,
    });
  return {
    selectedNode,
    selectedLocator: selectedNode?.locator ?? '',
    // A newly authored relation need not exist in the applied projection yet.
    selectedRelationId: current?.relationId ?? selectedNode?.relationId ?? null,
    selectRelation,
    selectTreeNode,
  };
}
