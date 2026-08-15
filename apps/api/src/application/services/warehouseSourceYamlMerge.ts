/** Owned concern: merge generated relational source declarations into dbt source YAML documents. */

import { resolveSourceObjectColumnConstraintSemantics } from '@dvt/contracts';

import { DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR } from './warehouseSourceYamlDescriptor.js';
import { isRecord } from './warehouseSourceYamlDocument.js';
import type {
  ConnectedRelationalSourceObject,
  SourceYamlColumn,
  SourceYamlDocument,
  SourceYamlFreshness,
} from './warehouseSourceYamlTypes.js';

export function upsertSourceTable(
  document: SourceYamlDocument,
  sourceObject: ConnectedRelationalSourceObject,
  options: {
    readonly includeColumns: boolean;
    readonly databaseUser?: string;
    readonly addTests: boolean;
    readonly addFreshness: boolean;
    readonly sourceName?: string;
    readonly tableName?: string;
  }
): SourceYamlDocument {
  const defaultSourceName =
    DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForSourceObject(sourceObject);
  const sourceName = options.sourceName ?? defaultSourceName;
  const tableName =
    options.tableName ?? DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.tableNameForSourceObject(sourceObject);
  const sourcesByName = new Map(document.sources.map((source) => [source.name, source]));
  const existingSource = sourcesByName.get(sourceName);
  const sourceDatabase = existingSource?.database ?? sourceObject.locator.catalog;
  const sourceSchema = existingSource?.schema ?? sourceObject.locator.schema;
  const existingTables = existingSource?.tables ?? [];
  const nextTablesByName = new Map(
    existingTables.map((existingTable) => [existingTable.name, existingTable])
  );
  const existingTable = nextTablesByName.get(tableName);
  const nextTable = {
    name: tableName,
    ...(existingTable?.identifier !== undefined
      ? { identifier: existingTable.identifier }
      : tableName !== sourceObject.locator.name
        ? { identifier: sourceObject.locator.name }
        : {}),
    columns: options.includeColumns
      ? mergeColumns(existingTable?.columns ?? [], buildColumns(sourceObject, options.addTests))
      : (existingTable?.columns ?? []),
    metadata: buildGovernedSourceMetadata(
      existingTable?.metadata ?? {},
      sourceObject.connectionId,
      options.databaseUser
    ),
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

export function buildGovernedSourceMetadata(
  existingMetadata: Readonly<Record<string, unknown>>,
  connectionId: string,
  databaseUser: string | undefined
): Readonly<Record<string, unknown>> {
  const existingMeta = isRecord(existingMetadata.meta) ? existingMetadata.meta : {};
  const { dvt_source_identity: _ownedIdentity, ...userMeta } = existingMeta;
  const { meta: _existingMeta, ...metadataWithoutMeta } = existingMetadata;
  const nextMeta = {
    ...userMeta,
    ...(databaseUser === undefined
      ? {}
      : {
          dvt_source_identity: {
            connection_id: connectionId,
            database_user: databaseUser,
          },
        }),
  };

  return {
    ...metadataWithoutMeta,
    ...(Object.keys(nextMeta).length === 0 ? {} : { meta: nextMeta }),
  };
}

export function buildColumns(
  sourceObject: ConnectedRelationalSourceObject,
  addTests: boolean
): readonly SourceYamlColumn[] {
  return (sourceObject.columns ?? []).map((column): SourceYamlColumn => {
    const constraintSemantics = resolveSourceObjectColumnConstraintSemantics(
      sourceObject,
      column.name
    );
    const tests = addTests
      ? [
          ...(!column.nullable || constraintSemantics.primaryKey ? ['not_null'] : []),
          ...(constraintSemantics.independentlyUnique ? ['unique'] : []),
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
