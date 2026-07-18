/** Owned concern: authorize file-backed dbt project routes against graph and file capabilities. */
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue, type RouteParseResult } from './routeParseIssue.js';

export type DbtProjectFileScopeQuery = Readonly<{
  tenantId?: string;
  projectId?: string;
  environmentId?: string;
}>;

export type DbtProjectFileRouteAuthDeps = Readonly<{
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
}>;

export function parseDbtProjectFileScope(
  input: DbtProjectFileScopeQuery
): RouteParseResult<ReturnType<typeof buildEnvironmentAccessScope>> {
  const tenantId = TenantId.parse(input.tenantId ?? '');
  const projectId = ProjectId.parse(input.projectId ?? '');
  const environmentId = EnvironmentId.parse(input.environmentId ?? '');
  if (!tenantId.ok || !projectId.ok || !environmentId.ok) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidDbtProjectGraphRequest, {
        target: 'query',
      }),
    };
  }
  return {
    ok: true,
    value: buildEnvironmentAccessScope(tenantId.value, projectId.value, environmentId.value),
  };
}

export async function authorizeDbtProjectFileRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: DbtProjectFileRouteAuthDeps,
  accessScope: ReturnType<typeof buildEnvironmentAccessScope>,
  fileAction:
    typeof AUTHORIZATION_ACTION.workspaceFilesView | typeof AUTHORIZATION_ACTION.workspaceFilesSave
): Promise<{ readonly scope: WorkspaceStorageScope } | false> {
  const auth = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      ...accessScope,
      action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
    },
  });
  if (!auth.ok) {
    httpErrorTranslation.respond(reply, auth.response);
    return false;
  }

  const fileAuthorization = await deps.authorizer.authorize(
    auth.context.principal,
    { ...accessScope, action: fileAction },
    request.id
  );
  if (!fileAuthorization.ok) {
    httpErrorTranslation.respond(
      reply,
      httpErrorTranslation.auth.unauthorized(fileAuthorization.reason)
    );
    return false;
  }

  return {
    scope: {
      tenantId: accessScope.tenantId.value,
      projectId: accessScope.projectId.value,
      environmentId: accessScope.environmentId.value,
    },
  };
}
