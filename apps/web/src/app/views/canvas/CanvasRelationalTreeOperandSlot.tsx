/** Owned concern: accept and present one typed operand in the relational block canvas. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { readCanvasRelationalSourceDrag } from './canvasRelationalTreeDrag';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

export type CanvasRelationalOperandPosition = 'primary' | 'secondary';

export function CanvasRelationalTreeOperandSlot({
  copy,
  input,
  position,
  onPlaceInput,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  input: CanvasDvtCompositionInput | null;
  position: CanvasRelationalOperandPosition;
  onPlaceInput: (nodeId: string, position: CanvasRelationalOperandPosition) => void;
}>): JSX.Element {
  const label =
    position === 'primary'
      ? copy.relationalTreePrimarySlotLabel
      : copy.relationalTreeSecondarySlotLabel;
  return (
    <div
      data-slot="canvas-relational-tree-input-slot"
      data-position={position}
      aria-label={label}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const nodeId = readCanvasRelationalSourceDrag(event.dataTransfer);
        if (nodeId != null) onPlaceInput(nodeId, position);
      }}
      className="min-h-16 w-full max-w-64 rounded border border-dashed border-(--status-info) bg-(--surface-subtle) p-2.5"
    >
      <span className="block text-[9px] font-semibold uppercase text-(--text-muted)">{label}</span>
      <span className="mt-2 block font-mono text-[11px] text-(--text-primary)">
        {input == null ? copy.relationalTreeDropSourceMessage : `${input.schema}.${input.table}`}
      </span>
    </div>
  );
}
