/** Owned concern: adapt ValidateDbtProjectImport and ImportDbtProject to protected HTTP. */
import {
  DbtProjectImportCommandSchema,
  ValidateDbtProjectImportRequestSchema,
  type DbtProjectImportCommand,
  type ValidateDbtProjectImportRequest,
} from '@dvt/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { AuthorizationAction } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  DbtProjectImportAuthorityConflictError,
  DbtProjectImportCanvasOccupiedError,
  DbtProjectImportIdempotencyMismatchError,
  DbtProjectImportProjectionError,
  DbtProjectImportRejectedError,
  DbtProjectImportStaleReceiptError,
} from '../../application/ports/dbtProjectImport.js';
import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ImportDbtProjectUseCase } from '../../application/services/importDbtProjectUseCase.js';
import type { ValidateDbtProjectImportUseCase } from '../../application/services/validateDbtProjectImportUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue, type RouteParseResult } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type DbtProjectImportQuery = {
  readonly tenantId?: string;
  readonly projectId?: string;
  readonly environmentId?: string;
};

type DbtProjectImportRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly validateUseCase: Pick<ValidateDbtProjectImportUseCase, 'execute'>;
  readonly importUseCase: Pick<ImportDbtProjectUseCase, 'execute'>;
  readonly rateLimit: { readonly max: number; readonly timeWindow: number };
};

export function registerDbtProjectImportRoutes(
  app: FastifyInstance,
  deps: DbtProjectImportRouteDeps
): void {
  app.post<{ Querystring: DbtProjectImportQuery; Body: ValidateDbtProjectImportRequest }>(
    RUNTIME_ROUTE_PATH.dbtProjectImportValidate,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeImportRequest(
        request,
        reply,
        deps,
        AUTHORIZATION_ACTION.workspaceFilesView
      );
      if (!authorized) return;

      const parsed = ValidateDbtProjectImportRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        respondInvalidRequest(reply);
        return;
      }
      reply.code(200).send(await deps.validateUseCase.execute(authorized.scope, parsed.data));
    }
  );

  app.post<{ Querystring: DbtProjectImportQuery; Body: DbtProjectImportCommand }>(
    RUNTIME_ROUTE_PATH.dbtProjectImport,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeImportRequest(
        request,
        reply,
        deps,
        AUTHORIZATION_ACTION.workspaceFilesSave
      );
      if (!authorized) return;

      const parsed = DbtProjectImportCommandSchema.safeParse(request.body);
      if (!parsed.success) {
        respondInvalidRequest(reply);
        return;
      }

      try {
        reply.code(200).send(await deps.importUseCase.execute(authorized.scope, parsed.data));
      } catch (error) {
        if (respondImportError(reply, error)) return;
        throw error;
      }
    }
  );
}

async function authorizeImportRequest(
  request: FastifyRequest<{ Querystring: DbtProjectImportQuery }>,
  reply: FastifyReply,
  deps: Pick<DbtProjectImportRouteDeps, 'authenticator' | 'authorizer'>,
  action: AuthorizationAction
): Promise<{ readonly scope: WorkspaceStorageScope } | false> {
  const parsed = parseScope(request.query);
  if (!parsed.ok) {
    httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
    return false;
  }
  const auth = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: { ...parsed.value.accessScope, action },
  });
  if (!auth.ok) {
    httpErrorTranslation.respond(reply, auth.response);
    return false;
  }
  return { scope: parsed.value.scope };
}

function parseScope(input: DbtProjectImportQuery): RouteParseResult<{
  readonly accessScope: ReturnType<typeof buildEnvironmentAccessScope>;
  readonly scope: WorkspaceStorageScope;
}> {
  const tenantId = TenantId.parse(input.tenantId ?? '');
  const projectId = ProjectId.parse(input.projectId ?? '');
  const environmentId = EnvironmentId.parse(input.environmentId ?? '');
  if (!tenantId.ok || !projectId.ok || !environmentId.ok) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidDbtProjectImportRequest, {
        target: 'query',
      }),
    };
  }
  const scope = {
    tenantId: tenantId.value.value,
    projectId: projectId.value.value,
    environmentId: environmentId.value.value,
  };
  return {
    ok: true,
    value: {
      accessScope: buildEnvironmentAccessScope(
        tenantId.value,
        projectId.value,
        environmentId.value
      ),
      scope,
    },
  };
}

function respondInvalidRequest(reply: FastifyReply): void {
  httpErrorTranslation.respond(
    reply,
    httpErrorTranslation.parse.issue(
      badRequestIssue(HTTP_ERROR_REASON.invalidDbtProjectImportRequest, { target: 'body' })
    )
  );
}

function respondImportError(reply: FastifyReply, error: unknown): boolean {
  const mapped = mapImportError(error);
  if (!mapped) return false;
  reply.code(mapped.status).send({
    error: {
      type: mapped.status === 409 ? 'conflict' : 'unprocessable_entity',
      reason: mapped.reason,
    },
  });
  return true;
}

function mapImportError(
  error: unknown
): { readonly status: 409 | 422; readonly reason: string } | null {
  if (error instanceof DbtProjectImportStaleReceiptError) {
    return { status: 409, reason: HTTP_ERROR_REASON.dbtProjectImportStaleReceipt };
  }
  if (error instanceof DbtProjectImportCanvasOccupiedError) {
    return { status: 409, reason: HTTP_ERROR_REASON.dbtProjectImportCanvasOccupied };
  }
  if (error instanceof DbtProjectImportAuthorityConflictError) {
    return { status: 409, reason: HTTP_ERROR_REASON.dbtProjectImportAuthorityConflict };
  }
  if (error instanceof DbtProjectImportIdempotencyMismatchError) {
    return { status: 409, reason: HTTP_ERROR_REASON.dbtProjectImportIdempotencyMismatch };
  }
  if (error instanceof DbtProjectImportRejectedError) {
    return { status: 422, reason: HTTP_ERROR_REASON.dbtProjectImportRejected };
  }
  if (error instanceof DbtProjectImportProjectionError) {
    return { status: 422, reason: HTTP_ERROR_REASON.dbtProjectImportProjectionFailed };
  }
  return null;
}
