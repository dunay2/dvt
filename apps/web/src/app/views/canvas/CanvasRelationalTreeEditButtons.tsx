/** Present Apply/Cancel controls; the owning edit session keeps all command authority. */
import { Check, X } from 'lucide-react';
import type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

export function CanvasRelationalTreeEditButtons({
  session,
  copy,
}: Readonly<{
  session: CanvasRelationalTreeWorkbenchHandle;
  copy: CanvasRelationalTreeWorkbenchCopy;
}>): JSX.Element {
  return (
    <>
      <button
        type="button"
        data-slot="canvas-relational-tree-apply"
        aria-label={copy.inspectorDvtRelationalApply}
        title={copy.inspectorDvtRelationalApply}
        disabled={!session.canApply || !session.hasUnappliedChanges}
        onClick={session.apply}
        className="grid size-8 place-items-center rounded text-emerald-300 hover:bg-(--surface-selected) disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        data-slot="canvas-relational-tree-cancel"
        aria-label={copy.inspectorDvtRelationalCancel}
        title={copy.inspectorDvtRelationalCancel}
        onClick={session.cancel}
        className="grid size-8 place-items-center rounded text-(--text-muted) hover:bg-(--surface-selected)"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </>
  );
}
