/** Owned concern: build deterministic dbt source YAML artifacts for warehouse source import. */
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';

import type { SourceImportGrouping, WarehouseTable } from '../ports/warehouseSourceImport.js';

type SourceYamlMetadata = Readonly<Record<string, unknown>>;

type SourceYamlColumn = {
  readonly name: string;
  readonly dataType?: string;
  readonly tests?: readonly unknown[];
  readonly metadata: SourceYamlMetadata;
};

type SourceYamlTable = {
  readonly name: string;
  readonly columns: readonly SourceYamlColumn[];
  readonly metadata: SourceYamlMetadata;
};

type GeneratedSourceYamlFreshness = {
  readonly warnAfterCount: number;
  readonly warnAfterPeriod: 'hour';
  readonly errorAfterCount: number;
  readonly errorAfterPeriod: 'hour';
};

type SourceYamlFreshness = GeneratedSourceYamlFreshness | SourceYamlMetadata;

type SourceYamlSource = {
  readonly name: string;
  readonly database?: string;
  readonly schema?: string;
  readonly freshness?: SourceYamlFreshness;
  readonly tables: readonly SourceYamlTable[];
  readonly metadata: SourceYamlMetadata;
};

type SourceYamlDocument = {
  readonly sources: readonly SourceYamlSource[];
  readonly metadata: SourceYamlMetadata;
};

export type WarehouseSourceYamlArtifactDescriptor = {
  readonly pluginId: string;
  readonly artifactKind: string;
  readonly pathForTable: (table: WarehouseTable, groupingStrategy: SourceImportGrouping) => string;
  readonly sourceNameForTable: (table: WarehouseTable) => string;
  readonly tableNameForTable: (table: WarehouseTable) => string;
  readonly generatedFreshness: GeneratedSourceYamlFreshness;
  readonly reservedKeys: {
    readonly document: readonly string[];
    readonly source: readonly string[];
    readonly table: readonly string[];
    readonly column: readonly string[];
  };
};

export const DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR: WarehouseSourceYamlArtifactDescriptor = {
  pluginId: 'dbt',
  artifactKind: 'dbt-source-yaml',
  pathForTable: (table, groupingStrategy) => {
    const groupKey =
      groupingStrategy === 'database' ? table.database.toLowerCase() : table.schema.toLowerCase();
    return `models/sources/src_${groupKey}.yml`;
  },
  sourceNameForTable: (table) => table.schema.toLowerCase(),
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

export class InvalidWarehouseSourceYamlError extends Error {
  public constructor(readonly cause: unknown) {
    super('Existing dbt source YAML could not be parsed.');
    this.name = 'InvalidWarehouseSourceYamlError';
  }
}

export type WarehouseSourceYamlUpdate = {
  readonly path: string;
  readonly content: string;
};

export type BuildWarehouseSourceYamlUpdatesInput = {
  readonly tables: readonly WarehouseTable[];
  readonly groupingStrategy: SourceImportGrouping;
  readonly includeColumns: boolean;
  readonly addTests: boolean;
  readonly addFreshness: boolean;
  readonly existingFiles: ReadonlyMap<string, string>;
};

export function buildWarehouseSourceYamlUpdates(
  input: BuildWarehouseSourceYamlUpdatesInput
): readonly WarehouseSourceYamlUpdate[] {
  const tablesByPath = groupTablesForYaml(input.tables, input.groupingStrategy);
  return Array.from(tablesByPath.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, tables]) => {
      const existingDocument = readExistingSourceDocument(input.existingFiles.get(path));
      const nextDocument = tables.reduce(
        (document, table) =>
          upsertSourceTable(document, table, {
            includeColumns: input.includeColumns,
            addTests: input.addTests,
            addFreshness: input.addFreshness,
          }),
        existingDocument
      );
      return { path, content: serializeSourceDocument(nextDocument) };
    });
}

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

export function upsertSourceTable(
  document: SourceYamlDocument,
  table: WarehouseTable,
  options: {
    readonly includeColumns: boolean;
    readonly addTests: boolean;
    readonly addFreshness: boolean;
  }
): SourceYamlDocument {
  const sourceName = DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForTable(table);
  const tableName = DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.tableNameForTable(table);
  const sourcesByName = new Map(document.sources.map((source) => [source.name, source]));
  const existingSource = sourcesByName.get(sourceName);
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

export function serializeSourceDocument(document: SourceYamlDocument): string {
  const lines: string[] = [];
  appendYamlMetadata(lines, { version: 2, ...document.metadata }, 0);
  lines.push('');
  lines.push('sources:');
  for (const source of document.sources) {
    lines.push(`  - name: ${source.name}`);
    if (source.database !== undefined) {
      appendYamlEntry(lines, 'database', source.database, 4);
    }
    if (source.schema !== undefined) {
      appendYamlEntry(lines, 'schema', source.schema, 4);
    }
    appendYamlMetadata(lines, source.metadata, 4);
    if (source.freshness) {
      if (isGeneratedFreshness(source.freshness)) {
        lines.push('    freshness:');
        lines.push('      warn_after:');
        lines.push(`        count: ${source.freshness.warnAfterCount}`);
        lines.push(`        period: ${source.freshness.warnAfterPeriod}`);
        lines.push('      error_after:');
        lines.push(`        count: ${source.freshness.errorAfterCount}`);
        lines.push(`        period: ${source.freshness.errorAfterPeriod}`);
      } else {
        appendYamlEntry(lines, 'freshness', source.freshness, 4);
      }
    }
    lines.push('    tables:');
    for (const table of source.tables) {
      lines.push(`      - name: ${table.name}`);
      appendYamlMetadata(lines, table.metadata, 8);
      if (table.columns.length > 0) {
        lines.push('        columns:');
        for (const column of table.columns) {
          lines.push(`          - name: ${column.name}`);
          if (column.dataType) {
            lines.push(`            data_type: ${column.dataType}`);
          }
          appendYamlMetadata(lines, column.metadata, 12);
          if (column.tests && column.tests.length > 0) {
            appendYamlEntry(lines, 'tests', column.tests, 12);
          }
        }
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

function buildColumns(table: WarehouseTable, addTests: boolean): readonly SourceYamlColumn[] {
  return (table.columns ?? []).map(
    (column): SourceYamlColumn => ({
      name: column.name,
      ...(column.type.length > 0 ? { dataType: column.type } : {}),
      ...(addTests && !column.nullable ? { tests: ['not_null'] } : {}),
      metadata: {},
    })
  );
}

function readExistingColumns(input: unknown): readonly SourceYamlColumn[] {
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

function mergeColumns(
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

function mergeYamlArrays(
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

function readYamlMetadata(
  record: Readonly<Record<string, unknown>>,
  reservedKeys: readonly string[]
): SourceYamlMetadata {
  const reserved = new Set(reservedKeys);
  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) => !reserved.has(key) && value !== undefined)
  );
}

function appendYamlMetadata(
  lines: string[],
  metadata: SourceYamlMetadata,
  indentSpaces: number
): void {
  for (const [key, value] of Object.entries(metadata)) {
    appendYamlEntry(lines, key, value, indentSpaces);
  }
}

function appendYamlEntry(lines: string[], key: string, value: unknown, indentSpaces: number): void {
  if (value === undefined) {
    return;
  }

  const indent = ' '.repeat(indentSpaces);
  const dumped = dumpYaml({ [key]: value }, { lineWidth: -1, noRefs: true, sortKeys: false })
    .trimEnd()
    .split('\n');
  for (const line of dumped) {
    lines.push(`${indent}${line}`);
  }
}

function isGeneratedFreshness(value: SourceYamlFreshness): value is GeneratedSourceYamlFreshness {
  return (
    isRecord(value) &&
    typeof value.warnAfterCount === 'number' &&
    value.warnAfterPeriod === 'hour' &&
    typeof value.errorAfterCount === 'number' &&
    value.errorAfterPeriod === 'hour'
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}
