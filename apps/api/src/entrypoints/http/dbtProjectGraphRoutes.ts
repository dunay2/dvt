/** Owned concern: adapt the protected ProjectDbtGraphFromFiles query rail to HTTP. */
import { CanvasAuthoringAuthorityBindingSchema } from '@dvt/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../../application/services/projectDbtGraphFromFilesUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue, type RouteParseResult } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type DbtProjectGraphQuery = {
  readonly tenantId?: string;
  readonly projectId?: string;
  readonly environmentId?: string;
  readonly canvasId?: string;
  readonly projectRoot?: string;
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

      const authorized = await authorizeDbtProjectGraphRequest(request, reply, deps, parsed.value);
      if (!authorized) return;

      reply.code(200).send(
        await deps.useCase.execute({
          scope: authorized.scope,
          authorityBinding: parsed.value.authorityBinding,
        })
      );
    }
  );
}

function parseDbtProjectGraphQuery(input: DbtProjectGraphQuery): RouteParseResult<{
  readonly accessScope: ReturnType<typeof buildEnvironmentAccessScope>;
  readonly authorityBinding: ReturnType<typeof CanvasAuthoringAuthorityBindingSchema.parse>;
}> {
  const tenantId = TenantId.parse(input.tenantId ?? '');
  const projectId = ProjectId.parse(input.projectId ?? '');
  const environmentId = EnvironmentId.parse(input.environmentId ?? '');
  const authorityBinding = CanvasAuthoringAuthorityBindingSchema.safeParse({
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: input.canvasId,
    authority: { kind: 'dbt-project-files', projectRoot: input.projectRoot },
  });
  if (!tenantId.ok || !projectId.ok || !environmentId.ok || !authorityBinding.success) {
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
      accessScope: buildEnvironmentAccessScope(
        tenantId.value,
        projectId.value,
        environmentId.value
      ),
      authorityBinding: authorityBinding.data,
    },
  };
}

async function authorizeDbtProjectGraphRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: Pick<DbtProjectGraphRouteDeps, 'authenticator' | 'authorizer'>,
  parsed: {
    readonly accessScope: ReturnType<typeof buildEnvironmentAccessScope>;
  }
): Promise<{ readonly scope: WorkspaceStorageScope } | false> {
  const auth = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      ...parsed.accessScope,
      action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
    },
  });
  if (!auth.ok) {
    httpErrorTranslation.respond(reply, auth.response);
    return false;
  }

  const fileReadAuthorization = await deps.authorizer.authorize(
    auth.context.principal,
    {
      ...parsed.accessScope,
      action: AUTHORIZATION_ACTION.workspaceFilesView,
    },
    request.id
  );
  if (!fileReadAuthorization.ok) {
    httpErrorTranslation.respond(
      reply,
      httpErrorTranslation.auth.unauthorized(fileReadAuthorization.reason)
    );
    return false;
  }

  return {
    scope: {
      tenantId: parsed.accessScope.tenantId.value,
      projectId: parsed.accessScope.projectId.value,
      environmentId: parsed.accessScope.environmentId.value,
    },
  };
}
