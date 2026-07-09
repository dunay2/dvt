import {
  buildSourceImportTableViewModel,
  formatSourceImportTableCount,
  type SourceImportCatalogCopy,
  type SourceImportTableViewModel,
} from './sourceImportCatalogModel';
import { buildSourceImportRegistryPath } from './sourceImportWizardModel';
import type { SourceImportGroupingStrategy, TableInfo } from './types';

export type SourceImportReviewPreviewGroupViewModel = Readonly<{
  registryPath: string;
  tableCountLabel: string;
  tables: readonly SourceImportTableViewModel[];
}>;

export function buildSourceImportReviewPreviewGroups({
  tables,
  groupingStrategy,
  copy,
  numberFormatter = new Intl.NumberFormat(),
}: Readonly<{
  tables: readonly TableInfo[];
  groupingStrategy: SourceImportGroupingStrategy;
  copy: SourceImportCatalogCopy;
  numberFormatter?: Intl.NumberFormat;
}>): readonly SourceImportReviewPreviewGroupViewModel[] {
  const groups = new Map<string, SourceImportTableViewModel[]>();

  tables.forEach((table, index) => {
    if (!table.selected) {
      return;
    }

    const registryPath = buildSourceImportRegistryPath(table, groupingStrategy);
    const groupTables = groups.get(registryPath) ?? [];
    groupTables.push(buildSourceImportTableViewModel(table, index, copy, numberFormatter));
    groups.set(registryPath, groupTables);
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([registryPath, groupTables]) => ({
      registryPath,
      tableCountLabel: formatSourceImportTableCount(groupTables.length, copy, numberFormatter),
      tables: groupTables,
    }));
}
