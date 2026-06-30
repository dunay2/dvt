/** Owned concern: merge generated warehouse source declarations into dbt source YAML documents. */
import type { WarehouseTable } from '../ports/warehouseSourceImport.js';

import { DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR } from './warehouseSourceYamlDescriptor.js';
import { isRetiredSourceNameForTable } from './warehouseSourceYamlIdentity.js';
import type {
  SourceYamlColumn,
  SourceYamlDocument,
  SourceYamlFreshness,
} from './warehouseSourceYamlTypes.js';

export function upsertSourceTable(
  document: SourceYamlDocument,
  table: WarehouseTable,
  options: {
    readonly includeColumns: boolean;
    readonly addTests: boolean;
    readonly addFreshness: boolean;
    readonly sourceName?: string;
  }
): SourceYamlDocument {
  const defaultSourceName = DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForTable(table);
  const sourceName = options.sourceName ?? defaultSourceName;
  const tableName = DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.tableNameForTable(table);
  const sourcesByName = new Map(document.sources.map((source) => [source.name, source]));
  const legacySource = document.sources.find(
    (source) =>
      source.name !== sourceName &&
      isRetiredSourceNameForTable(source.name, table, sourceName) &&
      source.database?.toLowerCase() === table.database.toLowerCase() &&
      source.schema?.toLowerCase() === table.schema.toLowerCase()
  );
  if (legacySource !== undefined) {
    sourcesByName.delete(legacySource.name);
  }
  const existingSource = sourcesByName.get(sourceName) ?? legacySource;
  const sourceDatabase = existingSource?.database ?? table.database;
  const sourceSchema = existingSource?.schema ?? table.schema.toLowerCase();
  const existingTables = existingSource?.tables ?? [];
  const nextTablesByName = new Map(
    existingTables.map((existingTable) => [existingTable.name, existingTable])
  );
  const existingTable = nextTablesByName.get(tableName);
  const nextTable = {
    name: tableName,
    columns: options.includeColumns
      ? mergeColumns(existingTable?.columns ?? [], buildColumns(table, options.addTests))
      : (existingTable?.columns ?? []),
    metadata: existingTable?.metadata ?? {},
  };
  nextTablesByName.set(tableName, nextTable);
  sourcesByName.set(sourceName, {
    name: sourceName,
    ...(sourceDatabase !== undefined ? { database: sourceDatabase } : {}),
    ...(sourceSchema !== undefined ? { schema: sourceSchema } : {}),
    ...(existingSource?.freshness
      ? { freshness: existingSource.freshness }
      : options.addFreshness
        ? {
            freshness: {
              ...DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.generatedFreshness,
            } satisfies SourceYamlFreshness,
          }
        : {}),
    tables: Array.from(nextTablesByName.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    metadata: existingSource?.metadata ?? {},
  });

  return {
    metadata: document.metadata,
    sources: Array.from(sourcesByName.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
  };
}

export function buildColumns(
  table: WarehouseTable,
  addTests: boolean
): readonly SourceYamlColumn[] {
  return (table.columns ?? []).map((column): SourceYamlColumn => {
    const tests = addTests
      ? [
          ...(!column.nullable || column.primaryKey === true ? ['not_null'] : []),
          ...(column.primaryKey === true || column.unique === true ? ['unique'] : []),
        ]
      : [];

    return {
      name: column.name,
      ...(column.type.length > 0 ? { dataType: column.type } : {}),
      ...(tests.length > 0 ? { tests } : {}),
      metadata: {},
    };
  });
}

export function mergeColumns(
  existingColumns: readonly SourceYamlColumn[],
  generatedColumns: readonly SourceYamlColumn[]
): readonly SourceYamlColumn[] {
  const columnsByName = new Map(existingColumns.map((column) => [column.name, column]));
  for (const generatedColumn of generatedColumns) {
    const existingColumn = columnsByName.get(generatedColumn.name);
    const dataType = generatedColumn.dataType ?? existingColumn?.dataType;
    const tests = mergeYamlArrays(existingColumn?.tests, generatedColumn.tests);
    columnsByName.set(generatedColumn.name, {
      name: generatedColumn.name,
      ...(dataType !== undefined ? { dataType } : {}),
      ...(tests !== undefined ? { tests } : {}),
      metadata: existingColumn?.metadata ?? {},
    });
  }
  return Array.from(columnsByName.values());
}

export function mergeYamlArrays(
  existingItems: readonly unknown[] | undefined,
  generatedItems: readonly unknown[] | undefined
): readonly unknown[] | undefined {
  const merged = [...(existingItems ?? [])];
  const serializedItems = new Set(merged.map((item) => JSON.stringify(item)));
  for (const generatedItem of generatedItems ?? []) {
    const serializedItem = JSON.stringify(generatedItem);
    if (!serializedItems.has(serializedItem)) {
      merged.push(generatedItem);
      serializedItems.add(serializedItem);
    }
  }
  return merged.length > 0 ? merged : undefined;
}
