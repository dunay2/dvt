import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import type { SourceImportGroupingStrategy, TableInfo } from './types';
import { GroupingStep } from './GroupingStep';
import { OptionsStep } from './OptionsStep';
import { SourceImportActiveTableMetadata } from './SourceImportActiveTableMetadata';

type SourceImportMetadataPanelProps = Readonly<{
  activeTable: TableInfo | null;
  groupingStrategy: SourceImportGroupingStrategy;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
  onGroupingChange: (grouping: SourceImportGroupingStrategy) => void;
  onSourceImportOptionChange: (optionId: SourceImportOptionId, value: boolean) => void;
}>;

export function SourceImportMetadataPanel({
  activeTable,
  groupingStrategy,
  sourceImportOptions,
  sourceImportOptionValues,
  onGroupingChange,
  onSourceImportOptionChange,
}: SourceImportMetadataPanelProps) {
  return (
    <div id="source-import-section-metadata" className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4 lg:order-2">
        <OptionsStep
          sourceImportOptions={sourceImportOptions}
          sourceImportOptionValues={sourceImportOptionValues}
          onSourceImportOptionChange={onSourceImportOptionChange}
        />
        <GroupingStep groupingStrategy={groupingStrategy} onGroupingChange={onGroupingChange} />
      </div>

      <div className="space-y-4 lg:order-1">
        <SourceImportActiveTableMetadata activeTable={activeTable} />
      </div>
    </div>
  );
}
