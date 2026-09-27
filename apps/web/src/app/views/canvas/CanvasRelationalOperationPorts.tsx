/** Typed relation-output to staged-operation Input gestures. */
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  readCanvasRelationalRelationDrag,
  writeCanvasRelationalRelationDrag,
} from './canvasRelationalTreeDrag';
import { relationalInputPortClass, relationalOutputPortClass } from './canvasRelationalPortStyles';

export function CanvasRelationalOperationPorts({
  relationId,
  staged,
  copy,
  selectedSource,
  onSelectSource,
  onConnect,
}: Readonly<{
  relationId: string | null;
  staged?: CanvasStagedOperation;
  copy: CanvasRelationalTreeWorkbenchCopy;
  selectedSource: string | null;
  onSelectSource: (relationId: string) => void;
  onConnect: (operationId: string, port: number, relationId: string) => void;
}>): JSX.Element | null {
  if (relationId == null) return null;
  const output = (
    <button
      type="button"
      draggable
      data-slot="canvas-relational-output-port"
      aria-label={copy.relationalTreeOutputLabel}
      aria-pressed={selectedSource === relationId}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onSelectSource(relationId);
      }}
      onDragStart={(event) => {
        event.stopPropagation();
        writeCanvasRelationalRelationDrag(event.dataTransfer, relationId);
      }}
      className={relationalOutputPortClass}
    />
  );
  return (
    <>
      {output}
      {staged?.inputs.map((connected, port) => {
        const label =
          staged.inputs.length === 1
            ? copy.relationalTreePrimaryInputLabel
            : port === 0
              ? copy.inspectorDvtRelationalLeftInput
              : copy.inspectorDvtRelationalRightInput;
        return (
          <button
            key={port}
            type="button"
            data-slot="canvas-relational-input-port"
            data-port={port}
            data-connected={connected != null || undefined}
            aria-label={label}
            title={label}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (selectedSource != null) onConnect(staged.id, port, selectedSource);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = 'link';
            }}
            onDrop={(event) => {
              const source = readCanvasRelationalRelationDrag(event.dataTransfer);
              if (source == null) return;
              event.preventDefault();
              event.stopPropagation();
              onConnect(staged.id, port, source);
            }}
            className={`${relationalInputPortClass} grid place-items-center text-[9px] font-semibold text-(--text-strong)`}
            style={{ top: staged.inputs.length === 1 ? '50%' : port === 0 ? '35%' : '65%' }}
          >
            {staged.inputs.length === 1 ? '' : port === 0 ? 'L' : 'R'}
          </button>
        );
      })}
    </>
  );
}
