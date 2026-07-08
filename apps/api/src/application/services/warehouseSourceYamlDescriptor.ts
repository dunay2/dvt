/** Owned concern: define dbt source YAML naming and path policy. */
import type { SourceImportGrouping, WarehouseTable } from '../ports/warehouseSourceImport.js';

import type { WarehouseSourceYamlArtifactDescriptor } from './warehouseSourceYamlTypes.js';

export const DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR: WarehouseSourceYamlArtifactDescriptor = {
  pluginId: 'dbt',
  artifactKind: 'dbt-source-yaml',
  pathForTable: (table, groupingStrategy) => {
    const groupKey =
      groupingStrategy === 'database'
        ? toStableYamlIdentifierPart(table.database)
        : toStableYamlIdentifierPart(table.schema);
    return `models/sources/src_${groupKey}.yml`;
  },
  sourceNameForTable: (table) =>
    (table.connectionId ? [table.connectionId, table.database, table.schema] : [table.schema])
      .map(toStableYamlIdentifierPart)
      .join('_'),
  tableNameForTable: (table) => table.table.toLowerCase(),
  generatedFreshness: {
    warnAfterCount: 24,
    warnAfterPeriod: 'hour',
    errorAfterCount: 48,
    errorAfterPeriod: 'hour',
  },
  reservedKeys: {
    document: ['sources'],
    source: ['name', 'database', 'schema', 'freshness', 'tables'],
    table: ['name', 'columns'],
    column: ['name', 'data_type', 'tests'],
  },
};

export function buildWarehouseSourceYamlPath(
  table: WarehouseTable,
  groupingStrategy: SourceImportGrouping
): string {
  return DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.pathForTable(table, groupingStrategy);
}

export function groupTablesForYaml(
  tables: readonly WarehouseTable[],
  groupingStrategy: SourceImportGrouping
): ReadonlyMap<string, readonly WarehouseTable[]> {
  const grouped = new Map<string, WarehouseTable[]>();
  for (const table of tables) {
    const path = buildWarehouseSourceYamlPath(table, groupingStrategy);
    const group = grouped.get(path) ?? [];
    group.push(table);
    grouped.set(path, group);
  }
  return grouped;
}

export function toStableYamlIdentifierPart(part: string): string {
  const normalized = part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'unnamed';
}
