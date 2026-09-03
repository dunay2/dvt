/** Owned concern: render the Add Source modal frame without owning import workflow state. */
import type { ReactNode } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { useDraggableDialogPosition } from '../ui/use-draggable-dialog-position';
import { useSourceImportLocalization } from './copy';

type SourceImportWizardFooterProps = Readonly<{
  isResultStep: boolean;
  isProcessing: boolean;
  canImport: boolean;
  onClose: () => void;
  onDone: () => void;
  onImport: () => void;
}>;

export function SourceImportWizardFooter({
  isResultStep,
  isProcessing,
  canImport,
  onClose,
  onDone,
  onImport,
}: SourceImportWizardFooterProps): JSX.Element {
  const { copy } = useSourceImportLocalization();

  if (isResultStep) {
    return (
      <Button
        onClick={onDone}
        className="w-full bg-blue-700 text-white hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-300 disabled:opacity-100"
      >
        {copy.footer.doneAction}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-wrap justify-end gap-2">
      <Button variant="outline" onClick={onClose}>
        {copy.footer.cancelAction}
      </Button>
      <Button
        onClick={onImport}
        disabled={!canImport}
        className="bg-blue-700 text-white hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-300 disabled:opacity-100"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {copy.footer.attachingAction}
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 size-4" />
            {copy.footer.attachAction}
          </>
        )}
      </Button>
    </div>
  );
}

type SourceImportWizardFrameProps = Readonly<{
  open: boolean;
  activeContentId: string;
  isResultStep: boolean;
  isProcessing: boolean;
  canImport: boolean;
  preventCloseOnEscape?: boolean;
  sections: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onRestoreFocus?: () => void;
  onDone: () => void;
  onImport: () => void;
}>;

export function SourceImportWizardFrame({
  open,
  activeContentId,
  isResultStep,
  isProcessing,
  canImport,
  preventCloseOnEscape = false,
  sections,
  children,
  onClose,
  onRestoreFocus,
  onDone,
  onImport,
}: SourceImportWizardFrameProps): JSX.Element {
  const { copy } = useSourceImportLocalization();
  const dialogPosition = useDraggableDialogPosition(open);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        ref={dialogPosition.contentRef}
        closeLabel={copy.closeAction}
        style={dialogPosition.contentStyle}
        className="flex h-[calc(100vh-2rem)] max-h-[760px] w-[calc(100vw-2rem)] min-w-0 flex-col overflow-hidden sm:max-w-[min(64rem,calc(100vw-2rem))]"
        onEscapeKeyDown={(event) => {
          if (preventCloseOnEscape) {
            event.preventDefault();
          }
        }}
        onCloseAutoFocus={(event) => {
          if (onRestoreFocus) {
            event.preventDefault();
            onRestoreFocus();
          }
        }}
      >
        <DialogHeader
          className="shrink-0 cursor-move touch-none select-none pr-10"
          {...dialogPosition.dragHandleProps}
        >
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {isResultStep ? null : <div className="shrink-0">{sections}</div>}

        <ScrollArea
          key={activeContentId}
          type="always"
          data-slot="source-import-wizard-content-scroll"
          data-overflow-affordance="always"
          className="-mx-6 min-h-0 min-w-0 flex-1 px-6"
        >
          <div className="min-w-0 pb-4">{children}</div>
        </ScrollArea>

        <DialogFooter className="mt-4 shrink-0">
          <SourceImportWizardFooter
            isResultStep={isResultStep}
            isProcessing={isProcessing}
            canImport={canImport}
            onClose={onClose}
            onDone={onDone}
            onImport={onImport}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
