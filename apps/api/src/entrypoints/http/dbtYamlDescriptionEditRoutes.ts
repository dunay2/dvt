/** Owned concern: adapt governed dbt YAML description proposal and mutation rails to HTTP. */
import {
  ApplyDbtYamlDescriptionEditRequestSchema,
  ProposeDbtYamlDescriptionEditRequestSchema,
  RevertDbtYamlDescriptionEditRequestSchema,
} from '@dvt/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { DbtProjectFileAuthorityRequiredError } from '../../application/ports/dbtProjectImport.js';
import {
  DbtYamlDescriptionDocumentInvalidError,
  DbtYamlDescriptionProposalMismatchError,
  DbtYamlDescriptionReceiptInvalidError,
  DbtYamlDescriptionResourceAmbiguousError,
  DbtYamlDescriptionResourceNotFoundError,
  DbtYamlDescriptionResourceUnsupportedError,
  DbtYamlDescriptionRevisionConflictError,
} from '../../application/ports/dbtYamlDescriptionEdit.js';
import {
  InvalidWorkspacePathError,
  WorkspaceFileBatchIdempotencyConflictError,
  WorkspaceFileNotFoundError,
} from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { DbtYamlDescriptionEditTransaction } from '../../application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.js';

import {
  authorizeDbtProjectFileRequest,
  parseDbtProjectFileScope,
  type DbtProjectFileScopeQuery,
} from './dbtProjectFileRouteAuthorization.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type DbtYamlDescriptionEditRouteDeps = Readonly<{
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  transaction: Pick<DbtYamlDescriptionEditTransaction, 'propose' | 'apply' | 'revert'>;
  rateLimit: { readonly max: number; readonly timeWindow: number };
}>;

export function registerDbtYamlDescriptionEditRoutes(
  app: FastifyInstance,
  deps: DbtYamlDescriptionEditRouteDeps
): void {
  app.post<{ Querystring: DbtProjectFileScopeQuery; Body: unknown }>(
    RUNTIME_ROUTE_PATH.dbtYamlDescriptionEditProposals,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsed = ProposeDbtYamlDescriptionEditRequestSchema.safeParse(request.body);
      if (!parsed.success) return respondInvalidRequest(reply);
      const authorized = await authorizeRequest(
        request,
        reply,
        deps,
        AUTHORIZATION_ACTION.workspaceFilesView
      );
      if (!authorized) return;
      try {
        reply
          .code(200)
          .send(await deps.transaction.propose({ scope: authorized.scope, ...parsed.data }));
      } catch (error) {
        if (respondDomainError(reply, error)) return;
        throw error;
      }
    }
  );

  app.post<{ Querystring: DbtProjectFileScopeQuery; Body: unknown }>(
    RUNTIME_ROUTE_PATH.dbtYamlDescriptionEditApplications,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsed = ApplyDbtYamlDescriptionEditRequestSchema.safeParse(request.body);
      if (!parsed.success) return respondInvalidRequest(reply);
      const authorized = await authorizeRequest(
        request,
        reply,
        deps,
        AUTHORIZATION_ACTION.workspaceFilesSave
      );
      if (!authorized) return;
      try {
        reply
          .code(200)
          .send(await deps.transaction.apply({ scope: authorized.scope, ...parsed.data }));
      } catch (error) {
        if (respondDomainError(reply, error)) return;
        throw error;
      }
    }
  );

  app.post<{ Querystring: DbtProjectFileScopeQuery; Body: unknown }>(
    RUNTIME_ROUTE_PATH.dbtYamlDescriptionEditReverts,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsed = RevertDbtYamlDescriptionEditRequestSchema.safeParse(request.body);
      if (!parsed.success) return respondInvalidRequest(reply);
      const authorized = await authorizeRequest(
        request,
        reply,
        deps,
        AUTHORIZATION_ACTION.workspaceFilesSave
      );
      if (!authorized) return;
      try {
        reply
          .code(200)
          .send(await deps.transaction.revert({ scope: authorized.scope, ...parsed.data }));
      } catch (error) {
        if (respondDomainError(reply, error)) return;
        throw error;
      }
    }
  );
}

async function authorizeRequest(
  request: Parameters<typeof authorizeDbtProjectFileRequest>[0] & {
    query: DbtProjectFileScopeQuery;
  },
  reply: FastifyReply,
  deps: DbtYamlDescriptionEditRouteDeps,
  fileAction:
    typeof AUTHORIZATION_ACTION.workspaceFilesView | typeof AUTHORIZATION_ACTION.workspaceFilesSave
) {
  const parsedScope = parseDbtProjectFileScope(request.query);
  if (!parsedScope.ok) {
    httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsedScope.issue));
    return false;
  }
  return authorizeDbtProjectFileRequest(request, reply, deps, parsedScope.value, fileAction);
}

function respondInvalidRequest(reply: FastifyReply): void {
  httpErrorTranslation.respond(
    reply,
    httpErrorTranslation.parse.issue(
      badRequestIssue(HTTP_ERROR_REASON.invalidDbtYamlDescriptionEditRequest, { target: 'body' })
    )
  );
}

function respondDomainError(reply: FastifyReply, error: unknown): boolean {
  if (
    error instanceof DbtYamlDescriptionRevisionConflictError ||
    error instanceof DbtYamlDescriptionProposalMismatchError ||
    error instanceof DbtYamlDescriptionReceiptInvalidError ||
    error instanceof WorkspaceFileBatchIdempotencyConflictError ||
    error instanceof DbtProjectFileAuthorityRequiredError
  ) {
    reply.code(409).send({
      error: { type: 'conflict', reason: resolveConflictReason(error) },
    });
    return true;
  }
  if (
    error instanceof DbtYamlDescriptionResourceNotFoundError ||
    error instanceof WorkspaceFileNotFoundError
  ) {
    reply.code(404).send({
      error: { type: 'not_found', reason: HTTP_ERROR_REASON.dbtYamlDescriptionResourceNotFound },
    });
    return true;
  }
  if (
    error instanceof DbtYamlDescriptionResourceAmbiguousError ||
    error instanceof DbtYamlDescriptionResourceUnsupportedError ||
    error instanceof DbtYamlDescriptionDocumentInvalidError
  ) {
    reply.code(422).send({
      error: { type: 'unprocessable_entity', reason: resolveUnprocessableReason(error) },
    });
    return true;
  }
  if (error instanceof InvalidWorkspacePathError) {
    respondInvalidRequest(reply);
    return true;
  }
  return false;
}

function resolveConflictReason(error: unknown): string {
  if (error instanceof DbtProjectFileAuthorityRequiredError) {
    return HTTP_ERROR_REASON.dbtProjectFileAuthorityRequired;
  }
  if (error instanceof WorkspaceFileBatchIdempotencyConflictError) {
    return HTTP_ERROR_REASON.dbtYamlDescriptionIdempotencyConflict;
  }
  if (error instanceof DbtYamlDescriptionReceiptInvalidError) {
    return HTTP_ERROR_REASON.dbtYamlDescriptionReceiptInvalid;
  }
  if (error instanceof DbtYamlDescriptionProposalMismatchError) {
    return HTTP_ERROR_REASON.dbtYamlDescriptionProposalMismatch;
  }
  return HTTP_ERROR_REASON.dbtYamlDescriptionRevisionConflict;
}

function resolveUnprocessableReason(error: unknown): string {
  if (error instanceof DbtYamlDescriptionResourceAmbiguousError) {
    return HTTP_ERROR_REASON.dbtYamlDescriptionResourceAmbiguous;
  }
  if (error instanceof DbtYamlDescriptionResourceUnsupportedError) {
    return HTTP_ERROR_REASON.dbtYamlDescriptionResourceUnsupported;
  }
  return HTTP_ERROR_REASON.dbtYamlDescriptionDocumentInvalid;
}
