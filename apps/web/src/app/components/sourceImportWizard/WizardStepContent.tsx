import { sourceImportWizardCopy as copy } from './copy';
import { ConnectionStep } from './ConnectionStep';
import { GroupingStep } from './GroupingStep';
import { OptionsStep } from './OptionsStep';
import { ResultStep } from './ResultStep';
import { ReviewStep } from './ReviewStep';
import { SelectionStep } from './SelectionStep';
import { SourceTypeStep } from './SourceTypeStep';
import type { SourceImportWizardController } from './useSourceImportWizard';

interface WizardStepContentProps {
  controller: SourceImportWizardController;
}

export function WizardStepContent({ controller }: WizardStepContentProps) {
  const { state } = controller;
  switch (state.currentStep) {
    case 'sourceType':
      return (
        <SourceTypeStep
          selectedSourceType={state.selectedSourceType}
          onSelectSourceType={controller.setSelectedSourceType}
        />
      );
    case 'connection':
      return (
        <ConnectionStep
          connections={state.connections}
          selectedConnection={state.selectedConnection}
          isLoadingConnections={state.isLoadingConnections}
          loadError={state.loadError}
          onSelectConnection={controller.setSelectedConnection}
        />
      );
    case 'selection':
      return (
        <SelectionStep
          tables={state.tables}
          selectedCount={controller.selectedCount}
          isLoadingTables={state.isLoadingTables}
          loadError={state.loadError}
          onToggleSchema={controller.toggleSchema}
          onToggleTable={controller.toggleTable}
        />
      );
    case 'grouping':
      return (
        <GroupingStep
          groupingStrategy={state.groupingStrategy}
          onGroupingChange={controller.setGroupingStrategy}
        />
      );
    case 'options':
      return (
        <OptionsStep
          includeColumns={state.includeColumns}
          addTests={state.addTests}
          addFreshness={state.addFreshness}
          onIncludeColumnsChange={controller.setIncludeColumns}
          onAddTestsChange={controller.setAddTests}
          onAddFreshnessChange={controller.setAddFreshness}
        />
      );
    case 'review':
      return (
        <ReviewStep
          tables={state.tables}
          selectedCount={controller.selectedCount}
          groupingStrategy={state.groupingStrategy}
          selectedConnectionName={
            controller.selectedConnectionObject?.name ?? copy.selectConnectionError
          }
          includeColumns={state.includeColumns}
          addTests={state.addTests}
          addFreshness={state.addFreshness}
        />
      );
    case 'result':
      return state.importResult ? <ResultStep result={state.importResult} /> : null;
    default:
      return null;
  }
}
