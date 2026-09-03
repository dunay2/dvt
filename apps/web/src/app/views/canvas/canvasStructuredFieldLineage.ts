/** Owned concern: expose structured leaf lineage through each root field handle. */
import type { CanvasNodePresentationColumn } from '../../components/canvas/canvasNodePresentationTruth.contract';

export type CanvasStructuredLineageLeaf = Readonly<{
  root: CanvasNodePresentationColumn;
  leaf: CanvasNodePresentationColumn;
  path: string;
}>;

export function flattenCanvasStructuredLineage(
  columns: readonly CanvasNodePresentationColumn[]
): CanvasStructuredLineageLeaf[] {
  return columns.flatMap((root) => {
    if (root.children == null) return [];
    const visit = (
      children: readonly CanvasNodePresentationColumn[],
      parentPath: string
    ): CanvasStructuredLineageLeaf[] =>
      children.flatMap((child) => {
        const path = `${parentPath}.${child.name}`;
        return child.children == null ? [{ root, leaf: child, path }] : visit(child.children, path);
      });
    return visit(root.children, root.name);
  });
}
