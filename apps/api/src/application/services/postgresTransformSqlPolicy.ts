/** Owned concern: enforce the PostgreSQL SQL-first structural policy with the PostgreSQL parser. */
import type { PostgresAstNode } from '@dvt/postgres-projection';
import { hasSqlDetails, parse } from 'libpg-query';
import { deparse } from 'pgsql-deparser';

import {
  POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE,
  type PostgresTransformSqlValidationResult,
} from '../ports/postgresTransformSqlValidation.js';

type PostgresParseResult = Readonly<{
  stmts?: readonly Readonly<{
    stmt?: Readonly<Record<string, unknown>>;
  }>[];
}>;

type PostgresTransformSqlStructuralResult =
  | Extract<PostgresTransformSqlValidationResult, { status: 'invalid' }>
  | Readonly<{ status: 'valid'; canonicalSql: string }>;

export async function validatePostgresTransformSqlStructure(
  sql: string
): Promise<PostgresTransformSqlStructuralResult> {
  const result = await parsePostgresTransformSqlStructure(sql);
  return result.status === 'invalid'
    ? result
    : { status: 'valid', canonicalSql: result.canonicalSql };
}

export async function parsePostgresTransformSqlStructure(
  sql: string
): Promise<
  | Extract<PostgresTransformSqlValidationResult, { status: 'invalid' }>
  | Readonly<{ status: 'valid'; canonicalSql: string; ast: PostgresAstNode }>
> {
  if (sql.trim().length === 0) {
    return invalidPolicy(POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.sqlRequired, 'SQL is required.');
  }

  let parsed: PostgresParseResult;
  try {
    parsed = (await parse(sql)) as PostgresParseResult;
  } catch (error) {
    const startOffset = postgresParserOffset(error, sql);
    return {
      status: 'invalid',
      diagnostics: [
        {
          code: POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.syntaxError,
          source: 'parser',
          message: error instanceof Error ? error.message : 'PostgreSQL syntax is invalid.',
          ...(startOffset === undefined
            ? {}
            : { startOffset, endOffset: Math.min(sql.length, startOffset + 1) }),
        },
      ],
    };
  }

  const statements = parsed.stmts ?? [];
  if (statements.length !== 1) {
    return invalidPolicy(
      POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.multipleStatements,
      'Exactly one SQL statement is required.'
    );
  }

  if (!hasSelectStatement(statements[0]?.stmt)) {
    return invalidPolicy(
      POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.unsupportedStatement,
      'Only SELECT statements are supported.'
    );
  }

  return {
    status: 'valid',
    canonicalSql: await deparse(parsed as Parameters<typeof deparse>[0]),
    ast: statements[0]!.stmt!,
  };
}

function hasSelectStatement(statement: Readonly<Record<string, unknown>> | undefined): boolean {
  if (statement === undefined || !Object.hasOwn(statement, 'SelectStmt')) return false;
  const pending: unknown[] = [statement];
  while (pending.length > 0) {
    const value = pending.pop();
    if (Array.isArray(value)) pending.push(...value);
    else if (value != null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (
          (key.endsWith('Stmt') && key !== 'SelectStmt') ||
          (key === 'intoClause' && child != null) ||
          (key === 'lockingClause' && Array.isArray(child) && child.length > 0)
        )
          return false;
        pending.push(child);
      }
    }
  }
  return true;
}

function invalidPolicy(
  code:
    | typeof POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.sqlRequired
    | typeof POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.multipleStatements
    | typeof POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.unsupportedStatement,
  message: string
): Extract<PostgresTransformSqlValidationResult, { status: 'invalid' }> {
  return {
    status: 'invalid',
    diagnostics: [{ code, source: 'policy', message }],
  };
}

function postgresParserOffset(error: unknown, sql: string): number | undefined {
  if (!hasSqlDetails(error)) {
    return undefined;
  }
  const offset = error.sqlDetails.cursorPosition;
  if (!Number.isSafeInteger(offset) || offset < 0) {
    return undefined;
  }
  return Math.min(offset, Math.max(0, sql.length - 1));
}
