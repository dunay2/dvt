/** Owned concern: arrange the two input drop slots before a canonical operation exists. */
import { CanvasRelationalJoinIcon } from './CanvasRelationalJoinIcon';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  CanvasRelationalTreeOperandSlot,
  type CanvasRelationalOperandPosition,
} from './CanvasRelationalTreeOperandSlot';

export function CanvasRelationalTreeOperandCanvas({
  copy,
  primaryInput,
  secondaryInput,
  onPlaceInput,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  primaryInput: CanvasDvtCompositionInput | null;
  secondaryInput: CanvasDvtCompositionInput | null;
  onPlaceInput: (nodeId: string, position: CanvasRelationalOperandPosition) => void;
}>): JSX.Element {
  return (
    <div className="mx-auto grid min-h-64 w-full max-w-3xl grid-cols-[minmax(0,13rem)_minmax(10rem,1fr)] grid-rows-2 items-center gap-x-20 gap-y-8">
      <CanvasRelationalTreeOperandSlot
        copy={copy}
        input={primaryInput}
        position="primary"
        onPlaceInput={onPlaceInput}
      />
      <div className="row-span-2 flex items-center gap-10">
        <div className="flex min-h-16 min-w-44 items-center gap-2 rounded-md border border-dashed border-(--status-info) bg-blue-950/20 px-3">
          <CanvasRelationalJoinIcon className="size-4 text-(--status-info)" />
          <span className="text-[10px] font-semibold uppercase text-(--text-muted)">
            {copy.relationalTreeSelectOperationMessage}
          </span>
        </div>
        <div className="min-w-28 rounded-md border border-emerald-500 bg-emerald-950/30 px-3 py-4 text-[10px] font-semibold text-emerald-300">
          {copy.relationalTreeOutputLabel}
        </div>
      </div>
      <CanvasRelationalTreeOperandSlot
        copy={copy}
        input={secondaryInput}
        position="secondary"
        onPlaceInput={onPlaceInput}
      />
    </div>
  );
}
