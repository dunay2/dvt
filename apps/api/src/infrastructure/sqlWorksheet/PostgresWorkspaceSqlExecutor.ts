/** Execute one structurally admitted SELECT through a private read-only PostgreSQL session. */
import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import { ExecuteWorkspaceSqlRequestSchema } from '@dvt/contracts';
import { Client, type QueryArrayConfig } from 'pg';

import {
  WorkspaceSqlQueryError,
  type IWorkspaceSqlExecutor,
} from '../../application/ports/sqlWorksheet.js';
import { validatePostgresTransformSqlStructure } from '../../application/services/postgresTransformSqlPolicy.js';
import {
  postgresTypeNameFromDataTypeId,
  serializePostgresSampleCell,
} from '../postgres/postgresDataSampleSerialization.js';

type SqlClient = Readonly<{
  connect(): Promise<unknown>;
  end(): Promise<unknown>;
  query(input: string | QueryArrayConfig): Promise<
    Readonly<{
      fields: readonly Readonly<{ name: string; dataTypeID: number }>[];
      rows: readonly unknown[][];
    }>
  >;
}>;

export class PostgresWorkspaceSqlExecutor implements IWorkspaceSqlExecutor {
  public constructor(
    private readonly options: Readonly<{
      credentialResolver: IPostgresCredentialBindingResolver;
      createClient?: (connectionString: string) => SqlClient;
    }>
  ) {}

  public async execute(input: Parameters<IWorkspaceSqlExecutor['execute']>[0]) {
    if (input.type !== 'postgres')
      throw failure('provider_unsupported', 'This SQL provider is not supported.');
    const sql = await admitSql(input);
    const connectionString = await this.resolveConnection(input.credentialRef);
    const client =
      this.options.createClient?.(connectionString) ??
      new Client({
        connectionString,
        connectionTimeoutMillis: 3000,
        query_timeout: 3000,
      });
    return executeReadOnly(client, sql, input.limit);
  }

  private async resolveConnection(credentialRef: string | undefined): Promise<string> {
    try {
      if (credentialRef === undefined) throw new Error('Credential unavailable.');
      const value = await this.options.credentialResolver.resolveCredential(credentialRef);
      if (value === null || value.trim().length === 0) throw new Error('Credential unavailable.');
      return value;
    } catch {
      throw failure('connection_unavailable', 'The warehouse connection is unavailable.');
    }
  }
}

async function executeReadOnly(client: SqlClient, sql: string, limit: number) {
  let connected = false;
  let transaction = false;
  try {
    await client.connect();
    connected = true;
    await client.query('begin transaction read only');
    transaction = true;
    await client.query('set local statement_timeout = 3000');
    const result = await client.query({
      text: `select * from (\n${sql.replace(/;\s*$/u, '')}\n) as dvt_sql_worksheet limit ${limit + 1}`,
      rowMode: 'array',
    });
    await client.query('commit');
    transaction = false;
    return {
      result: {
        columns: result.fields.map((field) => ({
          name: field.name,
          type: postgresTypeNameFromDataTypeId(field.dataTypeID),
          nullable: true,
        })),
        rows: result.rows
          .slice(0, limit)
          .map((row) => ({ values: row.map(serializePostgresSampleCell) })),
      },
      truncated: result.rows.length > limit,
    };
  } catch (error) {
    if (transaction) await client.query('rollback').catch(() => undefined);
    throw transportFailure(error, connected);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function admitSql(input: Parameters<IWorkspaceSqlExecutor['execute']>[0]): Promise<string> {
  const validRequest = ExecuteWorkspaceSqlRequestSchema.pick({ sql: true, limit: true }).safeParse({
    sql: input.sql,
    limit: input.limit,
  });
  if (!validRequest.success) throw failure('sql_invalid', 'The SQL text or row limit is invalid.');
  const admitted = await validatePostgresTransformSqlStructure(input.sql);
  if (admitted.status === 'valid') return admitted.canonicalSql;
  throw new WorkspaceSqlQueryError({
    code: 'sql_invalid',
    message: 'The SQL statement is not an admitted SELECT.',
    diagnostics: admitted.diagnostics.map(({ message, startOffset, endOffset }) => ({
      message,
      ...(startOffset === undefined ? {} : { startOffset }),
      ...(endOffset === undefined ? {} : { endOffset }),
    })),
  });
}

function transportFailure(error: unknown, connected: boolean): WorkspaceSqlQueryError {
  if (!connected)
    return failure('connection_unavailable', 'The warehouse connection is unavailable.');
  if (isTimeout(error)) return failure('query_timeout', 'The SQL query timed out.');
  return failure('query_failed', 'The SQL query could not be completed.');
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (('code' in error && error.code === '57014') || error.message === 'Query read timeout')
  );
}

function failure(
  code: ConstructorParameters<typeof WorkspaceSqlQueryError>[0]['code'],
  message: string
) {
  return new WorkspaceSqlQueryError({ code, message });
}
