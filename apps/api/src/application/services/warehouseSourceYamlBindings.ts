/** Owned concern: bind imported warehouse tables to persisted dbt source YAML entries. */
import type { WarehouseTable } from '../ports/warehouseSourceImport.js';

import {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  groupTablesForYaml,
  toStableYamlIdentifierPart,
} from './warehouseSourceYamlDescriptor.js';
import { readExistingSourceDocument } from './warehouseSourceYamlDocument.js';
import {
  buildCanonicalSourceName,
  isRetiredSourceNameForTable,
  sourceOwnerIdentity,
  sourceTableIdentity,
  tableIdentity,
} from './warehouseSourceYamlIdentity.js';
import type {
  BuildWarehouseSourceYamlBindingsInput,
  SourceYamlDocument,
  WarehouseSourceYamlBinding,
} from './warehouseSourceYamlTypes.js';

export function buildWarehouseSourceYamlBindings(
  input: BuildWarehouseSourceYamlBindingsInput
): ReadonlyMap<string, WarehouseSourceYamlBinding> {
  const tablesByPath = groupTablesForYaml(input.tables, input.groupingStrategy);
  const bindings = new Map<string, WarehouseSourceYamlBinding>();
  const sourceOwnersByDefaultName = buildDefaultSourceNameOwnerIndex(input.tables);

  for (const [path, tables] of tablesByPath.entries()) {
    const existingDocument = readExistingSourceDocument(input.existingFiles.get(path));
    const databasesBySourceTable = buildSourceTableDatabaseIndex(existingDocument, tables);

    for (const table of tables) {
      const tableName = DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.tableNameForTable(table);
      const existingSourceName = findExistingSourceNameForTable(existingDocument, table);
      const collidesAcrossDatabases =
        (databasesBySourceTable.get(sourceTableIdentity(table))?.size ?? 0) > 1;
      const collidesAcrossDefaultSourceName =
        (sourceOwnersByDefaultName.get(
          DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForTable(table)
        )?.size ?? 0) > 1;
      const canonicalSourceName = buildCanonicalSourceName(
        table,
        collidesAcrossDatabases,
        collidesAcrossDefaultSourceName
      );
      const reusableExistingSourceName =
        existingSourceName !== undefined &&
        !isRetiredSourceNameForTable(existingSourceName, table, canonicalSourceName)
          ? existingSourceName
          : undefined;
      bindings.set(tableIdentity(table), {
        path,
        sourceName: reusableExistingSourceName ?? canonicalSourceName,
        tableName,
      });
    }
  }

  return bindings;
}

function buildDefaultSourceNameOwnerIndex(
  tables: readonly WarehouseTable[]
): ReadonlyMap<string, ReadonlySet<string>> {
  const ownersByDefaultName = new Map<string, Set<string>>();
  for (const table of tables) {
    const defaultName = DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForTable(table);
    const owners = ownersByDefaultName.get(defaultName) ?? new Set<string>();
    owners.add(sourceOwnerIdentity(table));
    ownersByDefaultName.set(defaultName, owners);
  }
  return ownersByDefaultName;
}

export function buildSourceTableDatabaseIndex(
  existingDocument: SourceYamlDocument,
  tables: readonly WarehouseTable[]
): ReadonlyMap<string, ReadonlySet<string>> {
  const databasesBySourceTable = new Map<string, Set<string>>();
  const addDatabase = (sourceTableKey: string, database: string): void => {
    const databases = databasesBySourceTable.get(sourceTableKey) ?? new Set<string>();
    databases.add(database.toLowerCase());
    databasesBySourceTable.set(sourceTableKey, databases);
  };

  for (const source of existingDocument.sources) {
    if (source.database === undefined || source.schema === undefined) {
      continue;
    }
    for (const table of source.tables) {
      addDatabase(
        JSON.stringify(['', source.schema.toLowerCase(), table.name.toLowerCase()]),
        source.database
      );
    }
  }

  for (const table of tables) {
    addDatabase(sourceTableIdentity(table), table.database);
  }

  return databasesBySourceTable;
}

export function findExistingSourceNameForTable(
  document: SourceYamlDocument,
  table: WarehouseTable
): string | undefined {
  const database = table.database.toLowerCase();
  const schema = table.schema.toLowerCase();
  const canonicalSourceName = DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForTable(table);
  const matchingSources = document.sources.filter((source) => {
    return source.database?.toLowerCase() === database && source.schema?.toLowerCase() === schema;
  });
  if (table.connectionId) {
    return (
      matchingSources.find((source) => source.name === canonicalSourceName)?.name ??
      matchingSources.find((source) =>
        isRetiredSourceNameForTable(source.name, table, canonicalSourceName)
      )?.name
    );
  }
  return (
    matchingSources.find((source) => source.name === canonicalSourceName)?.name ??
    matchingSources.find(
      (source) =>
        source.name === [table.database, table.schema].map(toStableYamlIdentifierPart).join('_')
    )?.name ??
    matchingSources[0]?.name
  );
}
