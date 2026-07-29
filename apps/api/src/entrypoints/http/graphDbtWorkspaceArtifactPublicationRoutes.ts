/** Owned concern: adapt graph-derived dbt artifact publication to protected HTTP. */
import { PublishGraphDbtWorkspaceArtifactsRequestSchema } from '@dvt/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IPublishGraphDbtWorkspaceArtifactsCommand } from '../../application/ports/graphDbtWorkspaceArtifactPublication.js';
import {
  InvalidWorkspaceFileBatchMutationError,
  InvalidWorkspacePathError,
  WorkspaceFileBatchIdempotencyConflictError,
} from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import {
  authorizeDbtProjectFileRequest,
  parseDbtProjectFileScope,
  type DbtProjectFileScopeQuery,
} from './dbtProjectFileRouteAuthorization.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type GraphDbtWorkspaceArtifactPublicationRouteDeps = Readonly<{
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  command: IPublishGraphDbtWorkspaceArtifactsCommand;
  rateLimit: { readonly max: number; readonly timeWindow: number };
}>;

export function registerGraphDbtWorkspaceArtifactPublicationRoutes(
  app: FastifyInstance,
  deps: GraphDbtWorkspaceArtifactPublicationRouteDeps
): void {
  app.post<{ Querystring: DbtProjectFileScopeQuery; Body: unknown }>(
    RUNTIME_ROUTE_PATH.graphDbtWorkspaceArtifactPublications,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsed = PublishGraphDbtWorkspaceArtifactsRequestSchema.safeParse(request.body);
      if (!parsed.success) return respondInvalidRequest(reply);

      const parsedScope = parseDbtProjectFileScope(request.query);
      if (!parsedScope.ok) {
        httpErrorTranslation.respond(
          reply,
          httpErrorTranslation.parse.issue(parsedScope.issue)
        );
        return;
      }
      const authorized = await authorizeDbtProjectFileRequest(
        request,
        reply,
        deps,
        parsedScope.value,
        AUTHORIZATION_ACTION.workspaceFilesSave
      );
      if (!authorized) return;

      try {
        reply
          .code(200)
          .send(await deps.command.execute({ scope: authorized.scope, ...parsed.data }));
      } catch (error) {
        if (error instanceof WorkspaceFileBatchIdempotencyConflictError) {
          reply.code(409).send({
            error: {
              type: 'conflict',
              reason: HTTP_ERROR_REASON.graphDbtWorkspaceArtifactPublicationIdempotencyConflict,
            },
          });
          return;
        }
        if (
          error instanceof InvalidWorkspaceFileBatchMutationError ||
          error instanceof InvalidWorkspacePathError
        ) {
          respondInvalidRequest(reply);
          return;
        }
        throw error;
      }
    }
  );
}

function respondInvalidRequest(reply: FastifyReply): void {
  httpErrorTranslation.respond(
    reply,
    httpErrorTranslation.parse.issue(
      badRequestIssue(
        HTTP_ERROR_REASON.invalidGraphDbtWorkspaceArtifactPublicationRequest,
        { target: 'body' }
      )
    )
  );
}
