/**
 * Owned concern: adapt protected workspace diff-change query rails to HTTP.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { InvalidWorkspaceDiffChangesError } from '../../application/ports/workspaceDiffChanges.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ListWorkspaceDiffChangesUseCase } from '../../application/services/listWorkspaceDiffChangesUseCase.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_TYPE, createHttpErrorResponse } from './httpErrorContract.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import {
  parseRequiredEnvironmentScope,
  type EnvironmentScopeQuery,
} from './routeParserPrimitives.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type WorkspaceDiffChangesRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly listUseCase: ListWorkspaceDiffChangesUseCase;
  readonly rateLimit: { readonly max: number; readonly timeWindow: number };
};

export function registerWorkspaceDiffChangesRoutes(
  app: FastifyInstance,
  deps: WorkspaceDiffChangesRouteDeps
): void {
  app.get<{ Querystring: EnvironmentScopeQuery }>(
    RUNTIME_ROUTE_PATH.workspaceDiffChanges,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWorkspaceDiffChangesRequest(request, reply, deps);
      if (!authorized) return;

      try {
        reply.code(200).send(await deps.listUseCase.execute());
      } catch (error) {
        if (error instanceof InvalidWorkspaceDiffChangesError) {
          httpErrorTranslation.respond(
            reply,
            createHttpErrorResponse({
              type: HTTP_ERROR_TYPE.badRequest,
              reason: HTTP_ERROR_REASON.invalidWorkspaceDiffChanges,
            })
          );
          return;
        }

        throw error;
      }
    }
  );
}

async function authorizeWorkspaceDiffChangesRequest(
  request: FastifyRequest<{ Querystring: EnvironmentScopeQuery }>,
  reply: FastifyReply,
  deps: Pick<WorkspaceDiffChangesRouteDeps, 'authenticator' | 'authorizer'>
): Promise<boolean> {
  const parsed = parseRequiredEnvironmentScope(request.query);
  if (!parsed.ok) {
    httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
    return false;
  }

  const auth = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      ...parsed.value,
      action: AUTHORIZATION_ACTION.workspaceDiffView,
    },
  });
  if (!auth.ok) {
    httpErrorTranslation.respond(reply, auth.response);
    return false;
  }

  return true;
}
