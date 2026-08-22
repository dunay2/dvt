/** Owned concern: adapt the protected CompileGraphDbtModels query rail to HTTP. */
import { CompileGraphDbtModelsRequestSchema } from '@dvt/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ICompileGraphDbtModelsQuery } from '../../application/services/compileGraphDbtModelsQuery.js';

import {
  authorizeDbtProjectFileRequest,
  parseDbtProjectFileScope,
  type DbtProjectFileScopeQuery,
} from './dbtProjectFileRouteAuthorization.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type GraphDbtModelCompilationRouteDeps = Readonly<{
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  query: ICompileGraphDbtModelsQuery;
  rateLimit: { readonly max: number; readonly timeWindow: number };
}>;

export function registerGraphDbtModelCompilationRoutes(
  app: FastifyInstance,
  deps: GraphDbtModelCompilationRouteDeps
): void {
  app.post<{ Querystring: DbtProjectFileScopeQuery; Body: unknown }>(
    RUNTIME_ROUTE_PATH.graphDbtModelCompilation,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsedRequest = CompileGraphDbtModelsRequestSchema.safeParse(request.body);
      if (!parsedRequest.success) return respondInvalidRequest(reply, 'body');

      const parsedScope = parseDbtProjectFileScope(
        request.query,
        HTTP_ERROR_REASON.invalidGraphDbtModelCompilationRequest
      );
      if (!parsedScope.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsedScope.issue));
        return;
      }

      const authorized = await authorizeDbtProjectFileRequest(
        request,
        reply,
        deps,
        parsedScope.value,
        AUTHORIZATION_ACTION.workspaceFilesView
      );
      if (!authorized) return;

      reply.code(200).send(
        await deps.query.execute({
          scope: authorized.scope,
          ...parsedRequest.data,
        })
      );
    }
  );
}

function respondInvalidRequest(reply: FastifyReply, target: 'body'): void {
  httpErrorTranslation.respond(
    reply,
    httpErrorTranslation.parse.issue(
      badRequestIssue(HTTP_ERROR_REASON.invalidGraphDbtModelCompilationRequest, { target })
    )
  );
}
