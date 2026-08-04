/**
 * @ownedConcern Publish bounded object-file rows into a PostgreSQL staging relation atomically.
 */
import { createHash } from 'node:crypto';

import type { LoadObjectFileToPostgresStepTypeConfig } from '@dvt/contracts';
import type { PoolClient, QueryResult } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

export type PostgresObjectFileScalar = string | number | boolean | null;

export interface PostgresObjectFileLoadInput {
  readonly schema: 'staging';
  readonly scope: LoadObjectFileToPostgresStepTypeConfig['scope'];
  readonly relation: string;
  readonly columns: LoadObjectFileToPostgresStepTypeConfig['columns'];
  readonly rows: readonly Readonly<Record<string, PostgresObjectFileScalar>>[];
  readonly signal?: globalThis.AbortSignal;
}

export interface PostgresObjectFileLoadResult {
  readonly rowsWritten: number;
  readonly publicationOutcome: 'created' | 'replaced';
  readonly targetSchema: string;
  readonly targetRelation: string;
}

interface NormalizedObjectFileColumn {
  readonly targetColumn: string;
  readonly dataType: LoadObjectFileToPostgresStepTypeConfig['columns'][number]['dataType'];
  readonly nullable: boolean;
}

const MAX_BIND_PARAMETERS = 60_000;
const MAX_ROWS_PER_BATCH = 1_000;

export class PostgresObjectFileLoader {
  public constructor(private readonly clientSession: PostgresAdapterClientSession) {}

  public async load(input: PostgresObjectFileLoadInput): Promise<PostgresObjectFileLoadResult> {
    assertNotAborted(input.signal);
    const schema = resolvePostgresObjectFileScopeSchema(input.schema, input.scope);
    const relation = normalizeSchema(input.relation);
    const columns = normalizeObjectFileColumns(input.columns);
    const target = `${quoteIdentifier(schema)}.${quoteIdentifier(relation)}`;

    return this.clientSession.withTransaction(async (client) => {
      await queryWithSignal(
        client,
        `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`,
        [],
        input.signal
      );
      const existing = await queryWithSignal<{ target_relation: string | null }>(
        client,
        'SELECT to_regclass($1) AS target_relation',
        [`${schema}.${relation}`],
        input.signal
      );
      const publicationOutcome = existing.rows[0]?.target_relation
        ? ('replaced' as const)
        : ('created' as const);

      await queryWithSignal(client, `DROP TABLE IF EXISTS ${target}`, [], input.signal);
      await queryWithSignal(
        client,
        `CREATE TABLE ${target} (${columns.map(formatColumnDefinition).join(', ')})`,
        [],
        input.signal
      );
      await insertRows(client, target, columns, input.rows, input.signal);
      assertNotAborted(input.signal);

      return {
        rowsWritten: input.rows.length,
        publicationOutcome,
        targetSchema: schema,
        targetRelation: relation,
      };
    });
  }
}

export function resolvePostgresObjectFileScopeSchema(
  schema: string,
  scope: LoadObjectFileToPostgresStepTypeConfig['scope']
): string {
  if (schema !== 'staging') {
    throw new Error('POSTGRES_OBJECT_FILE_SCHEMA_INVALID');
  }
  const scopeParts = [scope.tenantId, scope.projectId, scope.environmentId];
  if (scopeParts.some((value) => value.trim().length === 0)) {
    throw new Error('POSTGRES_OBJECT_FILE_SCOPE_INVALID');
  }
  const scopeDigest = createHash('sha256')
    .update(JSON.stringify(scopeParts))
    .digest('hex')
    .slice(0, 32);
  return `${schema}_${scopeDigest}`;
}

function normalizeObjectFileColumns(
  columns: LoadObjectFileToPostgresStepTypeConfig['columns']
): readonly NormalizedObjectFileColumn[] {
  if (columns.length === 0) {
    throw new Error('POSTGRES_OBJECT_FILE_COLUMNS_REQUIRED');
  }

  const targetColumns = new Set<string>();
  return columns.map((column) => {
    const targetColumn = normalizeSchema(column.targetColumn);
    if (targetColumns.has(targetColumn)) {
      throw new Error('POSTGRES_OBJECT_FILE_TARGET_COLUMN_DUPLICATE');
    }
    targetColumns.add(targetColumn);
    return {
      targetColumn,
      dataType: column.dataType,
      nullable: column.nullable,
    };
  });
}

function formatColumnDefinition(column: NormalizedObjectFileColumn): string {
  return `${quoteIdentifier(column.targetColumn)} ${toPostgresColumnType(column.dataType)}${column.nullable ? '' : ' NOT NULL'}`;
}

function toPostgresColumnType(dataType: NormalizedObjectFileColumn['dataType']): string {
  switch (dataType) {
    case 'text':
      return 'TEXT';
    case 'integer':
      return 'INTEGER';
    case 'bigint':
      return 'BIGINT';
    case 'numeric':
      return 'NUMERIC';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'timestamp':
      return 'TIMESTAMP';
    case 'timestamp-with-time-zone':
      return 'TIMESTAMPTZ';
  }
}

async function insertRows(
  client: PoolClient,
  target: string,
  columns: readonly NormalizedObjectFileColumn[],
  rows: readonly Readonly<Record<string, PostgresObjectFileScalar>>[],
  signal: globalThis.AbortSignal | undefined
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const batchSize = Math.max(
    1,
    Math.min(MAX_ROWS_PER_BATCH, Math.floor(MAX_BIND_PARAMETERS / columns.length))
  );
  const quotedColumns = columns.map((column) => quoteIdentifier(column.targetColumn)).join(', ');

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    assertNotAborted(signal);
    const batch = rows.slice(offset, offset + batchSize);
    const values: PostgresObjectFileScalar[] = [];
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column.targetColumn] ?? null);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await queryWithSignal(
      client,
      `INSERT INTO ${target} (${quotedColumns}) VALUES ${tuples.join(', ')}`,
      values,
      signal
    );
  }
}

async function queryWithSignal<Row extends Record<string, unknown> = Record<string, unknown>>(
  client: PoolClient,
  text: string,
  values: readonly unknown[],
  signal: globalThis.AbortSignal | undefined
): Promise<QueryResult<Row>> {
  assertNotAborted(signal);
  return client.query<Row>({
    text,
    values: [...values],
    ...(signal === undefined ? {} : { signal }),
  });
}

function assertNotAborted(signal: globalThis.AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw signal.reason ?? new Error('PostgreSQL object-file load was cancelled.');
  }
}
