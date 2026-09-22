/** Owned concern: state CROSS multiplicity without inventing a cardinality estimate. */
import { TriangleAlert } from 'lucide-react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasRelationalCrossNotice(): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  return (
    <p
      role="note"
      data-slot="canvas-relational-cross-warning"
      className="flex min-w-0 items-center gap-1.5 text-xs text-amber-300"
    >
      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      {copy.crossJoinWarning}
    </p>
  );
}
