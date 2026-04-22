import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { useWorkspaceService } from '../services/AppServicesContext';
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
import { WizardProgress } from './sourceImportWizard/WizardProgress';
import { WizardStepContent } from './sourceImportWizard/WizardStepContent';

export default function SourceImportWizard({ open, onClose, onComplete }: SourceImportWizardProps) {
  const workspaceService = useWorkspaceService();
  const controller = useSourceImportWizard({
    open,
    workspaceService,
    onComplete,
    onClose,
  });
  const { state } = controller;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {state.currentStep === 'result' ? null : <WizardProgress currentStep={state.currentStep} />}

        <ScrollArea className="-mx-6 flex-1 px-6">
          <WizardStepContent controller={controller} />
        </ScrollArea>

        <DialogFooter className="mt-4">
          {state.currentStep === 'result' ? (
            <Button onClick={controller.handleComplete} className="w-full">
              Done
            </Button>
          ) : (
            <div className="flex w-full justify-between">
              <Button
                variant="outline"
                onClick={controller.handleBack}
                disabled={state.currentStep === 'sourceType'}
              >
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              {state.currentStep === 'review' ? (
                <Button
                  onClick={() => void controller.handleImport()}
                  disabled={state.isProcessing || !controller.canProceed}
                >
                  {state.isProcessing ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 size-4" />
                      Register data objects
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={controller.handleNext} disabled={!controller.canProceed}>
                  Next
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
