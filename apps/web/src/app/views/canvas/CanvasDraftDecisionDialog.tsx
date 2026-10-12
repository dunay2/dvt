/** One presentation of the existing Apply / discard / stay decision. */
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

export function CanvasDraftDecisionDialog({
  open,
  busy = false,
  error,
  canApply,
  onStay,
  onDiscard,
  onApply,
}: Readonly<{
  open: boolean;
  busy?: boolean;
  error?: string | null;
  canApply: boolean;
  onStay: () => void;
  onDiscard?: () => void;
  onApply: () => void;
}>) {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onStay();
      }}
    >
      <AlertDialogContent>
        <AlertDialogTitle>{copy.leaveTitle}</AlertDialogTitle>
        <AlertDialogDescription>{copy.leaveDescription}</AlertDialogDescription>
        {error == null ? null : (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{copy.stay}</AlertDialogCancel>
          {onDiscard == null ? null : (
            <AlertDialogAction
              disabled={busy}
              data-slot="canvas-draft-discard"
              onClick={(event) => {
                event.preventDefault();
                onDiscard();
              }}
            >
              {copy.discard}
            </AlertDialogAction>
          )}
          <AlertDialogAction
            disabled={busy || !canApply}
            data-slot="canvas-draft-apply"
            onClick={(event) => {
              event.preventDefault();
              onApply();
            }}
          >
            {copy.apply}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
