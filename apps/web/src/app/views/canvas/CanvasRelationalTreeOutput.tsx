/** Presentation-only terminal for the model output in a relational layout. */
import { Table2 } from 'lucide-react';
import {
  CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
  type CanvasRelationalTreeLayout,
} from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { readCanvasRelationalRelationDrag } from './canvasRelationalTreeDrag';
import { relationalInputPortClass } from './canvasRelationalPortStyles';

export function CanvasRelationalTreeOutput({
  output,
  outputName,
  copy,
  onOpen,
  connected,
  selectedSource,
  onConnect,
  onDisconnect,
  movable,
}: Readonly<{
  output: NonNullable<CanvasRelationalTreeLayout['output']>;
  outputName: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onOpen?: () => void;
  connected: boolean;
  selectedSource: string | null;
  onConnect?: (relationId: string) => void;
  onDisconnect?: () => void;
  movable: boolean;
}>): JSX.Element {
  const style = {
    left: output.x,
    top: output.y,
    width: output.width,
    height: output.height,
  };
  const content = (
    <>
      <Table2 aria-hidden="true" className="size-4 shrink-0 text-emerald-300" />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold text-(--text-primary)">
          {outputName}
        </span>
        <span className="block text-[9px] uppercase tracking-wide text-emerald-300">
          {copy.relationalTreeOutputLabel}
        </span>
      </span>
    </>
  );
  const className = `absolute z-10 flex select-none items-center gap-2 rounded-md border border-emerald-500 bg-emerald-950/30 px-3 text-left shadow-sm ${movable ? 'cursor-grab data-[dragging=true]:cursor-grabbing' : 'cursor-inherit'}`;
  return (
    <div
      data-slot="canvas-relational-tree-output"
      data-relational-card-id={CANVAS_RELATIONAL_OUTPUT_POSITION_ID}
      className={className}
      style={{ ...style, touchAction: 'none' }}
    >
      {onOpen == null ? (
        content
      ) : (
        <button
          type="button"
          data-slot="canvas-relational-tree-output-open"
          aria-label={`${outputName} · ${copy.relationalTreeOutputLabel}`}
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
        >
          {content}
        </button>
      )}
      {onConnect == null && onDisconnect == null ? null : (
        <button
          type="button"
          data-slot="canvas-relational-output-input-port"
          data-connected={connected || undefined}
          aria-label={copy.relationalTreePrimaryInputLabel}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (connected) onDisconnect?.();
            else if (selectedSource != null) onConnect?.(selectedSource);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'link';
          }}
          onDrop={(event) => {
            const relationId = readCanvasRelationalRelationDrag(event.dataTransfer);
            if (relationId == null) return;
            event.preventDefault();
            event.stopPropagation();
            onConnect?.(relationId);
          }}
          className={`${relationalInputPortClass} top-1/2`}
        />
      )}
    </div>
  );
}
