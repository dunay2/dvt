/** Owned concern: transport one Source identity during relational-canvas drag and drop. */
export const CANVAS_RELATIONAL_SOURCE_DRAG_TYPE = 'application/x-dvt-relational-source';

export function writeCanvasRelationalSourceDrag(dataTransfer: DataTransfer, nodeId: string): void {
  dataTransfer.effectAllowed = 'move';
  dataTransfer.setData(CANVAS_RELATIONAL_SOURCE_DRAG_TYPE, nodeId);
}

export function readCanvasRelationalSourceDrag(dataTransfer: DataTransfer): string | null {
  const nodeId = dataTransfer.getData(CANVAS_RELATIONAL_SOURCE_DRAG_TYPE).trim();
  return nodeId.length === 0 ? null : nodeId;
}
