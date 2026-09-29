/** Owned concern: transport Source and operation identities during relational-canvas drag/drop. */
import {
  isCanvasStagedOperationKind,
  type CanvasStagedOperationKind,
} from './canvasStagedOperation';

export const CANVAS_RELATIONAL_SOURCE_DRAG_TYPE = 'application/x-dvt-relational-source';
export const CANVAS_RELATIONAL_OPERATION_DRAG_TYPE = 'application/x-dvt-relational-operation';
export const CANVAS_RELATIONAL_RELATION_DRAG_TYPE = 'application/x-dvt-relational-relation';
export const CANVAS_RELATIONAL_FIELD_DRAG_TYPE = 'application/x-dvt-relational-field';

export type CanvasRelationalFieldReference = Readonly<{
  rootId: string;
  revision: number;
  relationId: string;
  fieldId: string;
  selectedOutput?: boolean;
}>;

export function writeCanvasRelationalFieldDrag(
  dataTransfer: DataTransfer,
  reference: CanvasRelationalFieldReference
): void {
  dataTransfer.effectAllowed = reference.selectedOutput ? 'copyMove' : 'copy';
  dataTransfer.setData(CANVAS_RELATIONAL_FIELD_DRAG_TYPE, JSON.stringify(reference));
}

export function readCanvasRelationalFieldDrag(
  dataTransfer: DataTransfer
): CanvasRelationalFieldReference | null {
  try {
    const value: unknown = JSON.parse(dataTransfer.getData(CANVAS_RELATIONAL_FIELD_DRAG_TYPE));
    if (value == null || typeof value !== 'object') return null;
    const { rootId, revision, relationId, fieldId, selectedOutput } = value as Record<
      string,
      unknown
    >;
    if (
      typeof rootId !== 'string' ||
      rootId.length === 0 ||
      typeof relationId !== 'string' ||
      relationId.length === 0 ||
      typeof fieldId !== 'string' ||
      fieldId.length === 0 ||
      typeof revision !== 'number' ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      (selectedOutput != null && typeof selectedOutput !== 'boolean')
    )
      return null;
    return {
      rootId,
      revision,
      relationId,
      fieldId,
      ...(selectedOutput === true ? { selectedOutput: true } : {}),
    };
  } catch {
    return null;
  }
}

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
