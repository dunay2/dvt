/** Owned concern: verify warehouse connection metadata with server-resolved credentials. */
import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import {
  buildRelationalSourceObjectId,
  SourceObjectConstraintSchema,
  type RelationalSourceObjectLocator,
  type SourceObject,
  type SourceObjectColumn,
  type SourceObjectConstraint,
} from '@dvt/contracts';
import { Client } from 'pg';

import type {
  IWarehouseConnectionProbe,
  InspectWarehouseConnectionResult,
  TestWarehouseConnectionResult,
  WarehouseConnectionCatalogEntry,
  WarehouseConnectionProbeTarget,
} from '../../application/ports/warehouseSourceImport.js';

import {
  buildPostgresSourceObjectMetricEvidence,
  type PostgresRowCountEvidence,
} from './postgresSourceObjectMetricEvidence.js';

type PostgresTableDiscoveryRow = {
  readonly table_catalog: string;
  readonly table_schema: string;
  readonly table_name: string;
  readonly database_user?: string;
  readonly relation_kind: 'r' | 'p' | 'v' | 'm' | 'f';
  readonly row_count: number | string | null;
};

type PostgresByteSizeRow = {
  readonly byte_size: number | string | null;
};

type PostgresRowCountRow = {
  readonly row_count: number | string | null;
};

type PostgresColumnDiscoveryRow = {
  readonly table_catalog: string;
  readonly table_schema: string;
  readonly table_name: string;
  readonly column_name: string;
  readonly data_type: string;
  readonly is_nullable: 'YES' | 'NO';
  readonly constraints?: unknown;
};

type PostgresObjectCountRow = {
  readonly object_count: number | string;
};

type PostgresQueryResult<T> = {
  readonly rows: readonly T[];
  readonly fields?: readonly PostgresField[];
};

type PostgresField = {
  readonly name: string;
  readonly dataTypeID?: number;
};

type PostgresExplainRow = Readonly<Record<'QUERY PLAN', unknown>>;

const EXACT_ROW_COUNT_TIMEOUT_MS = 2000;

export class WorkspaceWarehouseConnectionProbe implements IWarehouseConnectionProbe {
  public constructor(
    private readonly options: {
      readonly credentialResolver: IPostgresCredentialBindingResolver;
      readonly now: () => Date;
    }
  ) {}

  public async inspectConnection(
    input: WarehouseConnectionProbeTarget
  ): Promise<InspectWarehouseConnectionResult> {
    if (input.type !== 'postgres') {
      return this.failedInspection(
        'unsupported_adapter',
        `Unsupported warehouse adapter: ${input.type}`
      );
    }

    const observedAt = this.checkedAt();
    const sourceObjects = await this.loadPostgresSourceObjects(input.credentialRef, observedAt);
    if (!sourceObjects.ok) {
      return this.failedInspection(sourceObjects.reason, sourceObjects.message);
    }

    return {
      status: 'passed' as const,
      checkedAt: observedAt,
      ...(sourceObjects.databaseUser === undefined
        ? {}
        : { databaseUser: sourceObjects.databaseUser }),
      sourceObjects: sourceObjects.sourceObjects,
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

    const connection = await this.testPostgresConnection(input.credentialRef);
    if (!connection.ok) {
      return this.failed(input.id, connection.reason, connection.message);
    }

    return {
      connectionId: input.id,
      status: 'passed',
      checkedAt: this.checkedAt(),
      objectCount: connection.objectCount,
    };
  }

  private async loadPostgresSourceObjects(
    credentialRef: string,
    observedAt: string
  ): Promise<
    | {
        readonly ok: true;
        readonly databaseUser?: string;
        readonly sourceObjects: readonly SourceObject[];
      }
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
          'select current_database() as table_catalog, current_user as database_user, namespace.nspname as table_schema, relation.relname as table_name, relation.relkind as relation_kind,',
          "case when relation.reltuples >= 0 then relation.reltuples::bigint when relation.relkind in ('r', 'p', 'm') then pg_stat_get_live_tuples(relation.oid)::bigint else null end as row_count",
          'from pg_class relation',
          'join pg_namespace namespace on namespace.oid = relation.relnamespace',
          "where namespace.nspname not in ('pg_catalog', 'information_schema')",
          "and relation.relkind in ('r', 'p', 'v', 'm', 'f')",
          "and has_table_privilege(relation.oid, 'SELECT')",
          'order by table_catalog, table_schema, table_name',
        ].join(' ')
      );
      const columnRows = await loadPostgresCatalogColumns(client);
      const columnsByTable = groupPostgresColumnsByTable(columnRows);
      const constraintsByTable = groupPostgresConstraintsByTable(columnRows);

      const sourceObjects: SourceObject[] = [];
      for (const row of result.rows) {
        const sourceObject = await toPostgresSourceObject(
          client,
          row,
          columnsByTable.get(postgresTableKey(row)) ?? [],
          constraintsByTable.get(postgresTableKey(row)) ?? [],
          observedAt
        );
        if (sourceObject !== null) {
          sourceObjects.push(sourceObject);
        }
      }

      const databaseUser = parseOptionalNonBlankString(result.rows[0]?.database_user);
      return {
        ok: true,
        ...(databaseUser === undefined ? {} : { databaseUser }),
        sourceObjects,
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

  private async testPostgresConnection(credentialRef: string): Promise<
    | { readonly ok: true; readonly objectCount: number }
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
      const result = await client.query<PostgresObjectCountRow>(
        [
          'select count(*)::bigint as object_count',
          'from pg_class relation',
          'join pg_namespace namespace on namespace.oid = relation.relnamespace',
          "where namespace.nspname not in ('pg_catalog', 'information_schema')",
          "and relation.relkind in ('r', 'p', 'v', 'm', 'f')",
          "and has_table_privilege(relation.oid, 'SELECT')",
        ].join(' ')
      );
      const objectCount = parseOptionalNonNegativeInteger(result.rows[0]?.object_count);
      if (objectCount === undefined) {
        throw new Error('Postgres relation count was not a non-negative safe integer.');
      }
      return { ok: true, objectCount };
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

async function loadPostgresCatalogColumns(
  client: Pick<Client, 'query'>
): Promise<readonly PostgresColumnDiscoveryRow[]> {
  try {
    const columnResult = await client.query<PostgresColumnDiscoveryRow>(
      [
        'with discovered_relations as (',
        'select current_database() as table_catalog, namespace.nspname as table_schema, relation.relname as table_name',
        'from pg_class relation',
        'join pg_namespace namespace on namespace.oid = relation.relnamespace',
        "where namespace.nspname not in ('pg_catalog', 'information_schema')",
        "and relation.relkind in ('r', 'p', 'v', 'm', 'f')",
        "and has_table_privilege(relation.oid, 'SELECT')",
        'order by table_catalog, table_schema, table_name',
        ')',
        ', relation_constraints as (',
        'select constraints.constraint_catalog as table_catalog, constraints.constraint_schema as table_schema,',
        'constraints.table_name, constraints.constraint_name, constraints.constraint_type,',
        'array_agg(key_columns.column_name order by key_columns.ordinal_position) as column_names',
        'from information_schema.table_constraints constraints',
        'join information_schema.key_column_usage key_columns',
        'on key_columns.constraint_catalog = constraints.constraint_catalog',
        'and key_columns.constraint_schema = constraints.constraint_schema',
        'and key_columns.constraint_name = constraints.constraint_name',
        'and key_columns.table_schema = constraints.table_schema',
        'and key_columns.table_name = constraints.table_name',
        "where constraints.constraint_type in ('PRIMARY KEY', 'UNIQUE')",
        'group by constraints.constraint_catalog, constraints.constraint_schema, constraints.table_name,',
        'constraints.constraint_name, constraints.constraint_type',
        ')',
        'select column_info.table_catalog, column_info.table_schema, column_info.table_name,',
        'column_info.column_name, column_info.data_type, column_info.is_nullable,',
        "coalesce(jsonb_agg(distinct jsonb_build_object('name', constraint_info.constraint_name, 'kind', case when constraint_info.constraint_type = 'PRIMARY KEY' then 'primary-key' else 'unique' end, 'columns', constraint_info.column_names)) filter (where constraint_info.constraint_name is not null), '[]'::jsonb) as constraints",
        'from discovered_relations discovered',
        'join information_schema.columns column_info',
        'on column_info.table_catalog = discovered.table_catalog',
        'and column_info.table_schema = discovered.table_schema',
        'and column_info.table_name = discovered.table_name',
        'left join relation_constraints constraint_info',
        'on constraint_info.table_catalog = column_info.table_catalog',
        'and constraint_info.table_schema = column_info.table_schema',
        'and constraint_info.table_name = column_info.table_name',
        'and column_info.column_name = any(constraint_info.column_names)',
        'group by column_info.table_catalog, column_info.table_schema, column_info.table_name,',
        'column_info.ordinal_position, column_info.column_name, column_info.data_type, column_info.is_nullable',
        'order by column_info.table_catalog, column_info.table_schema, column_info.table_name,',
        'column_info.ordinal_position',
      ].join(' ')
    );
    return columnResult.rows;
  } catch (error) {
    if (isPostgresPermissionError(error)) {
      return [];
    }
    throw error;
  }
}

async function toPostgresSourceObject(
  client: Pick<Client, 'query'>,
  row: PostgresTableDiscoveryRow,
  columns: readonly SourceObjectColumn[],
  constraints: readonly SourceObjectConstraint[],
  observedAt: string
): Promise<SourceObject | null> {
  const fallbackColumns =
    columns.length > 0 ? columns : await loadPostgresColumnsFromDataPlane(client, row);
  const rowCount =
    resolvePostgresStatisticsRowCount(row.row_count) ??
    (await loadPostgresPlanRowCount(client, row)) ??
    (await loadPostgresExactRowCount(client, row));
  if (rowCount === null) {
    return null;
  }
  const byteSize = await loadPostgresRelationByteSize(client, row);

  const metricEvidence = buildPostgresSourceObjectMetricEvidence({
    observedAt,
    rowCount,
    byteSize: byteSize ?? null,
    columns: fallbackColumns,
  });
  const locator: RelationalSourceObjectLocator = {
    kind: 'relation',
    catalog: row.table_catalog,
    schema: row.table_schema,
    name: row.table_name,
    relationType: postgresRelationType(row.relation_kind),
  };
  return {
    objectId: buildRelationalSourceObjectId(locator),
    displayName: row.table_name,
    locator,
    metricEvidence,
    ...(fallbackColumns.length > 0 ? { columns: [...fallbackColumns] } : {}),
    ...(constraints.length > 0 ? { constraints: [...constraints] } : {}),
  };
}

async function loadPostgresExactRowCount(
  client: Pick<Client, 'query'>,
  row: PostgresTableDiscoveryRow
): Promise<PostgresRowCountEvidence | null> {
  try {
    await client.query(`set statement_timeout = '${EXACT_ROW_COUNT_TIMEOUT_MS}ms'`);
    const result = (await client.query(
      `select count(*)::bigint as row_count from ${toPostgresQualifiedTableName(row)}`
    )) as PostgresQueryResult<PostgresRowCountRow>;
    const rowCount = parseOptionalRowCount(result.rows[0]?.row_count);
    return rowCount === undefined
      ? null
      : {
          value: rowCount,
          provenance: 'measured',
          method: 'data-scan',
          confidence: 'exact',
        };
  } catch (_error) {
    return null;
  } finally {
    await client.query('reset statement_timeout').catch(() => undefined);
  }
}

async function loadPostgresRelationByteSize(
  client: Pick<Client, 'query'>,
  row: PostgresTableDiscoveryRow
): Promise<number | null> {
  try {
    const relationName = toPostgresQualifiedTableName(row);
    const result = (await client.query(
      `select pg_total_relation_size(${quotePostgresLiteral(relationName)}::regclass)::bigint as byte_size`
    )) as PostgresQueryResult<PostgresByteSizeRow>;
    return parseOptionalByteSize(result.rows[0]?.byte_size) ?? null;
  } catch (_error) {
    return null;
  }
}

function resolvePostgresStatisticsRowCount(
  value: number | string | null
): PostgresRowCountEvidence | null {
  const rowCount = parseOptionalRowCount(value);
  return rowCount === undefined
    ? null
    : {
        value: rowCount,
        provenance: 'estimated',
        method: 'provider-statistics',
        confidence: 'medium',
      };
}

async function loadPostgresPlanRowCount(
  client: Pick<Client, 'query'>,
  row: PostgresTableDiscoveryRow
): Promise<PostgresRowCountEvidence | null> {
  try {
    const result = (await client.query(
      `explain (format json) select * from ${toPostgresQualifiedTableName(row)}`
    )) as PostgresQueryResult<PostgresExplainRow>;
    const rowCount = parsePostgresExplainRowCount(result.rows[0]?.['QUERY PLAN']);
    return rowCount === undefined
      ? null
      : {
          value: rowCount,
          provenance: 'estimated',
          method: 'query-plan',
          confidence: 'low',
        };
  } catch (_error) {
    return null;
  }
}

function parsePostgresExplainRowCount(value: unknown): number | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  const root = value[0];
  if (typeof root !== 'object' || root === null || !('Plan' in root)) {
    return undefined;
  }
  const plan = (root as { readonly Plan?: unknown }).Plan;
  if (typeof plan !== 'object' || plan === null || !('Plan Rows' in plan)) {
    return undefined;
  }
  return parseOptionalRowCount((plan as { readonly 'Plan Rows'?: unknown })['Plan Rows']);
}

async function loadPostgresColumnsFromDataPlane(
  client: Pick<Client, 'query'>,
  row: PostgresTableDiscoveryRow
): Promise<readonly SourceObjectColumn[]> {
  try {
    const result = (await client.query(
      `select * from ${toPostgresQualifiedTableName(row)} limit 0`
    )) as PostgresQueryResult<Record<string, never>>;
    return (
      result.fields?.map((field) => ({
        name: field.name,
        type: postgresTypeNameFromDataTypeId(field.dataTypeID),
        nullable: true,
      })) ?? []
    ).filter((column) => column.name.trim().length > 0 && column.type.trim().length > 0);
  } catch (_error) {
    return [];
  }
}

function toPostgresQualifiedTableName(
  row: Pick<PostgresTableDiscoveryRow, 'table_schema' | 'table_name'>
): string {
  return `${quotePostgresIdentifier(row.table_schema)}.${quotePostgresIdentifier(row.table_name)}`;
}

function quotePostgresIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function quotePostgresLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function postgresTypeNameFromDataTypeId(dataTypeId: number | undefined): string {
  switch (dataTypeId) {
    case 16:
      return 'boolean';
    case 17:
      return 'bytea';
    case 20:
      return 'bigint';
    case 21:
      return 'smallint';
    case 23:
      return 'integer';
    case 25:
      return 'text';
    case 700:
      return 'real';
    case 701:
      return 'double precision';
    case 1042:
      return 'character';
    case 1043:
      return 'character varying';
    case 1082:
      return 'date';
    case 1083:
      return 'time';
    case 1114:
      return 'timestamp';
    case 114:
      return 'json';
    case 1184:
      return 'timestamp with time zone';
    case 1266:
      return 'time with time zone';
    case 1700:
      return 'numeric';
    case 2950:
      return 'uuid';
    case 3802:
      return 'jsonb';
    default:
      return 'unknown';
  }
}

function groupPostgresColumnsByTable(
  rows: readonly PostgresColumnDiscoveryRow[]
): ReadonlyMap<string, readonly SourceObjectColumn[]> {
  const columnsByTable = new Map<string, SourceObjectColumn[]>();
  for (const row of rows) {
    const key = postgresTableKey(row);
    const columns = columnsByTable.get(key) ?? [];
    columns.push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
    });
    columnsByTable.set(key, columns);
  }
  return columnsByTable;
}

function groupPostgresConstraintsByTable(
  rows: readonly PostgresColumnDiscoveryRow[]
): ReadonlyMap<string, readonly SourceObjectConstraint[]> {
  const constraintsByTable = new Map<string, Map<string, SourceObjectConstraint>>();
  for (const row of rows) {
    const tableConstraints = constraintsByTable.get(postgresTableKey(row)) ?? new Map();
    for (const constraint of parsePostgresConstraints(row.constraints)) {
      const key = JSON.stringify([constraint.kind, constraint.name ?? '', constraint.columns]);
      tableConstraints.set(key, constraint);
    }
    constraintsByTable.set(postgresTableKey(row), tableConstraints);
  }
  return new Map(
    Array.from(constraintsByTable.entries()).map(([key, constraints]) => [
      key,
      Array.from(constraints.values()).sort((left, right) =>
        `${left.kind}:${left.name ?? ''}`.localeCompare(`${right.kind}:${right.name ?? ''}`)
      ),
    ])
  );
}

function parsePostgresConstraints(value: unknown): readonly SourceObjectConstraint[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((constraint) => SourceObjectConstraintSchema.parse(constraint));
}

function postgresRelationType(
  relationKind: PostgresTableDiscoveryRow['relation_kind']
): RelationalSourceObjectLocator['relationType'] {
  switch (relationKind) {
    case 'r':
      return 'table';
    case 'p':
      return 'partitioned-table';
    case 'v':
      return 'view';
    case 'm':
      return 'materialized-view';
    case 'f':
      return 'foreign-table';
  }
}

function postgresTableKey(
  row: Pick<PostgresTableDiscoveryRow, 'table_catalog' | 'table_schema' | 'table_name'>
): string {
  return JSON.stringify([row.table_catalog, row.table_schema, row.table_name]);
}

function parseOptionalRowCount(value: unknown): number | undefined {
  return parseOptionalNonNegativeInteger(value);
}

function parseOptionalByteSize(value: unknown): number | undefined {
  return parseOptionalNonNegativeInteger(value);
}

function parseOptionalNonBlankString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseOptionalNonNegativeInteger(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
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

function isPostgresPermissionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code = 'code' in error ? (error as { readonly code?: unknown }).code : undefined;
  if (code === '42501') {
    return true;
  }
  const message =
    'message' in error ? (error as { readonly message?: unknown }).message : undefined;
  return typeof message === 'string' && /permission denied/i.test(message);
}
