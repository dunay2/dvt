/** Owned concern: transport Source and operation identities during relational-canvas drag/drop. */
import {
  isCanvasStagedOperationKind,
  type CanvasStagedOperationKind,
} from './canvasStagedOperation';

export const CANVAS_RELATIONAL_SOURCE_DRAG_TYPE = 'application/x-dvt-relational-source';
export const CANVAS_RELATIONAL_OPERATION_DRAG_TYPE = 'application/x-dvt-relational-operation';
export const CANVAS_RELATIONAL_RELATION_DRAG_TYPE = 'application/x-dvt-relational-relation';

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
  operation: CanvasStagedOperationKind
): void {
  dataTransfer.effectAllowed = 'copyMove';
  dataTransfer.setData(CANVAS_RELATIONAL_OPERATION_DRAG_TYPE, operation);
}

export function readCanvasRelationalOperationDrag(
  dataTransfer: DataTransfer
): CanvasStagedOperationKind | null {
  const operation = dataTransfer.getData(CANVAS_RELATIONAL_OPERATION_DRAG_TYPE).trim();
  return isCanvasStagedOperationKind(operation) ? operation : null;
}

export function writeCanvasRelationalRelationDrag(
  dataTransfer: DataTransfer,
  relationId: string
): void {
  dataTransfer.effectAllowed = 'link';
  dataTransfer.setData(CANVAS_RELATIONAL_RELATION_DRAG_TYPE, relationId);
}

export function readCanvasRelationalRelationDrag(dataTransfer: DataTransfer): string | null {
  const relationId = dataTransfer.getData(CANVAS_RELATIONAL_RELATION_DRAG_TYPE).trim();
  return relationId.length === 0 ? null : relationId;
}
