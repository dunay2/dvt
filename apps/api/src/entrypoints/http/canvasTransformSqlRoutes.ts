/** Expose the protected, revision-bound Transform SQL read model without executing rows. */
import { TransformSqlProjectionRequestSchema } from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { CanvasTransformProjectionUnavailableError } from '../../application/ports/canvasTransformSql.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ProjectCanvasTransformSqlQuery } from '../../application/services/projectCanvasTransformSqlQuery.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';
import {
  parseRequiredEnvironmentScope,
  type EnvironmentScopeQuery,
} from './routeParserPrimitives.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

export function registerCanvasTransformSqlRoutes(
  app: FastifyInstance,
  deps: Readonly<{
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    query: Pick<ProjectCanvasTransformSqlQuery, 'execute'>;
    rateLimit: Readonly<{ max: number; timeWindow: number }>;
  }>
): void {
  app.get<{
    Params: { canvasId: string; transformNodeId: string };
    Querystring: EnvironmentScopeQuery & { semanticPlanSha256?: string };
  }>(
    RUNTIME_ROUTE_PATH.canvasTransformSql,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const scope = parseRequiredEnvironmentScope(request.query);
      const values: Record<string, unknown> = { ...request.query, ...request.params };
      delete values.tenantId;
      delete values.projectId;
      delete values.environmentId;
      const input = TransformSqlProjectionRequestSchema.safeParse(values);
      if (!scope.ok || !input.success) {
        httpErrorTranslation.respond(
          reply,
          httpErrorTranslation.parse.issue(
            badRequestIssue(HTTP_ERROR_REASON.invalidTransformSqlProjectionRequest, {
              target: 'query',
            })
          )
        );
        return;
      }
      const authorized = await authorizeExecutionScope({
        authenticator: deps.authenticator,
        authorizer: deps.authorizer,
        token: extractBearerToken(request.headers.authorization),
        requestId: request.id,
        requestedScope: { ...scope.value, action: AUTHORIZATION_ACTION.workspaceGraphDraftView },
      });
      if (!authorized.ok) {
        httpErrorTranslation.respond(reply, authorized.response);
        return;
      }
      try {
        reply.code(200).send(await deps.query.execute(input.data, authorized.context));
      } catch (error) {
        if (!(error instanceof CanvasTransformProjectionUnavailableError)) throw error;
        const stale = error.reason === 'canvas_changed';
        const denied = error.reason === 'file_access_denied';
        reply
          .code(denied ? 403 : stale ? 409 : 422)
          .send({
            error: {
              type: denied ? 'forbidden' : stale ? 'conflict' : 'unprocessable_entity',
              reason: denied
                ? HTTP_ERROR_REASON.transformSqlProjectionAccessDenied
                : stale
                  ? HTTP_ERROR_REASON.transformSqlProjectionStale
                  : HTTP_ERROR_REASON.transformSqlProjectionFailed,
            },
          });
      }
    }
  );
}
