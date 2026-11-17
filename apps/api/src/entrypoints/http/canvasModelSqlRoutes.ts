/** Adapt the protected Model SQL context, compilation and draft-row queries to HTTP. */
import {
  ModelSqlTargetSchema,
  ModelSqlCompilationRequestSchema,
  TransformSqlDraftDataSampleRequestSchema,
} from '@dvt/contracts';
import { DvtSubstraitPostgresProjectionError } from '@dvt/postgres-projection';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { FastifyInstance } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  CanvasModelSqlAccessDeniedError,
  CanvasModelSqlUnavailableError,
  type ICanvasModelSqlContextQuery,
} from '../../application/ports/canvasModelSql.js';
import { CanvasTransformDataSampleUnavailableError } from '../../application/ports/canvasTransformDataSample.js';
import { CanvasTransformProjectionUnavailableError } from '../../application/ports/canvasTransformSql.js';
import { DbtModelProducerAccessDeniedError } from '../../application/ports/dbtModelProducer.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { CompileCanvasModelSqlQuery } from '../../application/services/compileCanvasModelSqlQuery.js';
import type { PreviewCanvasTransformRowsUseCase } from '../../application/services/previewCanvasTransformRowsUseCase.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import {
  parseRequiredEnvironmentScope,
  type EnvironmentScopeQuery,
} from './routeParserPrimitives.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

export function registerCanvasModelSqlRoutes(
  app: FastifyInstance,
  deps: Readonly<{
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    context: Pick<ICanvasModelSqlContextQuery, 'execute'>;
    compilation: Pick<CompileCanvasModelSqlQuery, 'execute'>;
    rows: Pick<PreviewCanvasTransformRowsUseCase, 'executeSqlDraft'>;
    rateLimit: Readonly<{ max: number; timeWindow: number }>;
  }>
) {
  const routes = [
    { mode: 'context', method: 'GET', url: RUNTIME_ROUTE_PATH.canvasModelSqlContext },
    { mode: 'compile', method: 'POST', url: RUNTIME_ROUTE_PATH.canvasModelSqlCompilation },
    { mode: 'rows', method: 'POST', url: RUNTIME_ROUTE_PATH.canvasTransformDataSample },
  ] as const;
  for (const route of routes)
    app.route<{
      Params: { canvasId: string; transformNodeId: string };
      Querystring: EnvironmentScopeQuery;
      Body: unknown;
    }>({
      method: route.method,
      url: route.url,
      config: { rateLimit: deps.rateLimit },
      bodyLimit: 300_000,
      handler: async (request, reply) => {
        const scope = parseRequiredEnvironmentScope(request.query);
        const target = ModelSqlTargetSchema.safeParse(request.params);
        const permittedScopeKeys = new Set(['tenantId', 'projectId', 'environmentId']);
        if (
          !scope.ok ||
          !target.success ||
          Object.keys(request.query).some((key) => !permittedScopeKeys.has(key))
        )
          return reply
            .code(400)
            .send({
              error: { type: 'bad_request', reason: HTTP_ERROR_REASON.invalidModelSqlRequest },
            });
        const authorized = await authorizeExecutionScope({
          authenticator: deps.authenticator,
          authorizer: deps.authorizer,
          token: extractBearerToken(request.headers.authorization),
          requestId: request.id,
          requestedScope: { ...scope.value, action: AUTHORIZATION_ACTION.workspaceGraphDraftView },
        });
        if (!authorized.ok) return httpErrorTranslation.respond(reply, authorized.response);
        try {
          if (route.mode === 'context')
            return reply.send(await deps.context.execute(target.data, authorized.context));
          const schema =
            route.mode === 'rows'
              ? TransformSqlDraftDataSampleRequestSchema
              : ModelSqlCompilationRequestSchema;
          const parsed = schema.safeParse(request.body);
          if (
            !parsed.success ||
            parsed.data.canvasId !== target.data.canvasId ||
            parsed.data.transformNodeId !== target.data.transformNodeId
          )
            return reply
              .code(400)
              .send({
                error: { type: 'bad_request', reason: HTTP_ERROR_REASON.invalidModelSqlRequest },
              });
          if (route.mode === 'compile')
            return reply.send(await deps.compilation.execute(parsed.data, authorized.context));
          const rows = TransformSqlDraftDataSampleRequestSchema.parse(parsed.data);
          return reply.send(await deps.rows.executeSqlDraft(rows, authorized.context));
        } catch (error) {
          if (
            error instanceof CanvasModelSqlAccessDeniedError ||
            error instanceof DbtModelProducerAccessDeniedError ||
            (error instanceof CanvasTransformProjectionUnavailableError &&
              error.reason === 'file_access_denied')
          )
            return reply
              .code(403)
              .send({
                error: { type: 'forbidden', reason: HTTP_ERROR_REASON.modelSqlAccessDenied },
              });
          if (error instanceof CanvasModelSqlUnavailableError) {
            const stale = error.code === 'stale_context';
            return reply
              .code(stale ? 409 : 422)
              .send({
                error: { type: stale ? 'conflict' : 'unprocessable_entity', reason: error.code },
              });
          }
          if (error instanceof CanvasTransformDataSampleUnavailableError)
            return reply
              .code(422)
              .send({ error: { type: 'unprocessable_entity', reason: error.reason } });
          if (
            error instanceof CanvasTransformProjectionUnavailableError ||
            error instanceof SubstraitAnalysisError ||
            error instanceof DvtSubstraitPostgresProjectionError
          )
            return reply
              .code(
                error instanceof CanvasTransformProjectionUnavailableError &&
                  error.reason === 'canvas_changed'
                  ? 409
                  : 422
              )
              .send({ error: { type: 'unprocessable_entity', reason: 'input_unavailable' } });
          throw error;
        }
      },
    });
}
