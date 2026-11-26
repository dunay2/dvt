/** Adapt the independent SQL command and history queries to protected environment-scoped HTTP. */
import {
  ExecuteWorkspaceSqlRequestSchema,
  ExecuteWorkspaceSqlResponseSchema,
  GetWorkspaceSqlExecutionResponseSchema,
  ListWorkspaceSqlExecutionsRequestSchema,
  ListWorkspaceSqlExecutionsResponseSchema,
  WorkspaceSqlExecutionIdSchema,
} from '@dvt/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  type AuthorizationAction,
} from '../../application/ports/accessDecision.js';
import type { AuthorizedExecutionContext, IAuthenticator } from '../../application/ports/auth.js';
import {
  WorkspaceSqlOperationError,
  type IExecuteWorkspaceSqlCommand,
  type IGetWorkspaceSqlExecutionQuery,
  type IListWorkspaceSqlExecutionsQuery,
} from '../../application/ports/sqlWorksheet.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { createHttpErrorResponse, HTTP_ERROR_TYPE, sendHttpResponse } from './httpErrorContract.js';
import {
  parseRequiredEnvironmentScope,
  type EnvironmentScopeQuery,
} from './routeParserPrimitives.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

export type SqlWorksheetRouteDependencies = Readonly<{
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  executeCommand: IExecuteWorkspaceSqlCommand;
  listQuery: IListWorkspaceSqlExecutionsQuery;
  getQuery: IGetWorkspaceSqlExecutionQuery;
  rateLimit?: Readonly<{ max: number; timeWindow: number }>;
}>;

type HistoryQuery = EnvironmentScopeQuery &
  Readonly<{
    limit?: string;
    cursor?: string;
    connectionId?: string;
  }>;

export function registerSqlWorksheetRoutes(
  app: FastifyInstance,
  deps: SqlWorksheetRouteDependencies
): void {
  const options = deps.rateLimit === undefined ? {} : { config: { rateLimit: deps.rateLimit } };
  app.post<{ Querystring: EnvironmentScopeQuery; Body: unknown }>(
    RUNTIME_ROUTE_PATH.sqlWorksheetExecutions,
    options,
    async (request, reply) => {
      const context = await authorizeSqlRequest({
        request,
        reply,
        deps,
        action: AUTHORIZATION_ACTION.workspaceSqlExecute,
      });
      if (context === undefined) return;
      const parsed = ExecuteWorkspaceSqlRequestSchema.safeParse(request.body);
      if (!parsed.success) return rejectRequest(reply);
      return respondToSqlOperation(reply, async () =>
        ExecuteWorkspaceSqlResponseSchema.parse(
          await deps.executeCommand.execute(parsed.data, context)
        )
      );
    }
  );
  registerSqlHistoryRoutes(app, deps, options);
}

function registerSqlHistoryRoutes(
  app: FastifyInstance,
  deps: SqlWorksheetRouteDependencies,
  options: Readonly<{
    config?: { rateLimit: NonNullable<SqlWorksheetRouteDependencies['rateLimit']> };
  }>
): void {
  app.get<{ Querystring: HistoryQuery }>(
    RUNTIME_ROUTE_PATH.sqlWorksheetExecutions,
    options,
    async (request, reply) => {
      const context = await authorizeSqlRequest({
        request,
        reply,
        deps,
        action: AUTHORIZATION_ACTION.workspaceSqlHistoryView,
      });
      if (context === undefined) return;
      const parsed = ListWorkspaceSqlExecutionsRequestSchema.safeParse({
        ...(request.query.limit === undefined ? {} : { limit: Number(request.query.limit) }),
        ...(request.query.cursor === undefined ? {} : { cursor: request.query.cursor }),
        ...(request.query.connectionId === undefined
          ? {}
          : { connectionId: request.query.connectionId }),
      });
      if (!parsed.success) return rejectRequest(reply);
      return respondToSqlOperation(reply, async () =>
        ListWorkspaceSqlExecutionsResponseSchema.parse(
          await deps.listQuery.execute(parsed.data, context)
        )
      );
    }
  );
  app.get<{ Querystring: EnvironmentScopeQuery; Params: { executionId: string } }>(
    RUNTIME_ROUTE_PATH.sqlWorksheetExecution,
    options,
    async (request, reply) => {
      const context = await authorizeSqlRequest({
        request,
        reply,
        deps,
        action: AUTHORIZATION_ACTION.workspaceSqlHistoryView,
      });
      if (context === undefined) return;
      const parsed = WorkspaceSqlExecutionIdSchema.safeParse(request.params.executionId);
      if (!parsed.success) return rejectRequest(reply);
      return respondToSqlOperation(reply, async () =>
        GetWorkspaceSqlExecutionResponseSchema.parse(
          await deps.getQuery.execute(parsed.data, context)
        )
      );
    }
  );
}

async function authorizeSqlRequest(
  input: Readonly<{
    request: Pick<FastifyRequest, 'headers' | 'id'> & { query: EnvironmentScopeQuery };
    reply: FastifyReply;
    deps: Pick<SqlWorksheetRouteDependencies, 'authenticator' | 'authorizer'>;
    action: AuthorizationAction;
  }>
): Promise<AuthorizedExecutionContext | undefined> {
  const scope = parseRequiredEnvironmentScope(input.request.query);
  if (!scope.ok) {
    rejectRequest(input.reply);
    return undefined;
  }
  const authorized = await authorizeExecutionScope({
    ...input.deps,
    token: extractBearerToken(input.request.headers.authorization),
    requestId: input.request.id,
    requestedScope: { ...scope.value, action: input.action },
  });
  if (!authorized.ok) {
    sendHttpResponse(input.reply, authorized.response);
    return undefined;
  }
  return authorized.context;
}

function rejectRequest(reply: FastifyReply): void {
  sendHttpResponse(
    reply,
    createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.badRequest,
      reason: 'invalid_sql_worksheet_request',
    })
  );
}

const OPERATION_ERROR_TYPES = {
  access_denied: HTTP_ERROR_TYPE.forbidden,
  not_found: HTTP_ERROR_TYPE.notFound,
  invalid_cursor: HTTP_ERROR_TYPE.badRequest,
  unavailable: HTTP_ERROR_TYPE.serviceUnavailable,
} as const;

async function respondToSqlOperation(
  reply: FastifyReply,
  operation: () => Promise<unknown>
): Promise<void> {
  try {
    await reply.send(await operation());
  } catch (error) {
    const reason = error instanceof WorkspaceSqlOperationError ? error.reason : 'unavailable';
    sendHttpResponse(
      reply,
      createHttpErrorResponse({
        type: OPERATION_ERROR_TYPES[reason],
        reason: `workspace_sql_${reason}`,
      })
    );
  }
}
