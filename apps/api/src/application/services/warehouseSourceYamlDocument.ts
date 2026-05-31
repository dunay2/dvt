/** Owned concern: parse dbt source YAML while preserving user metadata. */
import { load as loadYaml } from 'js-yaml';

import { DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR } from './warehouseSourceYamlDescriptor.js';
import {
  InvalidWarehouseSourceYamlError,
  type SourceYamlColumn,
  type SourceYamlDocument,
  type SourceYamlMetadata,
  type SourceYamlSource,
  type SourceYamlTable,
} from './warehouseSourceYamlTypes.js';

export function readExistingSourceDocument(content: string | undefined): SourceYamlDocument {
  if (content === undefined || content.trim().length === 0) {
    return { metadata: { version: 2 }, sources: [] };
  }

  let loaded: unknown;
  try {
    loaded = loadYaml(content);
  } catch (error) {
    throw new InvalidWarehouseSourceYamlError(error);
  }
  if (!isRecord(loaded) || !Array.isArray(loaded.sources)) {
    return { metadata: { version: 2 }, sources: [] };
  }

  return {
    metadata: readYamlMetadata(loaded, DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.reservedKeys.document),
    sources: loaded.sources
      .filter(isRecord)
      .map((source): SourceYamlSource => {
        const tables = Array.isArray(source.tables)
          ? source.tables
              .filter(isRecord)
              .map(
                (table): SourceYamlTable => ({
                  name: typeof table.name === 'string' ? table.name : '',
                  columns: readExistingColumns(table.columns),
                  metadata: readYamlMetadata(
                    table,
                    DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.reservedKeys.table
                  ),
                })
              )
              .filter((table) => table.name.length > 0)
          : [];
        const freshness = isRecord(source.freshness) ? { freshness: source.freshness } : {};
        return {
          name: typeof source.name === 'string' ? source.name : '',
          ...(typeof source.database === 'string' ? { database: source.database } : {}),
          ...(typeof source.schema === 'string' ? { schema: source.schema } : {}),
          ...freshness,
          tables,
          metadata: readYamlMetadata(
            source,
            DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.reservedKeys.source
          ),
        };
      })
      .filter((source) => source.name.length > 0),
  };
}

export function readExistingColumns(input: unknown): readonly SourceYamlColumn[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter(isRecord)
    .map((column): SourceYamlColumn => {
      return {
        name: typeof column.name === 'string' ? column.name : '',
        ...(typeof column.data_type === 'string' ? { dataType: column.data_type } : {}),
        ...(Array.isArray(column.tests) ? { tests: column.tests } : {}),
        metadata: readYamlMetadata(column, DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.reservedKeys.column),
      };
    })
    .filter((column) => column.name.length > 0);
}

export function readYamlMetadata(
  record: Readonly<Record<string, unknown>>,
  reservedKeys: readonly string[]
): SourceYamlMetadata {
  const reserved = new Set(reservedKeys);
  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) => !reserved.has(key) && value !== undefined)
  );
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}
