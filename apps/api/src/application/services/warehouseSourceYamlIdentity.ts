/** Owned concern: resolve stable dbt source YAML identities and retired source names. */
import type { WarehouseTable } from '../ports/warehouseSourceImport.js';

import {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  toCollisionResistantYamlIdentifierPart,
  toStableYamlIdentifierPart,
} from './warehouseSourceYamlDescriptor.js';

export function tableIdentity(table: WarehouseTable): string {
  return JSON.stringify([
    table.connectionId?.toLowerCase() ?? '',
    table.database.toLowerCase(),
    table.schema.toLowerCase(),
    table.table.toLowerCase(),
  ]);
}

export function sourceTableIdentity(table: WarehouseTable): string {
  return JSON.stringify([
    table.connectionId?.toLowerCase() ?? '',
    table.schema.toLowerCase(),
    DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.tableNameForTable(table),
  ]);
}

export function sourceOwnerIdentity(table: WarehouseTable): string {
  return JSON.stringify([
    table.connectionId?.toLowerCase() ?? '',
    table.database.toLowerCase(),
    table.schema.toLowerCase(),
  ]);
}

export function buildCanonicalSourceName(
  table: WarehouseTable,
  collidesAcrossDatabases: boolean,
  collidesAcrossDefaultSourceName = false
): string {
  if (collidesAcrossDefaultSourceName) {
    return (
      table.connectionId
        ? [
            toStableYamlIdentifierPart(table.connectionId),
            toCollisionResistantYamlIdentifierPart(table.database),
            toCollisionResistantYamlIdentifierPart(table.schema),
          ]
        : [
            toCollisionResistantYamlIdentifierPart(table.database),
            toCollisionResistantYamlIdentifierPart(table.schema),
          ]
    ).join('_');
  }
  if (!collidesAcrossDatabases) {
    return DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForTable(table);
  }
  return (
    table.connectionId
      ? [table.connectionId, table.database, table.schema]
      : [table.database, table.schema]
  )
    .map(toStableYamlIdentifierPart)
    .join('_');
}

export function isRetiredSourceNameForTable(
  sourceName: string,
  table: WarehouseTable,
  canonicalSourceName: string
): boolean {
  if (sourceName === canonicalSourceName) {
    return false;
  }
  return new Set(
    [
      toStableYamlIdentifierPart(table.schema),
      [table.database, table.schema].map(toStableYamlIdentifierPart).join('_'),
      table.connectionId
        ? [table.connectionId, table.database, table.schema]
            .map(toStableYamlIdentifierPart)
            .join('_')
        : undefined,
    ].filter((name): name is string => typeof name === 'string' && name.length > 0)
  ).has(sourceName);
}
