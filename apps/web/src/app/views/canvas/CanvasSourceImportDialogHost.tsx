/** Owned concern: host the contextual Add Source dialog outside Canvas shell layout code. */
import SourceImportWizard from '../../components/SourceImportWizard';
import type { ImportSourcesResult } from '../../ports/workspace';
import type { SourceImportOptionContribution } from '../../plugins/registry';
import type { SourceImportInitialSelection } from '../../components/sourceImportWizard/types';
import type { CanvasShellSourceImportPlacement } from './canvasShell.types';

type CanvasSourceImportDialogHostProps = Readonly<{
  open: boolean;
  canvasId: string;
  initialSelection?: SourceImportInitialSelection | null;
  placement?: CanvasShellSourceImportPlacement;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  onClose: () => void;
  onRestoreFocus?: () => void;
  onComplete: (result: ImportSourcesResult, placement?: CanvasShellSourceImportPlacement) => void;
}>;

export function CanvasSourceImportDialogHost({
  open,
  canvasId,
  initialSelection,
  placement,
  sourceImportOptions,
  onClose,
  onRestoreFocus,
  onComplete,
}: CanvasSourceImportDialogHostProps): JSX.Element {
  return (
    <SourceImportWizard
      open={open}
      canvasId={canvasId}
      onClose={onClose}
      onRestoreFocus={onRestoreFocus}
      onComplete={(result) => onComplete(result, placement)}
      sourceImportOptions={sourceImportOptions}
      initialSelection={initialSelection}
    />
  );
}
