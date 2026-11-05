/** Owned concern: authenticate and authorize the exact scope shared by workspace-file rails. */
import type { FastifyReply, FastifyRequest } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import {
  parseRequiredEnvironmentScope,
  type EnvironmentScopeQuery,
} from './routeParserPrimitives.js';
export type WorkspaceFilesQuery = EnvironmentScopeQuery;
type WorkspaceFilesAction =
  typeof AUTHORIZATION_ACTION.workspaceFilesView | typeof AUTHORIZATION_ACTION.workspaceFilesSave;
export type WorkspaceFilesAuthorizationDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
};
export async function authorizeWorkspaceFilesRequest(
  request: FastifyRequest<{ Querystring: WorkspaceFilesQuery }>,
  reply: FastifyReply,
  deps: WorkspaceFilesAuthorizationDeps,
  options: { readonly action?: WorkspaceFilesAction } = {}
): Promise<{ readonly scope: WorkspaceStorageScope } | false> {
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
      action: options.action ?? AUTHORIZATION_ACTION.workspaceFilesView,
    },
  });
  if (!auth.ok) {
    httpErrorTranslation.respond(reply, auth.response);
    return false;
  }

  return {
    scope: {
      tenantId: parsed.value.tenantId.value,
      projectId: parsed.value.projectId.value,
      environmentId: parsed.value.environmentId.value,
    },
  };
}
