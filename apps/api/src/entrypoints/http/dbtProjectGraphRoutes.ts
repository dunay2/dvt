/** Owned concern: adapt the protected ProjectDbtGraphFromFiles query rail to HTTP. */
import type { FastifyInstance } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { DbtProjectFileAuthorityRequiredError } from '../../application/ports/dbtProjectImport.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../../application/services/projectDbtGraphFromFilesUseCase.js';

import {
  authorizeDbtProjectFileRequest,
  parseDbtProjectFileScope,
  type DbtProjectFileScopeQuery,
} from './dbtProjectFileRouteAuthorization.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue, type RouteParseResult } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type DbtProjectGraphQuery = DbtProjectFileScopeQuery & {
  readonly canvasId?: string;
};

type DbtProjectGraphRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly useCase: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
  readonly rateLimit: { readonly max: number; readonly timeWindow: number };
};

export function registerDbtProjectGraphRoutes(
  app: FastifyInstance,
  deps: DbtProjectGraphRouteDeps
): void {
  app.get<{ Querystring: DbtProjectGraphQuery }>(
    RUNTIME_ROUTE_PATH.dbtProjectGraph,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsed = parseDbtProjectGraphQuery(request.query);
      if (!parsed.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
        return;
      }

      const authorized = await authorizeDbtProjectFileRequest(
        request,
        reply,
        deps,
        parsed.value.accessScope,
        AUTHORIZATION_ACTION.workspaceFilesView
      );
      if (!authorized) return;

      try {
        reply.code(200).send(
          await deps.useCase.execute({
            scope: authorized.scope,
            canvasId: parsed.value.canvasId,
          })
        );
      } catch (error) {
        if (error instanceof DbtProjectFileAuthorityRequiredError) {
          reply.code(409).send({
            error: {
              type: 'conflict',
              reason: HTTP_ERROR_REASON.dbtProjectFileAuthorityRequired,
            },
          });
          return;
        }
        throw error;
      }
    }
  );
}

function parseDbtProjectGraphQuery(input: DbtProjectGraphQuery): RouteParseResult<{
  readonly accessScope: ReturnType<typeof buildEnvironmentAccessScope>;
  readonly canvasId: string;
}> {
  const accessScope = parseDbtProjectFileScope(input);
  const canvasId = input.canvasId?.trim();
  if (!accessScope.ok || !canvasId) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidDbtProjectGraphRequest, {
        target: 'query',
      }),
    };
  }

  return {
    ok: true,
    value: {
      accessScope: accessScope.value,
      canvasId,
    },
  };
}
