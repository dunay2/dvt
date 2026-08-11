import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { useSourceImportLocalization } from './copy';
import { SourceImportReviewView } from './SourceImportReviewView';
import { buildSourceImportCatalogViewModel } from './sourceImportCatalogModel';
import { buildSourceImportReviewPreviewGroups } from './sourceImportReviewModel';
import type { SourceImportGroupingStrategy, SelectableSourceObject } from './types';

interface ReviewStepProps {
  sourceObjects: SelectableSourceObject[];
  selectedCount: number;
  groupingStrategy: SourceImportGroupingStrategy;
  selectedConnectionName: string;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
  onRemoveSourceObject: (sourceObjectIndex: number) => void;
}

export function ReviewStep({
  sourceObjects,
  selectedCount,
  groupingStrategy,
  selectedConnectionName,
  sourceImportOptions,
  sourceImportOptionValues,
  onRemoveSourceObject,
}: ReviewStepProps) {
  const { copy, numberFormatter } = useSourceImportLocalization();
  const catalogViewModel = buildSourceImportCatalogViewModel({
    sourceObjects,
    activeSourceObjectKey: null,
    copy: copy.catalog,
    numberFormatter,
  });
  const previewGroups = buildSourceImportReviewPreviewGroups({
    sourceObjects,
    groupingStrategy,
    copy: copy.catalog,
    numberFormatter,
  });

  return (
    <SourceImportReviewView
      selectedSourceObjects={catalogViewModel.selectedSourceObjects}
      previewGroups={previewGroups}
      selectedCount={selectedCount}
      groupingStrategy={groupingStrategy}
      selectedConnectionName={selectedConnectionName}
      sourceImportOptions={sourceImportOptions}
      sourceImportOptionValues={sourceImportOptionValues}
      onRemoveSourceObject={onRemoveSourceObject}
    />
  );
}
