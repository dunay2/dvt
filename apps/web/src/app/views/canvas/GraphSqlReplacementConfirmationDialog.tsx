/** Owned concern: render explicit confirmation for ambiguous pre-marker DBT model SQL. */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { canvasViewCopy } from './copy';

export type GraphSqlReplacementConfirmationDialogProps = Readonly<{
  open: boolean;
  paths: readonly string[];
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function GraphSqlReplacementConfirmationDialog({
  open,
  paths,
  busy = false,
  onCancel,
  onConfirm,
}: GraphSqlReplacementConfirmationDialogProps): JSX.Element {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen || busy) {
          return;
        }
        onCancel();
      }}
    >
      <AlertDialogContent
        data-slot="graph-sql-replacement-confirmation"
        className="border-(--border-default) bg-(--surface-panel) text-(--text-default)"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{canvasViewCopy.graphSqlReplacementTitle}</AlertDialogTitle>
          <AlertDialogDescription className="text-(--text-muted)">
            {canvasViewCopy.graphSqlReplacementDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <section aria-label={canvasViewCopy.graphSqlReplacementPathListLabel}>
          <h3 className="text-xs font-semibold uppercase text-(--text-muted)">
            {canvasViewCopy.graphSqlReplacementPathListLabel}
          </h3>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto rounded border border-(--border-muted) bg-(--surface-panel-subtle) p-2">
            {[...paths].sort().map((path) => (
              <li key={path} className="font-mono text-xs text-(--text-default)">
                {path}
              </li>
            ))}
          </ul>
        </section>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>
            {canvasViewCopy.graphSqlReplacementCancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {canvasViewCopy.graphSqlReplacementConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
