import { resolveSourceImportFailureMessage, useSourceImportLocalization } from './copy';
import { Card } from '../ui/card';
import { ConnectionStep } from './ConnectionStep';
import { ResultStep } from './ResultStep';
import { ReviewStep } from './ReviewStep';
import { SelectionStep } from './SelectionStep';
import { SourceImportMetadataPanel } from './SourceImportMetadataPanel';
import type { SourceImportWizardController } from './useSourceImportWizard';

interface WizardStepContentProps {
  controller: SourceImportWizardController;
}

export function WizardStepContent({ controller }: WizardStepContentProps) {
  const { copy } = useSourceImportLocalization();
  const { state } = controller;
  const loadError = resolveSourceImportFailureMessage(copy, state.loadError);
  const createConnectionError = resolveSourceImportFailureMessage(
    copy,
    state.createConnectionError
  );
  switch (state.currentStep) {
    case 'connection':
      return (
        <div id="source-import-section-connections">
          <ConnectionStep
            connections={state.connections}
            selectedConnection={state.selectedConnection}
            createConnectionFormOpen={state.createConnectionFormOpen}
            createConnectionForm={state.createConnectionForm}
            isLoadingConnections={state.isLoadingConnections}
            isCreatingConnection={state.isCreatingConnection}
            isTestingConnection={state.isTestingConnection}
            connectionTestResult={state.connectionTestResult}
            loadError={loadError}
            createConnectionError={createConnectionError}
            onSelectConnection={controller.setSelectedConnection}
            onOpenCreateConnectionForm={controller.openCreateConnectionForm}
            onCancelCreateConnectionForm={controller.cancelCreateConnectionForm}
            onCreateConnectionFormChange={controller.setCreateConnectionFormField}
            onCreateConnection={() => {
              void controller.handleCreateConnection();
            }}
            onTestConnection={() => {
              void controller.handleTestConnection();
            }}
          />
        </div>
      );
    case 'selection':
      return (
        <div id="source-import-section-browse">
          <SelectionStep
            sourceObjects={state.sourceObjects}
            selectedCount={controller.selectedCount}
            activeSourceObjectKey={state.activeSourceObjectKey}
            sourceObjectSearchQuery={state.sourceObjectSearchQuery}
            isLoadingSourceObjects={state.isLoadingSourceObjects}
            loadError={loadError}
            onSourceObjectSearchQueryChange={controller.setSourceObjectSearchQuery}
            onActivateSourceObject={controller.activateSourceObject}
            onToggleDatabase={controller.toggleDatabase}
            onToggleSchema={controller.toggleSchema}
            onToggleSourceObject={controller.toggleSourceObject}
          />
        </div>
      );
    case 'grouping':
    case 'options':
      return (
        <SourceImportMetadataPanel
          activeSourceObject={controller.activeSourceObject}
          groupingStrategy={state.groupingStrategy}
          sourceImportOptions={controller.sourceImportOptions}
          sourceImportOptionValues={controller.sourceImportOptionValues}
          onGroupingChange={controller.setGroupingStrategy}
          onSourceImportOptionChange={controller.setSourceImportOption}
        />
      );
    case 'review':
      return (
        <div id="source-import-section-selected" className="space-y-4">
          {loadError ? (
            <Card className="border-red-700 bg-red-950/30 p-3 text-sm text-red-200">
              {loadError}
            </Card>
          ) : null}
          <ReviewStep
            sourceObjects={state.sourceObjects}
            selectedCount={controller.selectedCount}
            groupingStrategy={state.groupingStrategy}
            selectedConnectionName={
              controller.selectedConnectionObject?.name ?? copy.selectConnectionError
            }
            sourceImportOptions={controller.sourceImportOptions}
            sourceImportOptionValues={controller.sourceImportOptionValues}
            onRemoveSourceObject={controller.toggleSourceObject}
          />
        </div>
      );
    case 'result':
      return state.importResult ? <ResultStep result={state.importResult} /> : null;
    default:
      return null;
  }
}
