/** Owned concern: render warehouse source import workflow over the source import port. */
import { useMemo } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { getSourceImportOptions } from '../plugins/registry';
import { useWarehouseSourceImportPort } from '../services/AppServicesContext';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { sourceImportWizardCopy as copy } from './sourceImportWizard/copy';
import type { SourceImportWizardProps } from './sourceImportWizard/types';
import { useSourceImportWizard } from './sourceImportWizard/useSourceImportWizard';
import { SourceImportSectionTabs } from './sourceImportWizard/SourceImportSectionTabs';
import { WizardStepContent } from './sourceImportWizard/WizardStepContent';

export default function SourceImportWizard({
  open,
  onClose,
  onComplete,
  sourceImportOptions: declaredSourceImportOptions,
  initialSelection,
}: SourceImportWizardProps) {
  const warehouseSourceImport = useWarehouseSourceImportPort();
  const sourceImportOptions = useMemo(
    () => declaredSourceImportOptions ?? getSourceImportOptions(),
    [declaredSourceImportOptions]
  );
  const controller = useSourceImportWizard({
    open,
    warehouseSourceImport,
    sourceImportOptions,
    onComplete,
    onClose,
    initialSelection,
  });
  const { state } = controller;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {state.currentStep === 'result' ? null : (
          <SourceImportSectionTabs
            activeSection={controller.activeSection}
            canEnterSection={controller.canEnterSection}
            onSectionChange={controller.setCurrentSection}
          />
        )}

        <ScrollArea className="-mx-6 flex-1 px-6">
          <WizardStepContent controller={controller} />
        </ScrollArea>

        <DialogFooter className="mt-4">
          {state.currentStep === 'result' ? (
            <Button onClick={controller.handleComplete} className="w-full">
              Done
            </Button>
          ) : (
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => void controller.handleImport()}
                disabled={!controller.canImport}
              >
                {state.isProcessing ? (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
