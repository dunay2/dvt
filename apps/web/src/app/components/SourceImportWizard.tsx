/** Owned concern: render warehouse source import workflow over the source import port. */
import { useMemo } from 'react';

import { getSourceImportOptions } from '../plugins/registry';
import { useWarehouseSourceImportPort } from '../services/AppServicesContext';
import type { SourceImportWizardProps } from './sourceImportWizard/types';
import { useSourceImportWizard } from './sourceImportWizard/useSourceImportWizard';
import { SourceImportSectionTabs } from './sourceImportWizard/SourceImportSectionTabs';
import { WizardStepContent } from './sourceImportWizard/WizardStepContent';
import { SourceImportWizardFrame } from './sourceImportWizard/SourceImportWizardFrame';
import { SourceImportCatalogRecovery } from './sourceImportWizard/SourceImportCatalogRecovery';

export default function SourceImportWizard({
  open,
  canvasId,
  onClose,
  onRestoreFocus,
  onComplete,
  onConnectionRenamed,
  sourceImportOptions: declaredSourceImportOptions,
  entry,
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
    onConnectionRenamed,
    onClose,
    entry,
  });
  const { state } = controller;
  const isResultStep = state.currentStep === 'result';

  return (
    <SourceImportWizardFrame
      open={open}
      entryIntent={entry?.intent}
      activeContentId={isResultStep ? 'result' : controller.activeSection}
      isResultStep={isResultStep}
      isProcessing={state.isProcessing}
      canImport={controller.canImport}
      selectedCount={controller.selectedCount}
      preventCloseOnEscape={state.renameConnectionFormOpen}
      onClose={onClose}
      onRestoreFocus={onRestoreFocus}
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
      <SourceImportCatalogRecovery binding={controller.catalogueRecovery} />
      <WizardStepContent controller={controller} />
    </SourceImportWizardFrame>
  );
}
