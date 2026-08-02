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
import { sourceImportWizardCopy as copy } from './copy';

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
  if (isResultStep) {
    return (
      <Button onClick={onDone} className="w-full">
        {copy.footer.doneAction}
      </Button>
    );
  }

  return (
    <div className="flex w-full justify-end gap-2">
      <Button variant="outline" onClick={onClose}>
        {copy.footer.cancelAction}
      </Button>
      <Button onClick={onImport} disabled={!canImport}>
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
  sections,
  children,
  onClose,
  onRestoreFocus,
  onDone,
  onImport,
}: SourceImportWizardFrameProps): JSX.Element {
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
        className="flex h-[min(90vh,760px)] max-w-5xl flex-col overflow-hidden"
        onCloseAutoFocus={(event) => {
          if (onRestoreFocus) {
            event.preventDefault();
            onRestoreFocus();
          }
        }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {isResultStep ? null : <div className="shrink-0">{sections}</div>}

        <ScrollArea key={activeContentId} className="-mx-6 min-h-0 flex-1 px-6">
          <div className="pb-4">{children}</div>
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
