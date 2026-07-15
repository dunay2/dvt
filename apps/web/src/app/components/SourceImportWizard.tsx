/** Owned concern: render warehouse source import workflow over the source import port. */
import { useMemo } from 'react';

import { getSourceImportOptions } from '../plugins/registry';
import { useWarehouseSourceImportPort } from '../services/AppServicesContext';
import type { SourceImportWizardProps } from './sourceImportWizard/types';
import { useSourceImportWizard } from './sourceImportWizard/useSourceImportWizard';
import { SourceImportSectionTabs } from './sourceImportWizard/SourceImportSectionTabs';
import { WizardStepContent } from './sourceImportWizard/WizardStepContent';
import { SourceImportWizardFrame } from './sourceImportWizard/SourceImportWizardFrame';

export default function SourceImportWizard({
  open,
  canvasId,
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
    canvasId,
    warehouseSourceImport,
    sourceImportOptions,
    onComplete,
    onClose,
    initialSelection,
  });
  const { state } = controller;
  const isResultStep = state.currentStep === 'result';

  return (
    <SourceImportWizardFrame
      open={open}
      isResultStep={isResultStep}
      isProcessing={state.isProcessing}
      canImport={controller.canImport}
      onClose={onClose}
      onDone={controller.handleComplete}
      onImport={() => void controller.handleImport()}
      sections={
        <SourceImportSectionTabs
          activeSection={controller.activeSection}
          canEnterSection={controller.canEnterSection}
          onSectionChange={controller.setCurrentSection}
        />
      }
    >
      <WizardStepContent controller={controller} />
    </SourceImportWizardFrame>
  );
}
