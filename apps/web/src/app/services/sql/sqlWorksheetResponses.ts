/** Admit canonical SQL receipts only when their captured request identities agree. */
import {
  ExecuteWorkspaceSqlResponseSchema,
  GetWorkspaceSqlExecutionResponseSchema,
  ListWorkspaceSqlExecutionsResponseSchema,
  type ExecuteWorkspaceSqlRequest,
  type ExecuteWorkspaceSqlResponse,
  type GetWorkspaceSqlExecutionResponse,
  type ListWorkspaceSqlExecutionsResponse,
} from '@dvt/contracts';
import { SqlWorksheetQueryError } from '../../ports/sqlWorksheet';

function readReceipt<T>(
  schema: Readonly<{
    safeParse: (value: unknown) => { success: true; data: T } | { success: false };
  }>,
  value: unknown
): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new SqlWorksheetQueryError('contract');
  return result.data;
}

export function readSqlExecutionReceipt(
  value: unknown,
  request: ExecuteWorkspaceSqlRequest
): ExecuteWorkspaceSqlResponse {
  const response = readReceipt(ExecuteWorkspaceSqlResponseSchema, value);
  const execution = response.execution;
  const facts = [
    [request.sql, execution.sql],
    [request.connectionId, execution.connectionRef.connectionId],
    [request.limit, execution.limit],
  ];
  if (facts.some(([expected, actual]) => expected !== actual))
    throw new SqlWorksheetQueryError('contract');
  return response;
}

export function readSqlHistoryReceipt(
  value: unknown,
  connectionId?: string
): ListWorkspaceSqlExecutionsResponse {
  const response = readReceipt(ListWorkspaceSqlExecutionsResponseSchema, value);
  if (connectionId == null) return response;
  if (response.executions.some((entry) => entry.connectionRef.connectionId !== connectionId))
    throw new SqlWorksheetQueryError('contract');
  return response;
}

export function readSqlDetailReceipt(
  value: unknown,
  executionId: string
): GetWorkspaceSqlExecutionResponse {
  const response = readReceipt(GetWorkspaceSqlExecutionResponseSchema, value);
  if (response.execution.executionId !== executionId) throw new SqlWorksheetQueryError('contract');
  return response;
}
