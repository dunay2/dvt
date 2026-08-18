/** Owned concern: define the single PostgreSQL transform SQL readiness rail. */
import type { ConnectionRef, WorkspaceGraphDraftScope } from '@dvt/contracts';

export const POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE = {
  sqlRequired: 'sql_required',
  syntaxError: 'syntax_error',
  multipleStatements: 'multiple_statements',
  unsupportedStatement: 'unsupported_statement',
  undefinedTable: 'undefined_table',
  undefinedColumn: 'undefined_column',
  postgresError: 'postgres_error',
  connectionUnavailable: 'connection_unavailable',
} as const;

export type PostgresTransformSqlDiagnosticCode =
  (typeof POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE)[keyof typeof POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE];

export type PostgresTransformSqlDiagnostic = Readonly<{
  code: PostgresTransformSqlDiagnosticCode;
  source: 'policy' | 'parser' | 'postgres' | 'connection';
  message: string;
  startOffset?: number;
  endOffset?: number;
}>;

export type PostgresTransformSqlValidationResult =
  | Readonly<{ status: 'valid' }>
  | Readonly<{
      status: 'invalid';
      diagnostics: readonly PostgresTransformSqlDiagnostic[];
    }>
  | Readonly<{
      status: 'unavailable';
      diagnostics: readonly PostgresTransformSqlDiagnostic[];
    }>;

export type ValidatePostgresTransformSqlInput = Readonly<{
  scope: WorkspaceGraphDraftScope;
  connectionRef: ConnectionRef;
  sql: string;
}>;

export interface IPostgresTransformSqlSemanticValidator {
  validate(input: {
    credentialRef: string;
    sql: string;
  }): Promise<PostgresTransformSqlValidationResult>;
}
