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
  scope: WorkspaceHttpScope,
  read: () => Promise<T>
): Promise<T> {
  try {
    const result = await read();
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
      const scope = readGrantedWorkspaceHttpScope();
      const request = ExecuteWorkspaceSqlRequestSchema.parse(input);
      return requestSqlWorksheet(scope, async () => {
        return readSqlExecutionReceipt(
          await api.postJson(
            sqlWorksheetEndpoint(scope),
            request,
            signal == null ? {} : { signal }
          ),
          request
        );
      });
    },
    listHistory(input, signal) {
      const scope = readGrantedWorkspaceHttpScope();
      const request = ListWorkspaceSqlExecutionsRequestSchema.parse(input);
      const params = new URLSearchParams({ limit: String(request.limit) });
      if (request.cursor != null) params.set('cursor', request.cursor);
      if (request.connectionId != null) params.set('connectionId', request.connectionId);
      return requestSqlWorksheet(scope, async () => {
        return readSqlHistoryReceipt(
          await api.getJson(
            `${sqlWorksheetEndpoint(scope)}&${params}`,
            signal == null ? {} : { signal }
          ),
          request.connectionId
        );
      });
    },
    getExecution(executionId, signal) {
      const scope = readGrantedWorkspaceHttpScope();
      WorkspaceSqlExecutionIdSchema.parse(executionId);
      return requestSqlWorksheet(scope, async () => {
        return readSqlDetailReceipt(
          await api.getJson(
            sqlWorksheetEndpoint(scope, executionId),
            signal == null ? {} : { signal }
          ),
          executionId
        );
      });
    },
  };
}
