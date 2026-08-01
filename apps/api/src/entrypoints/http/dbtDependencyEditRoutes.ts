/** Owned concern: adapt ApplySelectedDbtDependencyEdit to protected HTTP. */
import { DbtDependencyEditRequestSchema } from '@dvt/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  DbtDependencyEditReceiptInvalidError,
  type IApplySelectedDbtDependencyEditCommand,
} from '../../application/ports/dbtDependencyEdit.js';
import { WorkspaceFileBatchIdempotencyConflictError } from '../../application/ports/workspaceFiles.js';
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

type DbtDependencyEditRouteDeps = Readonly<{
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  command: IApplySelectedDbtDependencyEditCommand;
  rateLimit: { readonly max: number; readonly timeWindow: number };
}>;

export function registerDbtDependencyEditRoutes(
  app: FastifyInstance,
  deps: DbtDependencyEditRouteDeps
): void {
  app.post<{ Querystring: DbtProjectFileScopeQuery; Body: unknown }>(
    RUNTIME_ROUTE_PATH.dbtDependencyEditApplications,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsed = DbtDependencyEditRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        respondInvalidRequest(reply);
        return;
      }
      const parsedScope = parseDbtProjectFileScope(request.query);
      if (!parsedScope.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsedScope.issue));
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
        reply.code(200).send(await deps.command.apply({ scope: authorized.scope, ...parsed.data }));
      } catch (error) {
        if (
          error instanceof DbtDependencyEditReceiptInvalidError ||
          error instanceof WorkspaceFileBatchIdempotencyConflictError
        ) {
          reply.code(409).send({
            error: {
              type: 'conflict',
              reason:
                error instanceof DbtDependencyEditReceiptInvalidError
                  ? HTTP_ERROR_REASON.dbtDependencyEditReceiptInvalid
                  : HTTP_ERROR_REASON.dbtDependencyEditIdempotencyConflict,
            },
          });
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
      badRequestIssue(HTTP_ERROR_REASON.invalidDbtDependencyEditRequest, { target: 'body' })
    )
  );
}
