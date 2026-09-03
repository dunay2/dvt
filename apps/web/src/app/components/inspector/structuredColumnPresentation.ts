/** Owned concern: flatten one structured Canvas column tree for Inspector tables. */
import type { CanvasNodePresentationColumn } from '../canvas/canvasNodePresentationTruth.contract';

export type InspectorPresentedColumn = Readonly<{
  column: CanvasNodePresentationColumn;
  path: string;
}>;

export function flattenStructuredColumns(
  columns: readonly CanvasNodePresentationColumn[],
  parentPath?: string
): InspectorPresentedColumn[] {
  return columns.flatMap((column) => {
    const path = parentPath == null ? column.name : `${parentPath}.${column.name}`;
    return [{ column, path }, ...flattenStructuredColumns(column.children ?? [], path)];
  });
}
