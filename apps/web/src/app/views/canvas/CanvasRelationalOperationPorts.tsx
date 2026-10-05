/**
 * Owned concern: translate connection gestures into existing authoring commands.
 * @baseline GH-3271-COMPOSITION-CONCERNS: presentation cannot own connection admission.
 * @decision Derive ports from the shared projection and dispatch actions from event handlers.
 * @consequence The passive template and CSS change independently from mutation rules.
 * @version 1.0.0
 */
import type { DragEvent, PointerEvent, MouseEvent } from 'react';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  CANVAS_RELATIONAL_FIELD_DRAG_TYPE,
  readCanvasRelationalFieldDrag,
  readCanvasRelationalRelationDrag,
  writeCanvasRelationalRelationDrag,
} from './canvasRelationalTreeDrag';
import { useCanvasRelationalFieldSelection } from './CanvasRelationalFieldSelectionProvider';
import {
  canvasRelationalInputOwner,
  projectCanvasRelationalInputPorts,
} from './canvasRelationalInputPorts';
import { CanvasRelationalOperationPortsTemplate } from './CanvasRelationalOperationPorts.templates';

export function CanvasRelationalOperationPorts({
  node,
  staged,
  copy,
  selectedSource,
  onSelectSource,
  onConnect,
}: Readonly<{
  node: CanvasRelationalTreeNode;
  staged?: CanvasStagedOperation;
  copy: CanvasRelationalTreeWorkbenchCopy;
  selectedSource: string | null;
  onSelectSource: (relationId: string) => void;
  onConnect: (operationId: string, port: number, relationId: string) => void;
}>): JSX.Element | null {
  const fields = useCanvasRelationalFieldSelection();
  const relationId = node.relationId;
  if (relationId == null) return null;
  const stop = (event: PointerEvent | MouseEvent) => event.stopPropagation();
  const dragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = event.dataTransfer.types.includes(
      CANVAS_RELATIONAL_FIELD_DRAG_TYPE
    )
      ? fields?.enabled
        ? 'copy'
        : 'none'
      : 'link';
  };
  const drop = (event: DragEvent, port: number) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes(CANVAS_RELATIONAL_FIELD_DRAG_TYPE)) {
      const reference = readCanvasRelationalFieldDrag(event.dataTransfer);
      if (reference != null) fields?.connect(reference, relationId, port);
    } else {
      const source = readCanvasRelationalRelationDrag(event.dataTransfer);
      if (source != null) onConnect(relationId, port, source);
    }
  };
  return (
    <CanvasRelationalOperationPortsTemplate
      outputLabel={copy.relationalTreeOutputLabel}
      selected={selectedSource === relationId}
      inputs={projectCanvasRelationalInputPorts(canvasRelationalInputOwner(node, staged), copy)}
      onPointerDown={stop}
      onOutputClick={(event) => {
        stop(event);
        onSelectSource(relationId);
      }}
      onOutputDragStart={(event) => {
        event.stopPropagation();
        writeCanvasRelationalRelationDrag(event.dataTransfer, relationId);
      }}
      onInputClick={(event, port) => {
        stop(event);
        if (selectedSource != null) onConnect(relationId, port, selectedSource);
      }}
      onInputDragOver={dragOver}
      onInputDrop={drop}
    />
  );
}
