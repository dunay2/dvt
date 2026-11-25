/** Bind SQL worksheet transport to the granted workspace and exact response identity. */
import {
  ExecuteWorkspaceSqlRequestSchema,
  ListWorkspaceSqlExecutionsRequestSchema,
  WorkspaceSqlExecutionIdSchema,
} from '@dvt/contracts';
import { SqlWorksheetQueryError, type ISqlWorksheetPort } from '../../ports/sqlWorksheet';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { sameWorkspaceScopeIdentity } from '../session/workspaceScopeSelectionPort';
import {
  readGrantedWorkspaceHttpScope,
  type WorkspaceHttpScope,
} from '../workspace/workspaceHttpScope';
import {
  readSqlExecutionReceipt,
  readSqlHistoryReceipt,
  readSqlDetailReceipt,
} from './sqlWorksheetResponses';

function sqlWorksheetEndpoint(scope: WorkspaceHttpScope, id?: string): string {
  const suffix = id == null ? '' : `/${encodeURIComponent(id)}`;
  return `/workspace/sql/executions${suffix}?${new URLSearchParams(scope)}`;
}

async function requestSqlWorksheet<T>(
  read: (scope: WorkspaceHttpScope, options: Readonly<{ signal?: AbortSignal }>) => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  const scope = readGrantedWorkspaceHttpScope();
  const options = signal == null ? {} : { signal };
  try {
    const result = await read(scope, options);
    if (!sameWorkspaceScopeIdentity(scope, readGrantedWorkspaceHttpScope())) {
      throw new SqlWorksheetQueryError('stale');
    }
    return result;
  } catch (error) {
    throw sqlWorksheetTransportError(error);
  }
}

function sqlWorksheetTransportError(error: unknown): unknown {
  if (error instanceof SqlWorksheetQueryError) return error;
  if (isAbortedSqlTransport(error)) return error;
  if (error instanceof ApiError) {
    return new SqlWorksheetQueryError(
      ['unauthorized', 'forbidden'].includes(error.category) ? 'denied' : 'unavailable'
    );
  }
  return new SqlWorksheetQueryError('unavailable');
}

function isAbortedSqlTransport(error: unknown): boolean {
  if (error instanceof Error) return error.name === 'AbortError';
  if (error instanceof DOMException) return error.name === 'AbortError';
  return false;
}

export function createApiSqlWorksheetPort(api: ApiClient): ISqlWorksheetPort {
  return {
    execute(input, signal) {
      return requestSqlWorksheet(async (scope, options) => {
        const request = ExecuteWorkspaceSqlRequestSchema.parse(input);
        return readSqlExecutionReceipt(
          await api.postJson(sqlWorksheetEndpoint(scope), request, options),
          request
        );
      }, signal);
    },
    listHistory(input, signal) {
      return requestSqlWorksheet(async (scope, options) => {
        const request = ListWorkspaceSqlExecutionsRequestSchema.parse(input);
        const params = new URLSearchParams({ limit: String(request.limit) });
        if (request.cursor != null) params.set('cursor', request.cursor);
        if (request.connectionId != null) params.set('connectionId', request.connectionId);
        return readSqlHistoryReceipt(
          await api.getJson(`${sqlWorksheetEndpoint(scope)}&${params}`, options),
          request.connectionId
        );
      }, signal);
    },
    getExecution(executionId, signal) {
      return requestSqlWorksheet(async (scope, options) => {
        WorkspaceSqlExecutionIdSchema.parse(executionId);
        return readSqlDetailReceipt(
          await api.getJson(sqlWorksheetEndpoint(scope, executionId), options),
          executionId
        );
      }, signal);
    },
  };
}
