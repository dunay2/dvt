/** Owned concern: build deterministic dbt source YAML artifacts for warehouse source import. */
import { load as loadYaml } from 'js-yaml';

import type { SourceImportGrouping, WarehouseTable } from '../ports/warehouseSourceImport.js';

type SourceYamlColumn = {
  readonly name: string;
  readonly dataType?: string;
  readonly tests: readonly string[];
};

type SourceYamlTable = {
  readonly name: string;
  readonly columns: readonly SourceYamlColumn[];
};

type SourceYamlFreshness = {
  readonly warnAfterCount: number;
  readonly warnAfterPeriod: 'hour';
};

type SourceYamlSource = {
  readonly name: string;
  readonly database?: string;
  readonly schema?: string;
  readonly freshness?: SourceYamlFreshness;
  readonly tables: readonly SourceYamlTable[];
};

type SourceYamlDocument = {
  readonly sources: readonly SourceYamlSource[];
};

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
    return { sources: [] };
  }

  const loaded = loadYaml(content);
  if (!isRecord(loaded) || !Array.isArray(loaded.sources)) {
    return { sources: [] };
  }

  return {
    sources: loaded.sources
      .filter(isRecord)
      .map((source): SourceYamlSource => {
        const tables = Array.isArray(source.tables)
          ? source.tables.filter(isRecord).map((table) => ({
              name: typeof table.name === 'string' ? table.name : '',
              columns: readExistingColumns(table.columns),
            }))
          : [];
        return {
          name: typeof source.name === 'string' ? source.name : '',
          ...(typeof source.database === 'string' ? { database: source.database } : {}),
          ...(typeof source.schema === 'string' ? { schema: source.schema } : {}),
          tables,
        };
      })
      .filter((source) => source.name.length > 0),
  };
}

export function groupTablesForYaml(
  tables: readonly WarehouseTable[],
  groupingStrategy: SourceImportGrouping
): ReadonlyMap<string, readonly WarehouseTable[]> {
  const grouped = new Map<string, WarehouseTable[]>();
  for (const table of tables) {
    const groupKey =
      groupingStrategy === 'database' ? table.database.toLowerCase() : table.schema.toLowerCase();
    const path = `models/sources/src_${groupKey}.yml`;
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
  const sourceName = table.schema.toLowerCase();
  const tableName = table.table.toLowerCase();
  const sourcesByName = new Map(document.sources.map((source) => [source.name, source]));
  const existingSource = sourcesByName.get(sourceName);
  const existingTables = existingSource?.tables ?? [];
  const nextTable = {
    name: tableName,
    columns: options.includeColumns ? buildColumns(table, options.addTests) : [],
  };
  const nextTablesByName = new Map(
    existingTables.map((existingTable) => [existingTable.name, existingTable])
  );
  nextTablesByName.set(tableName, nextTable);
  sourcesByName.set(sourceName, {
    name: sourceName,
    database: table.database,
    schema: table.schema.toLowerCase(),
    ...(options.addFreshness
      ? { freshness: { warnAfterCount: 24, warnAfterPeriod: 'hour' } satisfies SourceYamlFreshness }
      : existingSource?.freshness
        ? { freshness: existingSource.freshness }
        : {}),
    tables: Array.from(nextTablesByName.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
  });

  return {
    sources: Array.from(sourcesByName.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
  };
}

export function serializeSourceDocument(document: SourceYamlDocument): string {
  const lines = ['version: 2', '', 'sources:'];
  for (const source of document.sources) {
    lines.push(`  - name: ${source.name}`);
    if (source.database) {
      lines.push(`    database: ${source.database}`);
    }
    if (source.schema) {
      lines.push(`    schema: ${source.schema}`);
    }
    if (source.freshness) {
      lines.push('    freshness:');
      lines.push('      warn_after:');
      lines.push(`        count: ${source.freshness.warnAfterCount}`);
      lines.push(`        period: ${source.freshness.warnAfterPeriod}`);
    }
    lines.push('    tables:');
    for (const table of source.tables) {
      lines.push(`      - name: ${table.name}`);
      if (table.columns.length > 0) {
        lines.push('        columns:');
        for (const column of table.columns) {
          lines.push(`          - name: ${column.name}`);
          if (column.dataType) {
            lines.push(`            data_type: ${column.dataType}`);
          }
          if (column.tests.length > 0) {
            lines.push('            tests:');
            for (const testName of column.tests) {
              lines.push(`              - ${testName}`);
            }
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
      tests: addTests && !column.nullable ? ['not_null'] : [],
    })
  );
}

function readExistingColumns(input: unknown): readonly SourceYamlColumn[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter(isRecord).map((column): SourceYamlColumn => {
    const tests = Array.isArray(column.tests)
      ? column.tests.filter((testName): testName is string => typeof testName === 'string')
      : [];
    return {
      name: typeof column.name === 'string' ? column.name : '',
      ...(typeof column.data_type === 'string' ? { dataType: column.data_type } : {}),
      tests,
    };
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}
