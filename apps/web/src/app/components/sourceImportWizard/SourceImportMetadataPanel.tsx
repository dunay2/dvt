import { isRelationalSourceObject } from '@dvt/contracts';

import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { sourceImportWizardCopy as copy } from './copy';
import type { SourceImportGroupingStrategy, SelectableSourceObject } from './types';
import { GroupingStep } from './GroupingStep';
import { OptionsStep } from './OptionsStep';
import { SourceImportActiveObjectMetadata } from './SourceImportActiveObjectMetadata';

type SourceImportMetadataPanelProps = Readonly<{
  activeSourceObject: SelectableSourceObject | null;
  groupingStrategy: SourceImportGroupingStrategy;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
  onGroupingChange: (grouping: SourceImportGroupingStrategy) => void;
  onSourceImportOptionChange: (optionId: SourceImportOptionId, value: boolean) => void;
}>;

export const sourceImportMetadataPanelClassNames = {
  root: 'grid gap-4 lg:grid-cols-[1.05fr_0.95fr]',
  options: 'space-y-4 lg:order-2',
  metadata: 'space-y-4 lg:order-1',
  unavailable:
    'rounded border border-amber-500/40 bg-amber-950/20 p-4 text-sm text-amber-200 lg:order-2',
} as const;

export function SourceImportMetadataPanel({
  activeSourceObject,
  groupingStrategy,
  sourceImportOptions,
  sourceImportOptionValues,
  onGroupingChange,
  onSourceImportOptionChange,
}: SourceImportMetadataPanelProps) {
  const supportsRelationalImport =
    activeSourceObject != null && isRelationalSourceObject(activeSourceObject);

  return (
    <div id="source-import-section-metadata" className={sourceImportMetadataPanelClassNames.root}>
      {supportsRelationalImport ? (
        <div className={sourceImportMetadataPanelClassNames.options}>
          <OptionsStep
            sourceImportOptions={sourceImportOptions}
            sourceImportOptionValues={sourceImportOptionValues}
            onSourceImportOptionChange={onSourceImportOptionChange}
          />
          <GroupingStep groupingStrategy={groupingStrategy} onGroupingChange={onGroupingChange} />
        </div>
      ) : (
        <p className={sourceImportMetadataPanelClassNames.unavailable}>
          {copy.metadata.optionsUnavailable}
        </p>
      )}

      <div className={sourceImportMetadataPanelClassNames.metadata}>
        <SourceImportActiveObjectMetadata activeSourceObject={activeSourceObject} />
      </div>
    </div>
  );
}
