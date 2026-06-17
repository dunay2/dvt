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
        Done
      </Button>
    );
  }

  return (
    <div className="flex w-full justify-end gap-2">
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onImport} disabled={!canImport}>
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Attaching...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 size-4" />
            Attach sources to canvas
          </>
        )}
      </Button>
    </div>
  );
}

type SourceImportWizardFrameProps = Readonly<{
  open: boolean;
  isResultStep: boolean;
  isProcessing: boolean;
  canImport: boolean;
  sections: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onDone: () => void;
  onImport: () => void;
}>;

export function SourceImportWizardFrame({
  open,
  isResultStep,
  isProcessing,
  canImport,
  sections,
  children,
  onClose,
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
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {isResultStep ? null : sections}

        <ScrollArea className="-mx-6 flex-1 px-6">{children}</ScrollArea>

        <DialogFooter className="mt-4">
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
