/** Protect the read-only worksheet proposal; graph persistence has its existing route. */
import { WorksheetCanvasModelRequestSchema } from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  CanvasModelSqlAccessDeniedError,
  CanvasModelSqlUnavailableError,
} from '../../application/ports/canvasModelSql.js';
import { CanvasTransformProjectionUnavailableError } from '../../application/ports/canvasTransformSql.js';
import {
  WarehouseConnectionNotFoundError,
  WarehouseSourceDiscoveryFailedError,
} from '../../application/ports/warehouseSourceImport.js';
import type { IWorksheetCanvasModelQuery } from '../../application/ports/worksheetCanvasModel.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import {
  parseRequiredEnvironmentScope,
  type EnvironmentScopeQuery,
} from './routeParserPrimitives.js';

function projectionFailure(error: CanvasTransformProjectionUnavailableError) {
  if (error.reason === 'file_access_denied') return { status: 403, reason: error.reason };
  return { status: error.reason === 'canvas_changed' ? 409 : 422, reason: error.reason };
}

function proposalFailure(error: unknown): Readonly<{ status: number; reason: string }> | null {
  if (error instanceof CanvasModelSqlAccessDeniedError)
    return { status: 403, reason: 'model_sql_access_denied' };
  if (error instanceof CanvasModelSqlUnavailableError)
    return { status: error.code === 'stale_context' ? 409 : 422, reason: error.code };
  if (error instanceof CanvasTransformProjectionUnavailableError) return projectionFailure(error);
  if (
    error instanceof WarehouseConnectionNotFoundError ||
    error instanceof WarehouseSourceDiscoveryFailedError
  )
    return { status: 422, reason: 'input_unavailable' };
  return null;
}

export function registerWorksheetCanvasModelRoutes(
  app: FastifyInstance,
  deps: Readonly<{
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    query: IWorksheetCanvasModelQuery;
    rateLimit: Readonly<{ max: number; timeWindow: number }>;
  }>
) {
  app.post<{ Params: { canvasId: string }; Querystring: EnvironmentScopeQuery; Body: unknown }>(
    '/workspace/graph/canvases/:canvasId/sql-model-proposal',
    { config: { rateLimit: deps.rateLimit }, bodyLimit: 300_000 },
    async (request, reply) => {
      const scope = parseRequiredEnvironmentScope(request.query),
        input = WorksheetCanvasModelRequestSchema.safeParse(request.body);
      if (
        !scope.ok ||
        !input.success ||
        input.data.canvasId !== request.params.canvasId ||
        Object.keys(request.query).some(
          (key) => !['tenantId', 'projectId', 'environmentId'].includes(key)
        )
      )
        return reply
          .code(400)
          .send({
            error: { type: 'bad_request', reason: 'invalid_worksheet_canvas_model_request' },
          });
      const authorized = await authorizeExecutionScope({
        authenticator: deps.authenticator,
        authorizer: deps.authorizer,
        token: extractBearerToken(request.headers.authorization),
        requestId: request.id,
        requestedScope: { ...scope.value, action: AUTHORIZATION_ACTION.workspaceGraphDraftSave },
      });
      if (!authorized.ok) return httpErrorTranslation.respond(reply, authorized.response);
      try {
        return reply.send(await deps.query.execute(input.data, authorized.context));
      } catch (error) {
        const failure = proposalFailure(error);
        if (failure == null) throw error;
        return reply
          .code(failure.status)
          .send({
            error: {
              type: failure.status === 409 ? 'conflict' : 'unprocessable_entity',
              reason: failure.reason,
            },
          });
      }
    }
  );
}
