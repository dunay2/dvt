/** Owned concern: ask the governed PostgreSQL server to analyze SQL without executing it. */
import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import { Client } from 'pg';

import {
  POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE,
  type IPostgresTransformSqlSemanticValidator,
  type PostgresTransformSqlDiagnosticCode,
  type PostgresTransformSqlValidationResult,
} from '../../application/ports/postgresTransformSqlValidation.js';

type PostgresValidationClient = Pick<Client, 'connect' | 'query' | 'end'>;

const POSTGRES_SQL_VALIDATION_TIMEOUT_MS = 3000;

export class WorkspacePostgresTransformSqlValidator implements IPostgresTransformSqlSemanticValidator {
  private readonly clientFactory: (connectionString: string) => PostgresValidationClient;

  public constructor(
    private readonly options: {
      credentialResolver: IPostgresCredentialBindingResolver;
      clientFactory?: (connectionString: string) => PostgresValidationClient;
    }
  ) {
    this.clientFactory =
      options.clientFactory ?? ((connectionString) => new Client({ connectionString }));
  }

  public async validate(input: {
    credentialRef: string;
    sql: string;
  }): Promise<PostgresTransformSqlValidationResult> {
    let connectionString: string | null;
    try {
      connectionString = await this.options.credentialResolver.resolveCredential(
        input.credentialRef
      );
    } catch (error) {
      return unavailable(error);
    }
    if (connectionString === null || connectionString.trim().length === 0) {
      return unavailable(new Error('Credential reference could not be resolved.'));
    }

    const client = this.clientFactory(connectionString);
    let connected = false;
    let transactionStarted = false;
    try {
      await client.connect();
      connected = true;
      await client.query('begin transaction read only');
      transactionStarted = true;
      await client.query(`set local statement_timeout = '${POSTGRES_SQL_VALIDATION_TIMEOUT_MS}ms'`);
      await client.query(`explain (format json) ${input.sql}`);
      return { status: 'valid' };
    } catch (error) {
      return !connected || isConnectionFailure(error)
        ? unavailable(error)
        : invalidPostgresSql(error, input.sql);
    } finally {
      if (transactionStarted) {
        await client.query('rollback').catch(() => undefined);
      }
      await client.end().catch(() => undefined);
    }
  }
}

function invalidPostgresSql(error: unknown, sql: string): PostgresTransformSqlValidationResult {
  const code = postgresDiagnosticCode(error);
  const startOffset = postgresErrorOffset(error, sql);
  return {
    status: 'invalid',
    diagnostics: [
      {
        code,
        source: 'postgres',
        message: error instanceof Error ? error.message : 'PostgreSQL rejected the SQL.',
        ...(startOffset === undefined
          ? {}
          : { startOffset, endOffset: Math.min(sql.length, startOffset + 1) }),
      },
    ],
  };
}

function unavailable(error: unknown): PostgresTransformSqlValidationResult {
  return {
    status: 'unavailable',
    diagnostics: [
      {
        code: POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.connectionUnavailable,
        source: 'connection',
        message:
          error instanceof Error
            ? error.message
            : 'The governed PostgreSQL connection is unavailable.',
      },
    ],
  };
}

function postgresDiagnosticCode(error: unknown): PostgresTransformSqlDiagnosticCode {
  const code = errorCode(error);
  if (code === '42P01') return POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.undefinedTable;
  if (code === '42703') return POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.undefinedColumn;
  if (code === '42601') return POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.syntaxError;
  return POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.postgresError;
}

function postgresErrorOffset(error: unknown, sql: string): number | undefined {
  if (typeof error !== 'object' || error === null || !('position' in error)) {
    return undefined;
  }
  const position = Number((error as { position?: unknown }).position);
  if (!Number.isSafeInteger(position) || position <= 0) {
    return undefined;
  }
  return Math.min(position - 1, Math.max(0, sql.length - 1));
}

function isConnectionFailure(error: unknown): boolean {
  return new Set(['28P01', '3D000', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT']).has(
    errorCode(error) ?? ''
  );
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
