import { createHmac, timingSafeEqual } from 'node:crypto';

/** Owned concern: verify warehouse connection metadata with server-resolved credentials. */
import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import {
  buildRelationalSourceObjectId,
  SourceObjectConstraintSchema,
  type SourceObjectCatalogRequest,
  type SourceObjectCatalogResponse,
  type SourceObjectCatalogSchemaSummary,
  type RelationalSourceObjectLocator,
  type SourceObject,
  type SourceObjectColumn,
  type SourceObjectConstraint,
} from '@dvt/contracts';
import { Client } from 'pg';

import type {
  IWarehouseConnectionProbe,
  IWarehouseSourceDataSampleProbe,
  InspectWarehouseConnectionResult,
  TestWarehouseConnectionResult,
  WarehouseConnectionCatalogEntry,
  WarehouseConnectionProbeTarget,
  WarehouseSourceObjectCatalogProbeTarget,
  WarehouseSourceDataSampleProbeResult,
  WarehouseSourceDataSampleProbeTarget,
} from '../../application/ports/warehouseSourceImport.js';
import {
  SourceObjectNotFoundError,
  UnsupportedWarehouseAdapterError,
  WarehouseSourceDataSampleFailedError,
  WarehouseSourceDiscoveryFailedError,
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

type PostgresSchemaSummaryRow = {
  readonly table_catalog: string;
  readonly table_schema: string;
  readonly object_count: number | string;
};

type PostgresRelationAuthorizationRow = {
  readonly relation_kind: 'r' | 'p' | 'v' | 'm' | 'f';
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
const SOURCE_DATA_SAMPLE_TIMEOUT_MS = 3000;

export class WorkspaceWarehouseConnectionProbe
  implements IWarehouseConnectionProbe, IWarehouseSourceDataSampleProbe
{
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

  public async listSourceObjectCatalog(
    input: WarehouseSourceObjectCatalogProbeTarget,
    request: SourceObjectCatalogRequest
  ): Promise<SourceObjectCatalogResponse> {
    if (input.type !== 'postgres') throw new UnsupportedWarehouseAdapterError(input.type);
    const connectionString = await this.options.credentialResolver.resolveCredential(
      input.credentialRef
    );
    if (connectionString === null || connectionString.trim().length === 0) {
      throw new WarehouseSourceDiscoveryFailedError(
        'invalid_credentials',
        'Credential reference could not be resolved.'
      );
    }
    const cursorAuthority = buildCatalogCursorAuthority(input, request, connectionString);
    const client = new Client({ connectionString });
    try {
      await client.connect();
      if (request.kind === 'schema-list') {
        return await loadPostgresSchemaCatalogPage(
          client,
          input.database,
          request,
          cursorAuthority
        );
      }
      return await loadPostgresObjectCatalogPage(
        client,
        input.database,
        request,
        this.checkedAt(),
        cursorAuthority
      );
    } catch (error) {
      if (
        error instanceof UnsupportedWarehouseAdapterError ||
        error instanceof WarehouseSourceDiscoveryFailedError
      )
        throw error;
      throw new WarehouseSourceDiscoveryFailedError(
        classifyPostgresProbeFailure(error),
        'Warehouse source discovery failed.'
      );
    } finally {
      await client.end().catch(() => undefined);
    }
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

  public async previewSourceObjectRows(
    input: WarehouseSourceDataSampleProbeTarget
  ): Promise<WarehouseSourceDataSampleProbeResult> {
    if (input.type !== 'postgres') {
      throw new UnsupportedWarehouseAdapterError(input.type);
    }
    const locator = parseRelationalSourceObjectId(input.objectId);
    if (locator === null || locator.catalog !== input.database) {
      throw new SourceObjectNotFoundError(input.objectId);
    }
    const connectionString = await this.options.credentialResolver.resolveCredential(
      input.credentialRef
    );
    if (connectionString === null || connectionString.trim().length === 0) {
      throw new WarehouseSourceDiscoveryFailedError(
        'invalid_credentials',
        'Credential reference could not be resolved.'
      );
    }
    const client = new Client({ connectionString });
    let transactionStarted = false;
    try {
      await client.connect();
      await client.query('begin transaction read only');
      transactionStarted = true;
      await client.query(`set local statement_timeout = '${SOURCE_DATA_SAMPLE_TIMEOUT_MS}ms'`);
      const authorized = await client.query<PostgresRelationAuthorizationRow>(
        [
          'select relation.relkind as relation_kind',
          'from pg_class relation',
          'join pg_namespace namespace on namespace.oid = relation.relnamespace',
          'where current_database() = $1 and namespace.nspname = $2 and relation.relname = $3',
          "and relation.relkind in ('r', 'p', 'v', 'm', 'f')",
          "and has_table_privilege(relation.oid, 'SELECT')",
          'limit 1',
        ].join(' '),
        [locator.catalog, locator.schema, locator.name]
      );
      if (authorized.rows.length === 0) {
        throw new SourceObjectNotFoundError(input.objectId);
      }

      const result = (await client.query(
        `select * from ${toPostgresQualifiedTableName({
          table_schema: locator.schema,
          table_name: locator.name,
        })} limit ${input.limit + 1}`
      )) as PostgresQueryResult<Readonly<Record<string, unknown>>>;
      const fields = result.fields ?? [];
      const truncated = result.rows.length > input.limit;
      const rows = result.rows.slice(0, input.limit).map((row) => ({
        values: fields.map((field) => serializePostgresSampleCell(row[field.name])),
      }));
      await client.query('commit');
      transactionStarted = false;
      return {
        columns: fields.map((field) => ({
          name: field.name,
          type: postgresTypeNameFromDataTypeId(field.dataTypeID),
          nullable: true,
        })),
        rows,
        truncated,
        sampledAt: this.checkedAt(),
      };
    } catch (error) {
      if (transactionStarted) {
        await client.query('rollback').catch(() => undefined);
      }
      if (
        error instanceof SourceObjectNotFoundError ||
        error instanceof WarehouseSourceDiscoveryFailedError ||
        error instanceof UnsupportedWarehouseAdapterError
      ) {
        throw error;
      }
      throw new WarehouseSourceDataSampleFailedError();
    } finally {
      await client.end().catch(() => undefined);
    }
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

type SchemaListRequest = Extract<SourceObjectCatalogRequest, { kind: 'schema-list' }>;
type ObjectPageRequest = Exclude<SourceObjectCatalogRequest, SchemaListRequest>;

async function loadPostgresSchemaCatalogPage(
  client: Pick<Client, 'query'>,
  database: string,
  request: SchemaListRequest,
  cursorAuthority: CatalogCursorAuthority
): Promise<SourceObjectCatalogResponse> {
  const after = request.cursor
    ? (readCatalogCursor(request.cursor, 2, database, cursorAuthority)[1] ?? '')
    : '';
  const result = await client.query<PostgresSchemaSummaryRow>(
    [
      'select current_database() as table_catalog, namespace.nspname as table_schema, count(*)::bigint as object_count',
      'from pg_class relation join pg_namespace namespace on namespace.oid = relation.relnamespace',
      'where current_database() = $1 and namespace.nspname > $2',
      "and namespace.nspname not in ('pg_catalog', 'information_schema')",
      "and relation.relkind in ('r', 'p', 'v', 'm', 'f')",
      "and has_table_privilege(relation.oid, 'SELECT')",
      'group by table_catalog, table_schema order by table_catalog, table_schema limit $3',
    ].join(' '),
    [database, after, request.limit + 1]
  );
  const rows = result.rows.slice(0, request.limit);
  const schemas: SourceObjectCatalogSchemaSummary[] = rows.map((row) => {
    const objectCount = parseOptionalNonNegativeInteger(row.object_count);
    if (objectCount === undefined) {
      throw new WarehouseSourceDiscoveryFailedError(
        'connection_failed',
        'Warehouse schema object count is invalid.'
      );
    }
    return { catalog: row.table_catalog, schema: row.table_schema, objectCount };
  });
  const truncated = result.rows.length > request.limit;
  const last = schemas.at(-1);
  return {
    kind: 'schema-list',
    schemas,
    truncated,
    ...(truncated && last
      ? { nextCursor: writeCatalogCursor([last.catalog, last.schema], cursorAuthority) }
      : {}),
  };
}

async function loadPostgresObjectCatalogPage(
  client: Pick<Client, 'query'>,
  database: string,
  request: ObjectPageRequest,
  observedAt: string,
  cursorAuthority: CatalogCursorAuthority
): Promise<SourceObjectCatalogResponse> {
  if (request.kind === 'schema-page' && request.catalog !== database) {
    return { kind: 'object-page', objects: [], truncated: false };
  }
  const cursor = request.cursor
    ? readCatalogCursor(request.cursor, 3, database, cursorAuthority)
    : [database, '', ''];
  const schemaPage = request.kind === 'schema-page';
  const sql = schemaPage
    ? [
        'select current_database() as table_catalog, current_user as database_user, namespace.nspname as table_schema, relation.relname as table_name, relation.relkind as relation_kind,',
        "case when relation.reltuples >= 0 then relation.reltuples::bigint when relation.relkind in ('r', 'p', 'm') then pg_stat_get_live_tuples(relation.oid)::bigint else null end as row_count",
        'from pg_class relation join pg_namespace namespace on namespace.oid = relation.relnamespace',
        'where current_database() = $1 and namespace.nspname = $2 and relation.relname > $3',
        "and namespace.nspname not in ('pg_catalog', 'information_schema')",
        "and relation.relkind in ('r', 'p', 'v', 'm', 'f')",
        "and has_table_privilege(relation.oid, 'SELECT')",
        'order by table_catalog, table_schema, table_name limit $4',
      ].join(' ')
    : [
        'select current_database() as table_catalog, current_user as database_user, namespace.nspname as table_schema, relation.relname as table_name, relation.relkind as relation_kind,',
        "case when relation.reltuples >= 0 then relation.reltuples::bigint when relation.relkind in ('r', 'p', 'm') then pg_stat_get_live_tuples(relation.oid)::bigint else null end as row_count",
        'from pg_class relation join pg_namespace namespace on namespace.oid = relation.relnamespace',
        'where current_database() = $1 and position(lower($2) in lower(relation.relname)) > 0',
        'and (namespace.nspname, relation.relname) > ($3, $4)',
        "and namespace.nspname not in ('pg_catalog', 'information_schema')",
        "and relation.relkind in ('r', 'p', 'v', 'm', 'f')",
        "and has_table_privilege(relation.oid, 'SELECT')",
        'order by table_catalog, table_schema, table_name limit $5',
      ].join(' ');
  const parameters = schemaPage
    ? [database, request.schema, cursor[2] ?? '', request.limit + 1]
    : [database, request.name, cursor[1] ?? '', cursor[2] ?? '', request.limit + 1];
  const result = await client.query<PostgresTableDiscoveryRow>(sql, parameters);
  const visibleRows = result.rows.slice(0, request.limit);
  const columnRows = await loadPostgresCatalogColumnsForRelations(client, visibleRows);
  const columnsByTable = groupPostgresColumnsByTable(columnRows);
  const constraintsByTable = groupPostgresConstraintsByTable(columnRows);
  const objects: SourceObject[] = [];
  for (const row of visibleRows) {
    const sourceObject = await toPostgresSourceObject(
      client,
      row,
      columnsByTable.get(postgresTableKey(row)) ?? [],
      constraintsByTable.get(postgresTableKey(row)) ?? [],
      observedAt,
      { allowExactRowCount: false }
    );
    if (sourceObject !== null) objects.push(sourceObject);
  }
  const truncated = result.rows.length > request.limit;
  const last = visibleRows.at(-1);
  return {
    kind: 'object-page',
    objects,
    truncated,
    ...(truncated && last
      ? {
          nextCursor: writeCatalogCursor(
            [last.table_catalog, last.table_schema, last.table_name],
            cursorAuthority
          ),
        }
      : {}),
  };
}

async function loadPostgresCatalogColumnsForRelations(
  client: Pick<Client, 'query'>,
  relations: readonly PostgresTableDiscoveryRow[]
): Promise<readonly PostgresColumnDiscoveryRow[]> {
  if (relations.length === 0) return [];
  try {
    const result = await client.query<PostgresColumnDiscoveryRow>(
      [
        'with selected_relations as (select * from unnest($1::text[], $2::text[], $3::text[]) as selected(table_catalog, table_schema, table_name)),',
        'relation_constraints as (',
        'select constraints.constraint_catalog as table_catalog, constraints.constraint_schema as table_schema, constraints.table_name,',
        'constraints.constraint_name, constraints.constraint_type, array_agg(keys.column_name order by keys.ordinal_position) as column_names',
        'from selected_relations selected join information_schema.table_constraints constraints',
        'on constraints.constraint_catalog = selected.table_catalog and constraints.constraint_schema = selected.table_schema and constraints.table_name = selected.table_name',
        'join information_schema.key_column_usage keys',
        'on keys.constraint_catalog = constraints.constraint_catalog and keys.constraint_schema = constraints.constraint_schema',
        'and keys.constraint_name = constraints.constraint_name and keys.table_schema = constraints.table_schema and keys.table_name = constraints.table_name',
        "where constraints.constraint_type in ('PRIMARY KEY', 'UNIQUE')",
        'group by constraints.constraint_catalog, constraints.constraint_schema, constraints.table_name, constraints.constraint_name, constraints.constraint_type)',
        'select columns.table_catalog, columns.table_schema, columns.table_name, columns.column_name, columns.data_type, columns.is_nullable,',
        "coalesce(jsonb_agg(distinct jsonb_build_object('name', constraints.constraint_name, 'kind', case when constraints.constraint_type = 'PRIMARY KEY' then 'primary-key' else 'unique' end, 'columns', constraints.column_names)) filter (where constraints.constraint_name is not null), '[]'::jsonb) as constraints",
        'from selected_relations selected join information_schema.columns columns',
        'on columns.table_catalog = selected.table_catalog and columns.table_schema = selected.table_schema and columns.table_name = selected.table_name',
        'left join relation_constraints constraints on constraints.table_catalog = columns.table_catalog',
        'and constraints.table_schema = columns.table_schema and constraints.table_name = columns.table_name',
        'and columns.column_name = any(constraints.column_names)',
        'group by columns.table_catalog, columns.table_schema, columns.table_name, columns.ordinal_position, columns.column_name, columns.data_type, columns.is_nullable',
        'order by columns.table_catalog, columns.table_schema, columns.table_name, columns.ordinal_position',
      ].join(' '),
      [
        relations.map((row) => row.table_catalog),
        relations.map((row) => row.table_schema),
        relations.map((row) => row.table_name),
      ]
    );
    return result.rows;
  } catch (error) {
    if (isPostgresPermissionError(error)) return [];
    throw error;
  }
}

type CatalogCursorAuthority = Readonly<{ context: string; signingKey: string }>;

function buildCatalogCursorAuthority(
  input: WarehouseSourceObjectCatalogProbeTarget,
  request: SourceObjectCatalogRequest,
  signingKey: string
): CatalogCursorAuthority {
  const filter =
    request.kind === 'schema-list'
      ? null
      : request.kind === 'schema-page'
        ? { catalog: request.catalog, schema: request.schema }
        : { name: request.name };
  return {
    context: JSON.stringify({
      tenantId: input.scope.tenantId,
      projectId: input.scope.projectId,
      environmentId: input.scope.environmentId,
      connectionId: input.connectionId,
      database: input.database,
      kind: request.kind,
      filter,
    }),
    signingKey,
  };
}

function signCatalogCursor(payload: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(payload, 'utf8').digest('base64url');
}

function writeCatalogCursor(parts: readonly string[], authority: CatalogCursorAuthority): string {
  const payload = Buffer.from(
    JSON.stringify({ context: authority.context, parts }),
    'utf8'
  ).toString('base64url');
  return `${payload}.${signCatalogCursor(payload, authority.signingKey)}`;
}

function readCatalogCursor(
  value: string,
  expectedLength: number,
  expectedCatalog: string,
  authority: CatalogCursorAuthority
): readonly string[] {
  try {
    const [payload, signature, extra] = value.split('.');
    if (!payload || !signature || extra !== undefined) throw new Error('invalid');
    const actual = Buffer.from(signature, 'base64url');
    const expected = Buffer.from(signCatalogCursor(payload, authority.signingKey), 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new Error('invalid');
    }
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('context' in parsed) ||
      parsed.context !== authority.context ||
      !('parts' in parsed) ||
      !Array.isArray(parsed.parts) ||
      parsed.parts.length !== expectedLength ||
      parsed.parts.some((part) => typeof part !== 'string' || part.length === 0) ||
      parsed.parts[0] !== expectedCatalog
    ) {
      throw new Error('invalid');
    }
    return parsed.parts;
  } catch (_error) {
    throw new WarehouseSourceDiscoveryFailedError(
      'connection_failed',
      'Warehouse source catalog cursor is invalid.'
    );
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
  observedAt: string,
  options: Readonly<{ allowExactRowCount: boolean }> = { allowExactRowCount: true }
): Promise<SourceObject | null> {
  const fallbackColumns =
    columns.length > 0 ? columns : await loadPostgresColumnsFromDataPlane(client, row);
  const rowCount =
    resolvePostgresStatisticsRowCount(row.row_count) ??
    (await loadPostgresPlanRowCount(client, row)) ??
    (options.allowExactRowCount ? await loadPostgresExactRowCount(client, row) : null);
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

type RelationalSourceObjectId = Readonly<{
  catalog: string;
  schema: string;
  name: string;
}>;

function parseRelationalSourceObjectId(objectId: string): RelationalSourceObjectId | null {
  const segments = objectId.split('/');
  if (segments.length !== 4 || segments[0] !== 'relation') {
    return null;
  }
  try {
    const [catalog, schema, name] = segments.slice(1).map((segment) => decodeURIComponent(segment));
    if (!catalog || !schema || !name) {
      return null;
    }
    return { catalog, schema, name };
  } catch (_error) {
    return null;
  }
}

function serializePostgresSampleCell(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `\\x${value.toString('hex')}`;
  if (typeof value === 'object') {
    return JSON.stringify(value, (_key, nested) =>
      typeof nested === 'bigint' ? nested.toString() : nested
    );
  }
  return String(value);
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
