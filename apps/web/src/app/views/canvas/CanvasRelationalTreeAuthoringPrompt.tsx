/** Owned concern: expose the explicit transition from published-tree inspection to composition. */
import { Button } from '../../components/ui/button';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

export function CanvasRelationalTreeAuthoringPrompt({
  copy,
  pendingInputCount,
  onStart,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  pendingInputCount: number;
  onStart: () => void;
}>): JSX.Element {
  return (
    <div
      data-slot="canvas-relational-tree-start-authoring"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border-subtle) bg-(--surface-subtle) px-3 py-2"
    >
      <p className="text-[11px] text-(--text-muted)">
        <span className="font-semibold text-(--text-primary)">{pendingInputCount}</span>{' '}
        {copy.relationalTreePendingInputsMessage}
      </p>
      <Button type="button" size="sm" variant="outline" onClick={onStart}>
        {copy.relationalTreeComposeAction}
      </Button>
    </div>
  );
}
