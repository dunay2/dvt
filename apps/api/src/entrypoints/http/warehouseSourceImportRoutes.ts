/** Owned concern: adapt warehouse source import command/query rails to HTTP. */
import {
  CreateWarehouseConnectionRequestSchema,
  ImportSourceObjectsRequestV2Schema,
  RenameWarehouseConnectionRequestSchema,
} from '@dvt/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  InvalidWarehouseSourceImportRequestError,
  DuplicateWarehouseConnectionError,
  SUPPORTED_WAREHOUSE_CONNECTION_TYPES,
  WarehouseConnectionTestFailedError,
  WarehouseConnectionNotFoundError,
  WarehouseSourceImportDraftConflictError,
  WarehouseSourceImportIdempotencyMismatchError,
  SourceObjectNotFoundError,
  UnsupportedSourceObjectImportError,
  WarehouseSourceDiscoveryFailedError,
  type CreateWarehouseConnectionInput,
  type ImportWarehouseSourcesInput,
  type RenameWarehouseConnectionInput,
  type WarehouseConnectionType,
} from '../../application/ports/warehouseSourceImport.js';
import { WorkspaceFileRevisionConflictError } from '../../application/ports/workspaceFiles.js';
import { WorkspaceFileBatchIdempotencyConflictError } from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { CreateWarehouseConnectionUseCase } from '../../application/services/createWarehouseConnectionUseCase.js';
import { WarehouseSourceImportProjectionError } from '../../application/services/dbtProjectFilesWarehouseSourceImportStrategy.js';
import { WarehouseSourceImportCanvasNotFoundError } from '../../application/services/graphDraftWarehouseSourceImportStrategy.js';
import type { ImportWarehouseSourcesUseCase } from '../../application/services/importWarehouseSourcesUseCase.js';
import type { ListWarehouseConnectionSourceObjectsUseCase } from '../../application/services/listWarehouseConnectionSourceObjectsUseCase.js';
import type { ListWarehouseConnectionsUseCase } from '../../application/services/listWarehouseConnectionsUseCase.js';
import type { RenameWarehouseConnectionUseCase } from '../../application/services/renameWarehouseConnectionUseCase.js';
import type { TestWarehouseConnectionUseCase } from '../../application/services/testWarehouseConnectionUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue, type RouteParseResult } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type WarehouseSourceImportQuery = {
  readonly tenantId?: string;
  readonly projectId?: string;
  readonly environmentId?: string;
};

type WarehouseConnectionParams = {
  readonly connectionId: string;
};

type CreateWarehouseConnectionBody = {
  readonly name?: unknown;
  readonly type?: unknown;
  readonly database?: unknown;
  readonly credentialRef?: unknown;
};

type RenameWarehouseConnectionBody = {
  readonly name?: unknown;
};

type ImportWarehouseSourcesBody = {
  readonly schemaVersion?: unknown;
  readonly canvasId?: unknown;
  readonly idempotencyKey?: unknown;
  readonly connectionId?: unknown;
  readonly objects?: unknown;
  readonly groupingStrategy?: unknown;
  readonly includeColumns?: unknown;
  readonly addTests?: unknown;
  readonly addFreshness?: unknown;
};

type WarehouseSourceImportRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly listConnectionsUseCase: ListWarehouseConnectionsUseCase;
  readonly listSourceObjectsUseCase: ListWarehouseConnectionSourceObjectsUseCase;
  readonly createConnectionUseCase: CreateWarehouseConnectionUseCase;
  readonly renameConnectionUseCase: RenameWarehouseConnectionUseCase;
  readonly testConnectionUseCase: TestWarehouseConnectionUseCase;
  readonly importSourcesUseCase: ImportWarehouseSourcesUseCase;
  readonly rateLimit: { readonly max: number; readonly timeWindow: number };
};

export function registerWarehouseSourceImportRoutes(
  app: FastifyInstance,
  deps: WarehouseSourceImportRouteDeps
): void {
  app.get<{ Querystring: WarehouseSourceImportQuery }>(
    RUNTIME_ROUTE_PATH.warehouseConnections,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWarehouseSourceImportRequest(request, reply, deps);
      if (!authorized) return;

      reply
        .code(200)
        .send(await deps.listConnectionsUseCase.execute(toDraftScope(authorized.scope)));
    }
  );

  app.get<{ Params: WarehouseConnectionParams; Querystring: WarehouseSourceImportQuery }>(
    RUNTIME_ROUTE_PATH.warehouseConnectionSourceObjects,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWarehouseSourceImportRequest(request, reply, deps);
      if (!authorized) return;

      try {
        reply
          .code(200)
          .send(
            await deps.listSourceObjectsUseCase.execute(
              toDraftScope(authorized.scope),
              request.params.connectionId
            )
          );
      } catch (error) {
        if (error instanceof WarehouseConnectionNotFoundError) {
          reply.code(404).send({
            error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
          });
          return;
        }
        if (error instanceof WarehouseSourceDiscoveryFailedError) {
          reply.code(422).send({
            error: { type: 'unprocessable_entity', reason: 'warehouse_source_discovery_failed' },
          });
          return;
        }
        throw error;
      }
    }
  );

  app.post<{ Querystring: WarehouseSourceImportQuery; Body: CreateWarehouseConnectionBody }>(
    RUNTIME_ROUTE_PATH.warehouseConnections,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWarehouseSourceImportRequest(request, reply, deps, {
        action: AUTHORIZATION_ACTION.workspaceSourceConnectionCreate,
      });
      if (!authorized) return;

      const parsed = parseCreateWarehouseConnectionBody(request.body, authorized.scope);
      if (!parsed.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
        return;
      }

      try {
        reply.code(201).send(await deps.createConnectionUseCase.execute(parsed.value));
      } catch (error) {
        if (error instanceof DuplicateWarehouseConnectionError) {
          reply.code(409).send({
            error: { type: 'conflict', reason: 'warehouse_connection_duplicate' },
          });
          return;
        }
        if (error instanceof WarehouseConnectionTestFailedError) {
          reply.code(422).send({
            error: { type: 'unprocessable_entity', reason: 'warehouse_connection_test_failed' },
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

  app.post<{ Params: WarehouseConnectionParams; Querystring: WarehouseSourceImportQuery }>(
    RUNTIME_ROUTE_PATH.warehouseConnectionTest,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWarehouseSourceImportRequest(request, reply, deps, {
        action: AUTHORIZATION_ACTION.workspaceSourceConnectionTest,
      });
      if (!authorized) return;

      try {
        reply.code(200).send(
          await deps.testConnectionUseCase.execute({
            scope: toDraftScope(authorized.scope),
            connectionId: request.params.connectionId,
          })
        );
      } catch (error) {
        if (error instanceof WarehouseConnectionNotFoundError) {
          reply.code(404).send({
            error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
          });
          return;
        }
        throw error;
      }
    }
  );

  app.patch<{
    Params: WarehouseConnectionParams;
    Querystring: WarehouseSourceImportQuery;
    Body: RenameWarehouseConnectionBody;
  }>(
    RUNTIME_ROUTE_PATH.warehouseConnection,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWarehouseSourceImportRequest(request, reply, deps, {
        action: AUTHORIZATION_ACTION.workspaceSourceConnectionRename,
      });
      if (!authorized) return;

      const parsed = parseRenameWarehouseConnectionBody(
        request.body,
        request.params.connectionId,
        authorized.scope
      );
      if (!parsed.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
        return;
      }

      try {
        reply.code(200).send(await deps.renameConnectionUseCase.execute(parsed.value));
      } catch (error) {
        if (error instanceof WarehouseConnectionNotFoundError) {
          reply.code(404).send({
            error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
          });
          return;
        }
        if (error instanceof DuplicateWarehouseConnectionError) {
          reply.code(409).send({
            error: { type: 'conflict', reason: 'warehouse_connection_duplicate' },
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

  app.post<{ Querystring: WarehouseSourceImportQuery; Body: ImportWarehouseSourcesBody }>(
    RUNTIME_ROUTE_PATH.warehouseSourcesImport,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWarehouseSourceImportRequest(request, reply, deps, {
        action: AUTHORIZATION_ACTION.workspaceSourceImportImport,
      });
      if (!authorized) return;

      const parsed = parseImportWarehouseSourcesBody(request.body, authorized.scope);
      if (!parsed.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
        return;
      }

      try {
        reply.code(200).send(await deps.importSourcesUseCase.execute(parsed.value));
      } catch (error) {
        if (error instanceof WarehouseConnectionNotFoundError) {
          reply.code(404).send({
            error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
          });
          return;
        }
        if (error instanceof WarehouseSourceDiscoveryFailedError) {
          reply.code(422).send({
            error: { type: 'unprocessable_entity', reason: 'warehouse_source_discovery_failed' },
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
        if (error instanceof InvalidWarehouseSourceImportRequestError) {
          const reason =
            error.reason === 'invalid_existing_source_yaml'
              ? HTTP_ERROR_REASON.invalidWorkspaceSourceYaml
              : HTTP_ERROR_REASON.invalidBody;
          httpErrorTranslation.respond(
            reply,
            httpErrorTranslation.parse.issue(
              badRequestIssue(reason, {
                target: error.reason === 'invalid_existing_source_yaml' ? 'workspace_file' : 'body',
              })
            )
          );
          return;
        }
        if (error instanceof WarehouseSourceImportDraftConflictError) {
          reply.code(409).send({
            error: { type: 'conflict', reason: 'workspace_source_import_draft_conflict' },
          });
          return;
        }
        if (error instanceof WarehouseSourceImportCanvasNotFoundError) {
          reply.code(404).send({
            error: {
              type: 'not_found',
              reason: HTTP_ERROR_REASON.workspaceSourceImportCanvasNotFound,
            },
          });
          return;
        }
        if (error instanceof WarehouseSourceImportProjectionError) {
          reply.code(422).send({
            error: {
              type: 'unprocessable_entity',
              reason: HTTP_ERROR_REASON.workspaceSourceImportProjectionFailed,
            },
          });
          return;
        }
        if (
          error instanceof WorkspaceFileBatchIdempotencyConflictError ||
          error instanceof WarehouseSourceImportIdempotencyMismatchError
        ) {
          reply.code(409).send({
            error: {
              type: 'conflict',
              reason: HTTP_ERROR_REASON.workspaceSourceImportIdempotencyMismatch,
            },
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

async function authorizeWarehouseSourceImportRequest(
  request: FastifyRequest<{ Querystring: WarehouseSourceImportQuery }>,
  reply: FastifyReply,
  deps: Pick<WarehouseSourceImportRouteDeps, 'authenticator' | 'authorizer'>,
  options: {
    readonly action?:
      | typeof AUTHORIZATION_ACTION.workspaceSourceImportView
      | typeof AUTHORIZATION_ACTION.workspaceSourceConnectionCreate
      | typeof AUTHORIZATION_ACTION.workspaceSourceConnectionRename
      | typeof AUTHORIZATION_ACTION.workspaceSourceConnectionTest
      | typeof AUTHORIZATION_ACTION.workspaceSourceImportImport;
  } = {}
): Promise<{ readonly scope: ReturnType<typeof buildEnvironmentAccessScope> } | false> {
  const parsed = parseRequestedScope(request.query);
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
      action: options.action ?? AUTHORIZATION_ACTION.workspaceSourceImportView,
    },
  });
  if (!auth.ok) {
    httpErrorTranslation.respond(reply, auth.response);
    return false;
  }

  return { scope: parsed.value };
}

function parseCreateWarehouseConnectionBody(
  body: CreateWarehouseConnectionBody | undefined,
  scope: ReturnType<typeof buildEnvironmentAccessScope>
): RouteParseResult<CreateWarehouseConnectionInput> {
  if (hasForbiddenSecretField(body)) {
    return invalidBody();
  }

  const parsed = CreateWarehouseConnectionRequestSchema.safeParse(body);
  if (!parsed.success) {
    const type = parseWarehouseConnectionType(body?.type);
    return type.ok ? invalidBody() : type;
  }

  return {
    ok: true,
    value: {
      scope: toDraftScope(scope),
      ...parsed.data,
    },
  };
}

function parseRenameWarehouseConnectionBody(
  body: RenameWarehouseConnectionBody | undefined,
  connectionId: string,
  scope: ReturnType<typeof buildEnvironmentAccessScope>
): RouteParseResult<RenameWarehouseConnectionInput> {
  const parsed = RenameWarehouseConnectionRequestSchema.safeParse(body);
  if (!parsed.success) return invalidBody();

  return {
    ok: true,
    value: {
      scope: toDraftScope(scope),
      connectionId,
      ...parsed.data,
    },
  };
}

function hasForbiddenSecretField(body: CreateWarehouseConnectionBody | undefined): boolean {
  if (!isRecord(body)) {
    return false;
  }

  return ['password', 'token', 'secret', 'connectionString'].some((field) => field in body);
}

function parseWarehouseConnectionType(input: unknown): RouteParseResult<WarehouseConnectionType> {
  if (
    typeof input === 'string' &&
    SUPPORTED_WAREHOUSE_CONNECTION_TYPES.includes(input as WarehouseConnectionType)
  ) {
    return { ok: true, value: input as WarehouseConnectionType };
  }

  return {
    ok: false,
    issue: badRequestIssue(HTTP_ERROR_REASON.unsupportedWarehouseAdapter, { target: 'type' }),
  };
}

function toDraftScope(scope: ReturnType<typeof buildEnvironmentAccessScope>) {
  return {
    tenantId: scope.tenantId.value,
    projectId: scope.projectId.value,
    environmentId: scope.environmentId.value,
  };
}

function parseImportWarehouseSourcesBody(
  body: ImportWarehouseSourcesBody | undefined,
  scope: ReturnType<typeof buildEnvironmentAccessScope>
): RouteParseResult<ImportWarehouseSourcesInput> {
  const parsed = ImportSourceObjectsRequestV2Schema.safeParse(body);
  if (!parsed.success) return invalidBody();

  return {
    ok: true,
    value: {
      scope: {
        ...toDraftScope(scope),
      },
      ...parsed.data,
    },
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function invalidBody(): RouteParseResult<never> {
  return {
    ok: false,
    issue: badRequestIssue(HTTP_ERROR_REASON.invalidBody, { target: 'body' }),
  };
}

function parseRequestedScope(
  input: WarehouseSourceImportQuery
): RouteParseResult<ReturnType<typeof buildEnvironmentAccessScope>> {
  const tenant = parseRequiredTenantId(input.tenantId);
  if (!tenant.ok) return { ok: false, issue: tenant.issue };

  const project = parseRequiredProjectId(input.projectId);
  if (!project.ok) return { ok: false, issue: project.issue };

  const environment = parseRequiredEnvironmentId(input.environmentId);
  if (!environment.ok) return { ok: false, issue: environment.issue };

  return {
    ok: true,
    value: buildEnvironmentAccessScope(tenant.value, project.value, environment.value),
  };
}

function parseRequiredTenantId(value: string | undefined): RouteParseResult<TenantId> {
  if (value === undefined) {
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

function parseRequiredProjectId(value: string | undefined): RouteParseResult<ProjectId> {
  if (value === undefined) {
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

function parseRequiredEnvironmentId(value: string | undefined): RouteParseResult<EnvironmentId> {
  if (value === undefined) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.missingEnvironmentId, {
        target: 'environmentId',
      }),
    };
  }
  const parsed = EnvironmentId.parse(value);
  return parsed.ok
    ? { ok: true, value: parsed.value }
    : {
        ok: false,
        issue: badRequestIssue(HTTP_ERROR_REASON.invalidEnvironmentId, {
          target: 'environmentId',
        }),
      };
}
