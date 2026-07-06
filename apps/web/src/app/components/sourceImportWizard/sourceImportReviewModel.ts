import {
  buildSourceImportTableViewModel,
  formatSourceImportTableCount,
  type SourceImportCatalogCopy,
  type SourceImportTableViewModel,
} from './sourceImportCatalogModel';
import type { TableInfo } from './types';

export type SourceImportReviewPreviewGroupViewModel = Readonly<{
  key: string;
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
  groupingStrategy: 'schema' | 'database' | 'custom';
  copy: SourceImportCatalogCopy;
  numberFormatter?: Intl.NumberFormat;
}>): readonly SourceImportReviewPreviewGroupViewModel[] {
  const groups = new Map<string, SourceImportTableViewModel[]>();

  tables.forEach((table, index) => {
    if (!table.selected) {
      return;
    }

    const key = groupingStrategy === 'schema' ? table.schema : table.database;
    const groupTables = groups.get(key) ?? [];
    groupTables.push(buildSourceImportTableViewModel(table, index, copy, numberFormatter));
    groups.set(key, groupTables);
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, groupTables]) => ({
      key,
      tableCountLabel: formatSourceImportTableCount(groupTables.length, copy, numberFormatter),
      tables: groupTables,
    }));
}
