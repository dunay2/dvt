import { sourceImportWizardCopy as copy } from './copy';
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
  const { state } = controller;
  switch (state.currentStep) {
    case 'connection':
      return (
        <div id="source-import-section-connections">
          <ConnectionStep
            connections={state.connections}
            selectedConnection={state.selectedConnection}
            isLoadingConnections={state.isLoadingConnections}
            loadError={state.loadError}
            onSelectConnection={controller.setSelectedConnection}
          />
        </div>
      );
    case 'selection':
      return (
        <div id="source-import-section-browse">
          <SelectionStep
            tables={state.tables}
            selectedCount={controller.selectedCount}
            activeTableKey={state.activeTableKey}
            tableSearchQuery={state.tableSearchQuery}
            isLoadingTables={state.isLoadingTables}
            loadError={state.loadError}
            onTableSearchQueryChange={controller.setTableSearchQuery}
            onToggleSchema={controller.toggleSchema}
            onToggleTable={controller.toggleTable}
          />
        </div>
      );
    case 'grouping':
    case 'options':
      return (
        <SourceImportMetadataPanel
          activeTable={controller.activeTable}
          groupingStrategy={state.groupingStrategy}
          sourceImportOptions={controller.sourceImportOptions}
          sourceImportOptionValues={controller.sourceImportOptionValues}
          onGroupingChange={controller.setGroupingStrategy}
          onSourceImportOptionChange={controller.setSourceImportOption}
        />
      );
    case 'review':
      return (
        <div id="source-import-section-selected">
          <ReviewStep
            tables={state.tables}
            selectedCount={controller.selectedCount}
            groupingStrategy={state.groupingStrategy}
            selectedConnectionName={
              controller.selectedConnectionObject?.name ?? copy.selectConnectionError
            }
            sourceImportOptions={controller.sourceImportOptions}
            sourceImportOptionValues={controller.sourceImportOptionValues}
          />
        </div>
      );
    case 'result':
      return state.importResult ? <ResultStep result={state.importResult} /> : null;
    default:
      return null;
  }
}
