/** Owned concern: expose the explicit transition from published-tree inspection to composition. */
import { Button } from '../../components/ui/button';
import { PencilLine } from 'lucide-react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
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
  const language = useApplicationLanguageStore((state) => state.language);
  const editorCopy = resolveCanvasSemanticEditorCopy(language);
  return (
    <div
      data-slot="canvas-relational-tree-start-authoring"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border-subtle) bg-(--surface-subtle) px-3 py-2"
    >
      <p className="text-xs text-(--text-muted)">
        {pendingInputCount === 0 ? (
          editorCopy.applied
        ) : (
          <>
            <span className="font-semibold text-(--text-primary)">{pendingInputCount}</span>{' '}
            {copy.relationalTreePendingInputsMessage}
          </>
        )}
      </p>
      <Button type="button" size="sm" variant="outline" onClick={onStart}>
        <PencilLine className="size-3.5" aria-hidden="true" />
        {pendingInputCount === 0 ? editorCopy.edit : copy.relationalTreeComposeAction}
      </Button>
    </div>
  );
}
