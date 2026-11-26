/** Segregated execution, history and application ports for an independent SQL worksheet. */
import type {
  ExecuteWorkspaceSqlRequest,
  ExecuteWorkspaceSqlResponse,
  GetWorkspaceSqlExecutionResponse,
  ListWorkspaceSqlExecutionsRequest,
  ListWorkspaceSqlExecutionsResponse,
  WorkspaceSqlExecution,
  WorkspaceSqlFailure,
  WorkspaceSqlResult,
  ConnectionRef,
} from '@dvt/contracts';

import { ACCESS_SCOPE_RESOURCE, type AuthorizationAction } from './accessDecision.js';
import type { AuthorizedExecutionContext } from './auth.js';
import type { WorkspaceStorageScope } from './workspaceFiles.js';

export interface IWorkspaceSqlExecutor {
  execute(
    input: Readonly<{
      type: ConnectionRef['provider'];
      credentialRef: string | undefined;
      sql: string;
      limit: number;
    }>
  ): Promise<Readonly<{ result: WorkspaceSqlResult; truncated: boolean }>>;
}

export interface IWorkspaceSqlExecutionHistory {
  append(scope: WorkspaceStorageScope, execution: WorkspaceSqlExecution): Promise<void>;
  list(
    scope: WorkspaceStorageScope,
    input: ListWorkspaceSqlExecutionsRequest
  ): Promise<ListWorkspaceSqlExecutionsResponse>;
  get(scope: WorkspaceStorageScope, executionId: string): Promise<WorkspaceSqlExecution | null>;
}

export interface IExecuteWorkspaceSqlCommand {
  execute(
    input: ExecuteWorkspaceSqlRequest,
    context: AuthorizedExecutionContext
  ): Promise<ExecuteWorkspaceSqlResponse>;
}
export interface IListWorkspaceSqlExecutionsQuery {
  execute(
    input: ListWorkspaceSqlExecutionsRequest,
    context: AuthorizedExecutionContext
  ): Promise<ListWorkspaceSqlExecutionsResponse>;
}
export interface IGetWorkspaceSqlExecutionQuery {
  execute(
    executionId: string,
    context: AuthorizedExecutionContext
  ): Promise<GetWorkspaceSqlExecutionResponse>;
}

export class WorkspaceSqlQueryError extends Error {
  public constructor(readonly failure: WorkspaceSqlFailure) {
    super(failure.message);
    this.name = 'WorkspaceSqlQueryError';
  }
}

export class WorkspaceSqlOperationError extends Error {
  public constructor(
    readonly reason: 'access_denied' | 'not_found' | 'invalid_cursor' | 'unavailable'
  ) {
    super('The SQL worksheet operation could not be completed.');
    this.name = 'WorkspaceSqlOperationError';
  }
}

export function requireSqlWorksheetScope(
  context: AuthorizedExecutionContext,
  action: AuthorizationAction
): WorkspaceStorageScope {
  if (context.action.kind !== action.kind) throw new WorkspaceSqlOperationError('access_denied');
  if (context.action.name !== action.name) throw new WorkspaceSqlOperationError('access_denied');
  if (context.scope.resource !== ACCESS_SCOPE_RESOURCE.environment)
    throw new WorkspaceSqlOperationError('access_denied');
  return {
    tenantId: context.scope.tenantId.value,
    projectId: context.scope.projectId.value,
    environmentId: context.scope.environmentId.value,
  };
}
