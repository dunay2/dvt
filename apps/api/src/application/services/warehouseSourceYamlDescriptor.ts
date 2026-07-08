/** Owned concern: define dbt source YAML naming and path policy. */
import { createHash } from 'node:crypto';

import type { SourceImportGrouping, WarehouseTable } from '../ports/warehouseSourceImport.js';

import type { WarehouseSourceYamlArtifactDescriptor } from './warehouseSourceYamlTypes.js';

export const DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR: WarehouseSourceYamlArtifactDescriptor = {
  pluginId: 'dbt',
  artifactKind: 'dbt-source-yaml',
  pathForTable: (table, groupingStrategy) => {
    return buildWarehouseSourceYamlPathFromPart(
      toStableYamlIdentifierPart(groupingValue(table, groupingStrategy))
    );
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
  const rawValuesByStablePart = new Map<string, Set<string>>();

  for (const table of tables) {
    const value = groupingValue(table, groupingStrategy);
    const stablePart = toStableYamlIdentifierPart(value);
    const rawValues = rawValuesByStablePart.get(stablePart) ?? new Set<string>();
    rawValues.add(value.toLowerCase());
    rawValuesByStablePart.set(stablePart, rawValues);
  }

  const collidingStableParts = new Set(
    Array.from(rawValuesByStablePart.entries())
      .filter(([, rawValues]) => rawValues.size > 1)
      .map(([stablePart]) => stablePart)
  );

  for (const table of tables) {
    const value = groupingValue(table, groupingStrategy);
    const stablePart = toStableYamlIdentifierPart(value);
    const path = buildWarehouseSourceYamlPathFromPart(
      collidingStableParts.has(stablePart)
        ? toCollisionResistantYamlIdentifierPart(value)
        : stablePart
    );
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

export function toCollisionResistantYamlIdentifierPart(part: string): string {
  const stablePart = toStableYamlIdentifierPart(part);
  const canonicalInput = part.trim().toLowerCase();
  if (canonicalInput === stablePart) {
    return stablePart;
  }
  const hash = createHash('sha256')
    .update(canonicalInput.length > 0 ? canonicalInput : part)
    .digest('hex')
    .slice(0, 8);
  return `${stablePart}_${hash}`;
}

function groupingValue(table: WarehouseTable, groupingStrategy: SourceImportGrouping): string {
  return groupingStrategy === 'database' ? table.database : table.schema;
}

function buildWarehouseSourceYamlPathFromPart(groupPart: string): string {
  return `models/sources/src_${groupPart}.yml`;
}
