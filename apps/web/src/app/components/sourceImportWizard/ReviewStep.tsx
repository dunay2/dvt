import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy as copy } from './copy';
import { SourceImportReviewView } from './SourceImportReviewView';
import { buildSourceImportCatalogViewModel } from './sourceImportCatalogModel';
import { buildSourceImportReviewPreviewGroups } from './sourceImportReviewModel';
import type { SourceImportGroupingStrategy, TableInfo } from './types';

interface ReviewStepProps {
  tables: TableInfo[];
  selectedCount: number;
  groupingStrategy: SourceImportGroupingStrategy;
  selectedConnectionName: string;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
  onRemoveTable: (tableIndex: number) => void;
}

export function ReviewStep({
  tables,
  selectedCount,
  groupingStrategy,
  selectedConnectionName,
  sourceImportOptions,
  sourceImportOptionValues,
  onRemoveTable,
}: ReviewStepProps) {
  const catalogViewModel = buildSourceImportCatalogViewModel({
    tables,
    activeTableKey: null,
    copy: copy.catalog,
    numberFormatter: sourceImportCatalogNumberFormatter,
  });
  const previewGroups = buildSourceImportReviewPreviewGroups({
    tables,
    groupingStrategy,
    copy: copy.catalog,
    numberFormatter: sourceImportCatalogNumberFormatter,
  });

  return (
    <SourceImportReviewView
      selectedTables={catalogViewModel.selectedTables}
      previewGroups={previewGroups}
      selectedCount={selectedCount}
      groupingStrategy={groupingStrategy}
      selectedConnectionName={selectedConnectionName}
      sourceImportOptions={sourceImportOptions}
      sourceImportOptionValues={sourceImportOptionValues}
      onRemoveTable={onRemoveTable}
    />
  );
}
