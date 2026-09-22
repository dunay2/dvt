/** Owned concern: obtain explicit consent before retiring dependent operations. */
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../../components/ui/alert-dialog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasRelationalRemovalConfirmation({
  operations,
  onConfirm,
  onCancel,
  error,
  clearError,
}: Readonly<{
  operations: readonly string[] | null;
  onConfirm: () => void;
  onCancel: () => void;
  error: string | null;
  clearError: () => void;
}>): JSX.Element {
  const copy = resolveCanvasSemanticEditorCopy(
    useApplicationLanguageStore((state) => state.language)
  );
  return (
    <>
      {error == null ? null : (
        <div
          role="alert"
          className="absolute bottom-3 left-1/4 z-30 max-w-lg rounded border border-amber-600 bg-(--surface-panel) p-3 text-sm"
        >
          {error === 'dependent-condition'
            ? copy.removalDependency
            : error === 'unsupported-projection-type'
              ? copy.removalUnsupportedType
              : copy.removalUnavailable}
          <button
            type="button"
            aria-label={copy.collapse}
            className="ml-2 px-2"
            onClick={clearError}
          >
            ×
          </button>
        </div>
      )}
      <AlertDialog
        open={operations != null}
        onOpenChange={(open) => {
          if (!open) onCancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{copy.removeDependents}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.removeDependentsHint} {operations?.join(' → ')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>{copy.stay}</AlertDialogCancel>
            <AlertDialogAction data-slot="canvas-relational-removal-confirm" onClick={onConfirm}>
              {copy.removeCard}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
