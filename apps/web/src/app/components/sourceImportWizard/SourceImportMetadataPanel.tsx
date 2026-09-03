import { isRelationalSourceObject } from '@dvt/contracts';

import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { useSourceImportLocalization } from './copy';
import type { SourceImportGroupingStrategy, SelectableSourceObject } from './types';
import { GroupingStep } from './GroupingStep';
import { OptionsStep } from './OptionsStep';
import { SourceImportObjectsMetadata } from './SourceImportObjectsMetadata';

type SourceImportMetadataPanelProps = Readonly<{
  selectedSourceObjects: readonly SelectableSourceObject[];
  activeSourceObjectKey: string | null;
  groupingStrategy: SourceImportGroupingStrategy;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
  onGroupingChange: (grouping: SourceImportGroupingStrategy) => void;
  onSourceImportOptionChange: (optionId: SourceImportOptionId, value: boolean) => void;
}>;

export const sourceImportMetadataPanelClassNames = {
  root: 'space-y-6',
  options: 'space-y-4 border-t border-slate-700 pt-5',
  optionsHeading: 'space-y-1',
  optionsTitle: 'text-lg font-medium',
  optionsDescription: 'text-sm text-slate-300',
  metadata: 'space-y-4',
  unavailable: 'rounded border border-amber-500/40 bg-amber-950/20 p-4 text-sm text-amber-200',
} as const;

export function SourceImportMetadataPanel({
  selectedSourceObjects,
  activeSourceObjectKey,
  groupingStrategy,
  sourceImportOptions,
  sourceImportOptionValues,
  onGroupingChange,
  onSourceImportOptionChange,
}: SourceImportMetadataPanelProps) {
  const { copy } = useSourceImportLocalization();
  const supportsRelationalImport =
    selectedSourceObjects.length > 0 && selectedSourceObjects.every(isRelationalSourceObject);

  return (
    <div id="source-import-section-metadata" className={sourceImportMetadataPanelClassNames.root}>
      <div
        className={sourceImportMetadataPanelClassNames.metadata}
        data-source-import-object-metadata-region
      >
        <SourceImportObjectsMetadata
          sourceObjects={selectedSourceObjects}
          activeSourceObjectKey={activeSourceObjectKey}
          scope="selected"
        />
      </div>

      {supportsRelationalImport ? (
        <section
          className={sourceImportMetadataPanelClassNames.options}
          data-source-import-global-options-region
        >
          <header className={sourceImportMetadataPanelClassNames.optionsHeading}>
            <h3 className={sourceImportMetadataPanelClassNames.optionsTitle}>
              {copy.metadata.globalOptionsTitle}
            </h3>
            <p className={sourceImportMetadataPanelClassNames.optionsDescription}>
              {copy.metadata.globalOptionsDescription}
            </p>
          </header>
          <OptionsStep
            sourceImportOptions={sourceImportOptions}
            sourceImportOptionValues={sourceImportOptionValues}
            onSourceImportOptionChange={onSourceImportOptionChange}
          />
          <GroupingStep groupingStrategy={groupingStrategy} onGroupingChange={onGroupingChange} />
        </section>
      ) : (
        <p className={sourceImportMetadataPanelClassNames.unavailable}>
          {copy.metadata.optionsUnavailable}
        </p>
      )}
    </div>
  );
}
