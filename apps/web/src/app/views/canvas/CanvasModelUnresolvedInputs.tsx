/** Owned concern: explain unresolved inputs without owning their query or editing lifecycle. */
import { Button } from '../../components/ui/button';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasModelUnresolvedInputs({
  unresolvedInputs,
  onReviewInputs,
  copy,
}: Readonly<{
  unresolvedInputs: readonly Readonly<{ label: string; state: 'pending' | 'missing' }>[];
  onReviewInputs?: () => void;
  copy: CanvasSemanticEditorCopy;
}>): JSX.Element | null {
  if (unresolvedInputs.length === 0) return null;
  return (
    <div
      data-slot="canvas-model-unresolved-inputs"
      role="status"
      className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
    >
      {(['pending', 'missing'] as const).map((state) => {
        const labels = unresolvedInputs
          .filter((input) => input.state === state)
          .map((input) => input.label);
        return labels.length === 0 ? null : (
          <div key={state} className="space-y-1">
            <p>
              {state === 'pending' ? copy.pendingPreview : copy.missingPreview}{' '}
              <strong>{labels.join(', ')}</strong>
            </p>
            <p className="text-xs">
              {state === 'pending' ? copy.pendingPreviewHint : copy.missingPreviewHint}
            </p>
          </div>
        );
      })}
      {onReviewInputs == null ? null : (
        <Button variant="outline" size="sm" onClick={onReviewInputs}>
          {copy.reviewInputs}
        </Button>
      )}
    </div>
  );
}
