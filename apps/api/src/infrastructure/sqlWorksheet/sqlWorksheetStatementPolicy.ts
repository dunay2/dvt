/**
 * Own worksheet statement admission before credentials or provider transport.
 * @baseline GH-3951: ExecuteWorkspaceSql owns an independent, bounded read-only SELECT.
 * @decision Reuse structural parsing and reserve the private row-limit parameter in the AST.
 * @consequence Literal dollar-number text remains data; other SQL rails retain their own policy.
 */
import { ExecuteWorkspaceSqlRequestSchema } from '@dvt/contracts';

import type { PostgresTransformSqlValidationResult } from '../../application/ports/postgresTransformSqlValidation.js';
import {
  WorkspaceSqlQueryError,
  type IWorkspaceSqlExecutor,
} from '../../application/ports/sqlWorksheet.js';
import { parsePostgresTransformSqlStructure } from '../../application/services/postgresTransformSqlPolicy.js';

export async function admitSql(
  input: Pick<Parameters<IWorkspaceSqlExecutor['execute']>[0], 'sql' | 'limit'>
): Promise<string> {
  const validRequest = ExecuteWorkspaceSqlRequestSchema.pick({ sql: true, limit: true }).safeParse({
    sql: input.sql,
    limit: input.limit,
  });
  if (!validRequest.success)
    throw new WorkspaceSqlQueryError({
      code: 'sql_invalid',
      message: 'The SQL text or row limit is invalid.',
    });
  const admitted = await parsePostgresTransformSqlStructure(input.sql);
  if (admitted.status === 'invalid') throw worksheetSqlValidationFailure(admitted.diagnostics);
  if (hasWorksheetSqlParameters(admitted.ast))
    throw new WorkspaceSqlQueryError({
      code: 'sql_invalid',
      message: 'SQL parameters are not supported in the worksheet.',
    });
  return admitted.canonicalSql;
}

function hasWorksheetSqlParameters(ast: unknown): boolean {
  const pending: unknown[] = [ast];
  while (pending.length > 0) {
    const value = pending.pop();
    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }
    if (value == null || typeof value !== 'object') continue;
    if (Object.hasOwn(value, 'ParamRef')) return true;
    pending.push(...Object.values(value));
  }
  return false;
}

function worksheetSqlValidationFailure(
  diagnostics: Extract<PostgresTransformSqlValidationResult, { status: 'invalid' }>['diagnostics']
): WorkspaceSqlQueryError {
  return new WorkspaceSqlQueryError({
    code: 'sql_invalid',
    message: 'The SQL statement is not an admitted SELECT.',
    diagnostics: diagnostics.map(({ message, startOffset, endOffset }) => ({
      message,
      ...(startOffset === undefined ? {} : { startOffset }),
      ...(endOffset === undefined ? {} : { endOffset }),
    })),
  });
}
