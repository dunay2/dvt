/** Owned concern: adapt the explicit warehouse Source physical rebind command to HTTP. */
import { RebindWarehouseSourceRequestSchema } from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  SourceObjectNotFoundError,
  UnsupportedSourceObjectImportError,
  WarehouseConnectionNotFoundError,
  WarehouseSourceDiscoveryFailedError,
} from '../../application/ports/warehouseSourceImport.js';
import {
  WarehouseSourceRebindBindingConflictError,
  WarehouseSourceRebindIdempotencyMismatchError,
  WarehouseSourceRebindNodeNotFoundError,
  WarehouseSourceRebindSchemaDriftError,
  WarehouseSourceRebindUnverifiedError,
} from '../../application/ports/warehouseSourceRebind.js';
import {
  WorkspaceFileBatchIdempotencyConflictError,
  WorkspaceFileNotFoundError,
  WorkspaceFileRevisionConflictError,
} from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { RebindWarehouseSourceUseCase } from '../../application/services/rebindWarehouseSourceUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue, type RouteParseResult } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type SourceRebindQuery = {
  readonly tenantId?: string;
  readonly projectId?: string;
  readonly environmentId?: string;
};

type SourceRebindParams = { readonly nodeId: string };

type SourceRebindBody = {
  readonly schemaVersion?: unknown;
  readonly connectionId?: unknown;
  readonly sourceObjectId?: unknown;
  readonly idempotencyKey?: unknown;
};

export type WarehouseSourceRebindRouteDeps = Readonly<{
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  rebindSourceUseCase: RebindWarehouseSourceUseCase;
  rateLimit: { readonly max: number; readonly timeWindow: number };
}>;

export function registerWarehouseSourceRebindRoute(
  app: FastifyInstance,
  deps: WarehouseSourceRebindRouteDeps
): void {
  app.patch<{
    Params: SourceRebindParams;
    Querystring: SourceRebindQuery;
    Body: SourceRebindBody;
  }>(
    RUNTIME_ROUTE_PATH.warehouseSourceRebind,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const scope = parseRequestedScope(request.query);
      if (!scope.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(scope.issue));
        return;
      }
      const auth = await authorizeExecutionScope({
        authenticator: deps.authenticator,
        authorizer: deps.authorizer,
        token: extractBearerToken(request.headers.authorization),
        requestId: request.id,
        requestedScope: {
          ...scope.value,
          action: AUTHORIZATION_ACTION.workspaceSourceImportRebind,
        },
      });
      if (!auth.ok) {
        httpErrorTranslation.respond(reply, auth.response);
        return;
      }
      const parsedBody = RebindWarehouseSourceRequestSchema.safeParse(request.body);
      if (!parsedBody.success || request.params.nodeId.trim().length === 0) {
        httpErrorTranslation.respond(
          reply,
          httpErrorTranslation.parse.issue(
            badRequestIssue(HTTP_ERROR_REASON.invalidBody, { target: 'body' })
          )
        );
        return;
      }

      try {
        reply.code(200).send(
          await deps.rebindSourceUseCase.execute({
            scope: {
              tenantId: scope.value.tenantId.value,
              projectId: scope.value.projectId.value,
              environmentId: scope.value.environmentId.value,
            },
            nodeId: request.params.nodeId,
            ...parsedBody.data,
          })
        );
      } catch (error) {
        if (error instanceof WarehouseSourceRebindNodeNotFoundError) {
          reply.code(404).send({
            error: { type: 'not_found', reason: 'warehouse_source_rebind_node_not_found' },
          });
          return;
        }
        if (error instanceof WarehouseConnectionNotFoundError) {
          reply.code(404).send({
            error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
          });
          return;
        }
        if (error instanceof SourceObjectNotFoundError) {
          reply.code(404).send({
            error: { type: 'not_found', reason: 'source_object_not_found' },
          });
          return;
        }
        if (error instanceof UnsupportedSourceObjectImportError) {
          reply.code(422).send({
            error: { type: 'unprocessable_entity', reason: 'unsupported_source_object_import' },
          });
          return;
        }
        if (error instanceof WarehouseSourceDiscoveryFailedError) {
          reply.code(422).send({
            error: { type: 'unprocessable_entity', reason: 'warehouse_source_discovery_failed' },
          });
          return;
        }
        if (error instanceof WarehouseSourceRebindSchemaDriftError) {
          reply.code(422).send({
            error: { type: 'unprocessable_entity', reason: 'warehouse_source_rebind_schema_drift' },
          });
          return;
        }
        if (error instanceof WarehouseSourceRebindUnverifiedError) {
          reply.code(422).send({
            error: { type: 'unprocessable_entity', reason: 'warehouse_source_rebind_unverified' },
          });
          return;
        }
        if (
          error instanceof WarehouseSourceRebindBindingConflictError ||
          error instanceof WorkspaceFileNotFoundError
        ) {
          reply.code(409).send({
            error: { type: 'conflict', reason: 'workspace_source_rebind_conflict' },
          });
          return;
        }
        if (
          error instanceof WarehouseSourceRebindIdempotencyMismatchError ||
          error instanceof WorkspaceFileBatchIdempotencyConflictError
        ) {
          reply.code(409).send({
            error: { type: 'conflict', reason: 'workspace_source_rebind_idempotency_mismatch' },
          });
          return;
        }
        if (error instanceof WorkspaceFileRevisionConflictError) {
          httpErrorTranslation.respond(
            reply,
            httpErrorTranslation.workspaceFiles.revisionConflict()
          );
          return;
        }
        throw error;
      }
    }
  );
}

function parseRequestedScope(
  input: SourceRebindQuery
): RouteParseResult<ReturnType<typeof buildEnvironmentAccessScope>> {
  const tenant = parseTenantId(input.tenantId);
  if (!tenant.ok) return tenant;
  const project = parseProjectId(input.projectId);
  if (!project.ok) return project;
  const environment = parseEnvironmentId(input.environmentId);
  if (!environment.ok) return environment;
  return {
    ok: true,
    value: buildEnvironmentAccessScope(tenant.value, project.value, environment.value),
  };
}

function parseTenantId(value: string | undefined): RouteParseResult<TenantId> {
  if (value == null) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.missingTenantId, { target: 'tenantId' }),
    };
  }
  const parsed = TenantId.parse(value);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : {
        ok: false,
        issue: badRequestIssue(HTTP_ERROR_REASON.invalidTenantId, { target: 'tenantId' }),
      };
}

function parseProjectId(value: string | undefined): RouteParseResult<ProjectId> {
  if (value == null) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.missingProjectId, { target: 'projectId' }),
    };
  }
  const parsed = ProjectId.parse(value);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : {
        ok: false,
        issue: badRequestIssue(HTTP_ERROR_REASON.invalidProjectId, { target: 'projectId' }),
      };
}

function parseEnvironmentId(value: string | undefined): RouteParseResult<EnvironmentId> {
  if (value == null) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.missingEnvironmentId, { target: 'environmentId' }),
    };
  }
  const parsed = EnvironmentId.parse(value);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : {
        ok: false,
        issue: badRequestIssue(HTTP_ERROR_REASON.invalidEnvironmentId, { target: 'environmentId' }),
      };
}
