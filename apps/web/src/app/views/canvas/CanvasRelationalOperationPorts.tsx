/** Typed relation-output to staged-operation Input gestures. */
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  CANVAS_RELATIONAL_RELATION_DRAG_TYPE,
  readCanvasRelationalRelationDrag,
  writeCanvasRelationalRelationDrag,
} from './canvasRelationalTreeDrag';

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
  if (staged == null)
    return (
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
        className="absolute -right-2 top-1/2 z-20 size-4 -translate-y-1/2 rounded-full border-2 border-(--surface-panel) bg-(--status-info) shadow-sm focus-visible:outline-2 focus-visible:outline-(--focus-ring) aria-pressed:ring-2 aria-pressed:ring-(--focus-ring)"
      />
    );
  return (
    <>
      {staged.inputs.map((connected, port) => {
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
              if (!event.dataTransfer.types.includes(CANVAS_RELATIONAL_RELATION_DRAG_TYPE)) return;
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
            className="absolute -left-2 z-20 grid size-4 -translate-y-1/2 place-items-center rounded-full border-2 border-(--surface-panel) bg-(--surface-raised) text-[8px] font-semibold text-(--text-strong) shadow-sm hover:bg-(--status-info) focus-visible:outline-2 focus-visible:outline-(--focus-ring) data-[connected=true]:bg-(--status-success)"
            style={{ top: staged.inputs.length === 1 ? '50%' : port === 0 ? '35%' : '65%' }}
          >
            {staged.inputs.length === 1 ? '' : port === 0 ? 'L' : 'R'}
          </button>
        );
      })}
    </>
  );
}
