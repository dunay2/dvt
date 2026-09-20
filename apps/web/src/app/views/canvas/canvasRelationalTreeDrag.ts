/** Owned concern: transport Source and operation identities during relational-canvas drag/drop. */
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';

export const CANVAS_RELATIONAL_SOURCE_DRAG_TYPE = 'application/x-dvt-relational-source';
export const CANVAS_RELATIONAL_OPERATION_DRAG_TYPE = 'application/x-dvt-relational-operation';

export function writeCanvasRelationalSourceDrag(dataTransfer: DataTransfer, nodeId: string): void {
  dataTransfer.effectAllowed = 'copyMove';
  dataTransfer.setData(CANVAS_RELATIONAL_SOURCE_DRAG_TYPE, nodeId);
}

export function readCanvasRelationalSourceDrag(dataTransfer: DataTransfer): string | null {
  const nodeId = dataTransfer.getData(CANVAS_RELATIONAL_SOURCE_DRAG_TYPE).trim();
  return nodeId.length === 0 ? null : nodeId;
}

export function writeCanvasRelationalOperationDrag(
  dataTransfer: DataTransfer,
  operation: CanvasRelationalOperation
): void {
  dataTransfer.effectAllowed = 'copyMove';
  dataTransfer.setData(CANVAS_RELATIONAL_OPERATION_DRAG_TYPE, operation);
}

export function readCanvasRelationalOperationDrag(
  dataTransfer: DataTransfer
): CanvasRelationalOperation | null {
  const operation = dataTransfer.getData(CANVAS_RELATIONAL_OPERATION_DRAG_TYPE).trim();
  return operation === 'projection' ||
    operation === 'inner_join' ||
    operation === 'left_join' ||
    operation === 'right_join' ||
    operation === 'full_outer_join' ||
    operation === 'left_semi_join' ||
    operation === 'left_anti_join' ||
    operation === 'right_semi_join' ||
    operation === 'right_anti_join' ||
    operation === 'cross_join' ||
    operation === 'union_all' ||
    operation === 'union_distinct' ||
    operation === 'intersect_distinct' ||
    operation === 'except_distinct'
    ? operation
    : null;
}
