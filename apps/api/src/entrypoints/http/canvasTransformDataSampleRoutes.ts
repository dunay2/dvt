/** Owned concern: expose the protected PreviewCanvasTransformRows HTTP query. */
import { TransformDataSampleRequestSchema } from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { CanvasTransformDataSampleUnavailableError } from '../../application/ports/canvasTransformDataSample.js';
import { WarehouseConnectionNotFoundError } from '../../application/ports/warehouseSourceImport.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { PreviewCanvasTransformRowsUseCase } from '../../application/services/previewCanvasTransformRowsUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type TransformDataSampleParams = Readonly<{
  canvasId: string;
  transformNodeId: string;
}>;

type TransformDataSampleQuery = Readonly<{
  tenantId?: string;
  projectId?: string;
  environmentId?: string;
  limit?: string;
  relationId?: string;
  semanticPlanSha256?: string;
}>;

export function registerCanvasTransformDataSampleRoutes(
  app: FastifyInstance,
  deps: {
    readonly authenticator: IAuthenticator;
    readonly authorizer: AuthorizeCommandScopeService;
    readonly query: Pick<PreviewCanvasTransformRowsUseCase, 'execute'>;
    readonly rateLimit: { readonly max: number; readonly timeWindow: number };
  }
): void {
  app.get<{ Params: TransformDataSampleParams; Querystring: TransformDataSampleQuery }>(
    RUNTIME_ROUTE_PATH.canvasTransformDataSample,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const scope = parseScope(request.query);
      const input = TransformDataSampleRequestSchema.safeParse({
        canvasId: request.params.canvasId,
        transformNodeId: request.params.transformNodeId,
        ...(request.query.relationId === undefined ? {} : { relationId: request.query.relationId }),
        ...(request.query.semanticPlanSha256 === undefined
          ? {}
          : { semanticPlanSha256: request.query.semanticPlanSha256 }),
        ...(request.query.limit === undefined ? {} : { limit: Number(request.query.limit) }),
      });
      if (scope === null || !input.success) {
        httpErrorTranslation.respond(
          reply,
          httpErrorTranslation.parse.issue(
            badRequestIssue(HTTP_ERROR_REASON.invalidTransformDataSampleRequest, {
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
        requestedScope: { ...scope, action: AUTHORIZATION_ACTION.workspaceGraphDraftView },
      });
      if (!authorized.ok) {
        httpErrorTranslation.respond(reply, authorized.response);
        return;
      }

      try {
        reply.code(200).send(await deps.query.execute(input.data, authorized.context));
      } catch (error) {
        if (error instanceof WarehouseConnectionNotFoundError) {
          reply.code(404).send({
            error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
          });
          return;
        }
        if (error instanceof CanvasTransformDataSampleUnavailableError) {
          if (error.reason === 'canvas_changed') {
            reply.code(409).send({
              error: { type: 'conflict', reason: HTTP_ERROR_REASON.transformDataSampleStale },
            });
            return;
          }
          reply.code(422).send({
            error: {
              type: 'unprocessable_entity',
              reason: HTTP_ERROR_REASON.transformDataSampleFailed,
            },
          });
          return;
        }
        throw error;
      }
    }
  );
}

function parseScope(
  query: TransformDataSampleQuery
): ReturnType<typeof buildEnvironmentAccessScope> | null {
  const tenantId = TenantId.parse(query.tenantId ?? '');
  const projectId = ProjectId.parse(query.projectId ?? '');
  const environmentId = EnvironmentId.parse(query.environmentId ?? '');
  return tenantId.ok && projectId.ok && environmentId.ok
    ? buildEnvironmentAccessScope(tenantId.value, projectId.value, environmentId.value)
    : null;
}
