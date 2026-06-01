/**
 * Owned concern: adapt protected workspace plugin catalog query rail to HTTP.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ListWorkspacePluginsUseCase } from '../../application/services/listWorkspacePluginsUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { extractBearerToken } from './authHeaders.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type WorkspacePluginCatalogRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: Pick<AuthorizeCommandScopeService, 'authorize'>;
  readonly listWorkspacePluginsUseCase: Pick<ListWorkspacePluginsUseCase, 'execute'>;
  readonly rateLimit: { readonly max: number; readonly timeWindow: number };
};

type WorkspacePluginCatalogQuery = {
  readonly tenantId?: string;
  readonly projectId?: string;
  readonly environmentId?: string;
};

type ParsedWorkspacePluginCatalogScope = {
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
};

type ParseResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly statusCode: 400 | 403; readonly reason: string };

export function registerWorkspacePluginCatalogRoutes(
  app: FastifyInstance,
  deps: WorkspacePluginCatalogRouteDeps
): void {
  app.get<{ Querystring: WorkspacePluginCatalogQuery }>(
    RUNTIME_ROUTE_PATH.workspacePlugins,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const principal = await authenticateWorkspacePluginCatalogRequest(request, reply, deps);
      if (principal === null) return;

      const parsedScope = parseWorkspacePluginCatalogScope(request.query);
      if (!parsedScope.ok) {
        reply.code(parsedScope.statusCode).send({
          error: {
            type: parsedScope.statusCode === 403 ? 'forbidden' : 'bad_request',
            reason: parsedScope.reason,
          },
        });
        return;
      }

      const requestedScope = buildEnvironmentAccessScope(
        parsedScope.value.tenantId,
        parsedScope.value.projectId,
        parsedScope.value.environmentId
      );
      const authorization = await deps.authorizer.authorize(
        principal,
        {
          ...requestedScope,
          action: AUTHORIZATION_ACTION.workspacePluginsView,
        },
        request.id
      );
      if (!authorization.ok) {
        reply.code(403).send({
          error: {
            type: 'forbidden',
            reason: authorization.reason,
          },
        });
        return;
      }

      const plugins = await deps.listWorkspacePluginsUseCase.execute({
        tenantId: parsedScope.value.tenantId.value,
        projectId: parsedScope.value.projectId.value,
        environmentId: parsedScope.value.environmentId.value,
      });
      reply.code(200).send({ plugins });
    }
  );
}

async function authenticateWorkspacePluginCatalogRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: Pick<WorkspacePluginCatalogRouteDeps, 'authenticator'>
) {
  const authResult = await deps.authenticator.authenticateBearerToken(
    extractBearerToken(request.headers.authorization)
  );
  if (!authResult.ok) {
    reply.code(401).send({
      error: {
        type: 'unauthorized',
        reason: 'authentication_failed',
      },
    });
    return null;
  }

  return authResult.principal;
}

function parseWorkspacePluginCatalogScope(
  input: WorkspacePluginCatalogQuery
): ParseResult<ParsedWorkspacePluginCatalogScope> {
  const tenantId = parseRequiredTenantId(input.tenantId);
  if (!tenantId.ok) return tenantId;

  const projectId = parseRequiredProjectId(input.projectId);
  if (!projectId.ok) return projectId;

  const environmentId = parseRequiredEnvironmentId(input.environmentId);
  if (!environmentId.ok) return environmentId;

  return {
    ok: true,
    value: {
      tenantId: tenantId.value,
      projectId: projectId.value,
      environmentId: environmentId.value,
    },
  };
}

function parseRequiredTenantId(value: string | undefined): ParseResult<TenantId> {
  if (value === undefined) {
    return { ok: false, statusCode: 403, reason: 'missing_tenant_scope' };
  }
  const parsed = TenantId.parse(value);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : { ok: false, statusCode: 400, reason: 'invalid_tenant_id' };
}

function parseRequiredProjectId(value: string | undefined): ParseResult<ProjectId> {
  if (value === undefined) {
    return { ok: false, statusCode: 403, reason: 'missing_project_id' };
  }
  const parsed = ProjectId.parse(value);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : { ok: false, statusCode: 400, reason: 'invalid_project_id' };
}

function parseRequiredEnvironmentId(value: string | undefined): ParseResult<EnvironmentId> {
  if (value === undefined) {
    return { ok: false, statusCode: 403, reason: 'missing_environment_id' };
  }
  const parsed = EnvironmentId.parse(value);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : { ok: false, statusCode: 400, reason: 'invalid_environment_id' };
}
