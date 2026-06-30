/** Owned concern: verify warehouse connection metadata with server-resolved credentials. */
import { Client } from 'pg';

import type {
  CreateWarehouseConnectionInput,
  IWarehouseConnectionProbe,
  InspectWarehouseConnectionResult,
  TestWarehouseConnectionResult,
  WarehouseColumn,
  WarehouseConnectionCatalogEntry,
  WarehouseTable,
} from '../../application/ports/warehouseSourceImport.js';

type PostgresTableDiscoveryRow = {
  readonly table_catalog: string;
  readonly table_schema: string;
  readonly table_name: string;
  readonly row_count: number | string | null;
};

type PostgresColumnDiscoveryRow = {
  readonly table_catalog: string;
  readonly table_schema: string;
  readonly table_name: string;
  readonly column_name: string;
  readonly data_type: string;
  readonly is_nullable: 'YES' | 'NO';
  readonly primary_key: boolean;
  readonly unique_column: boolean;
};

export type WarehouseCredentialResolver = {
  resolveCredential(credentialRef: string): Promise<string | null>;
};

export class EnvironmentWarehouseCredentialResolver implements WarehouseCredentialResolver {
  public async resolveCredential(credentialRef: string): Promise<string | null> {
    const envPrefix = 'env:';
    if (!credentialRef.startsWith(envPrefix)) {
      return null;
    }

    const envName = credentialRef.slice(envPrefix.length).trim();
    return envName.length > 0 ? (process.env[envName] ?? null) : null;
  }
}

export class WorkspaceWarehouseConnectionProbe implements IWarehouseConnectionProbe {
  public constructor(
    private readonly options: {
      readonly credentialResolver: WarehouseCredentialResolver;
      readonly now: () => Date;
    }
  ) {}

  public async inspectConnection(
    input: CreateWarehouseConnectionInput
  ): Promise<InspectWarehouseConnectionResult> {
    if (input.type !== 'postgres') {
      return this.failedInspection(
        'unsupported_adapter',
        `Unsupported warehouse adapter: ${input.type}`
      );
    }

    const tables = await this.loadPostgresTables(input.credentialRef);
    if (!tables.ok) {
      return this.failedInspection(tables.reason, tables.message);
    }

    return {
      status: 'passed' as const,
      checkedAt: this.checkedAt(),
      tables: tables.tables,
    };
  }

  public async testConnection(
    input: WarehouseConnectionCatalogEntry
  ): Promise<TestWarehouseConnectionResult> {
    if (input.type !== 'postgres') {
      return this.failed(
        input.id,
        'unsupported_adapter',
        `Unsupported warehouse adapter: ${input.type}`
      );
    }
    if (input.credentialRef === undefined) {
      return this.failed(input.id, 'invalid_credentials', 'Credential reference is missing.');
    }

    const tables = await this.loadPostgresTables(input.credentialRef);
    if (!tables.ok) {
      return this.failed(input.id, tables.reason, tables.message);
    }

    return {
      connectionId: input.id,
      status: 'passed',
      checkedAt: this.checkedAt(),
      tableCount: tables.tables.length,
    };
  }

  private async loadPostgresTables(credentialRef: string): Promise<
    | { readonly ok: true; readonly tables: readonly WarehouseTable[] }
    | {
        readonly ok: false;
        readonly reason: 'invalid_credentials' | 'connection_failed';
        readonly message: string;
      }
  > {
    const connectionString = await this.options.credentialResolver.resolveCredential(credentialRef);
    if (connectionString === null || connectionString.trim().length === 0) {
      return {
        ok: false,
        reason: 'invalid_credentials',
        message: 'Credential reference could not be resolved.',
      };
    }

    const client = new Client({ connectionString });
    try {
      await client.connect();
      const result = await client.query<PostgresTableDiscoveryRow>(
        [
          'select current_database() as table_catalog, namespace.nspname as table_schema, relation.relname as table_name,',
          'case when relation.reltuples >= 0 then relation.reltuples::bigint else null end as row_count',
          'from pg_class relation',
          'join pg_namespace namespace on namespace.oid = relation.relnamespace',
          "where namespace.nspname not in ('pg_catalog', 'information_schema')",
          "and relation.relkind in ('r', 'p', 'v', 'm', 'f')",
          'order by table_catalog, table_schema, table_name',
          'limit 500',
        ].join(' ')
      );
      const columnResult = await client.query<PostgresColumnDiscoveryRow>(
        [
          'select column_info.table_catalog, column_info.table_schema, column_info.table_name,',
          'column_info.column_name, column_info.data_type, column_info.is_nullable,',
          "coalesce(bool_or(constraints.constraint_type = 'PRIMARY KEY'), false) as primary_key,",
          "coalesce(bool_or(constraints.constraint_type = 'UNIQUE'), false) as unique_column",
          'from information_schema.columns column_info',
          'left join information_schema.key_column_usage key_columns',
          'on key_columns.table_catalog = column_info.table_catalog',
          'and key_columns.table_schema = column_info.table_schema',
          'and key_columns.table_name = column_info.table_name',
          'and key_columns.column_name = column_info.column_name',
          'left join information_schema.table_constraints constraints',
          'on constraints.constraint_catalog = key_columns.constraint_catalog',
          'and constraints.constraint_schema = key_columns.constraint_schema',
          'and constraints.constraint_name = key_columns.constraint_name',
          'and constraints.table_schema = column_info.table_schema',
          'and constraints.table_name = column_info.table_name',
          "where column_info.table_schema not in ('pg_catalog', 'information_schema')",
          'group by column_info.table_catalog, column_info.table_schema, column_info.table_name,',
          'column_info.ordinal_position, column_info.column_name, column_info.data_type, column_info.is_nullable',
          'order by column_info.table_catalog, column_info.table_schema, column_info.table_name,',
          'column_info.ordinal_position',
          'limit 5000',
        ].join(' ')
      );
      const columnsByTable = groupPostgresColumnsByTable(columnResult.rows);

      return {
        ok: true,
        tables: result.rows.map((row) =>
          toWarehouseTable(row, columnsByTable.get(postgresTableKey(row)) ?? [])
        ),
      };
    } catch (error) {
      return {
        ok: false,
        reason: classifyPostgresProbeFailure(error),
        message: 'Warehouse connection test failed.',
      };
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private failed(
    connectionId: string,
    reason: 'invalid_credentials' | 'unsupported_adapter' | 'connection_failed',
    message: string
  ): TestWarehouseConnectionResult {
    return {
      connectionId,
      status: 'failed',
      reason,
      message,
      checkedAt: this.checkedAt(),
    };
  }

  private failedInspection(
    reason: 'invalid_credentials' | 'unsupported_adapter' | 'connection_failed',
    message: string
  ): InspectWarehouseConnectionResult {
    return {
      status: 'failed',
      reason,
      message,
      checkedAt: this.checkedAt(),
    };
  }

  private checkedAt(): string {
    return this.options.now().toISOString();
  }
}

function toWarehouseTable(
  row: PostgresTableDiscoveryRow,
  columns: readonly WarehouseColumn[]
): WarehouseTable {
  const rowCount = parseOptionalRowCount(row.row_count);
  return {
    database: row.table_catalog,
    schema: row.table_schema,
    table: row.table_name,
    ...(rowCount !== undefined ? { rowCount } : {}),
    ...(columns.length > 0 ? { columns } : {}),
  };
}

function groupPostgresColumnsByTable(
  rows: readonly PostgresColumnDiscoveryRow[]
): ReadonlyMap<string, readonly WarehouseColumn[]> {
  const columnsByTable = new Map<string, WarehouseColumn[]>();
  for (const row of rows) {
    const key = postgresTableKey(row);
    const columns = columnsByTable.get(key) ?? [];
    columns.push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      ...(row.primary_key ? { primaryKey: true } : {}),
      ...(row.unique_column ? { unique: true } : {}),
    });
    columnsByTable.set(key, columns);
  }
  return columnsByTable;
}

function postgresTableKey(
  row: Pick<PostgresTableDiscoveryRow, 'table_catalog' | 'table_schema' | 'table_name'>
): string {
  return `${row.table_catalog.toLowerCase()}.${row.table_schema.toLowerCase()}.${row.table_name.toLowerCase()}`;
}

function parseOptionalRowCount(value: number | string | null): number | undefined {
  if (value === null) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function classifyPostgresProbeFailure(error: unknown): 'invalid_credentials' | 'connection_failed' {
  return isPgAuthError(error) ? 'invalid_credentials' : 'connection_failed';
}

function isPgAuthError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { readonly code?: unknown }).code === '28P01'
  );
}
