/** Owned concern: adapt warehouse source import command/query rails to HTTP. */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  InvalidWarehouseSourceImportRequestError,
  WarehouseConnectionNotFoundError,
  WarehouseSourceImportDraftConflictError,
  WarehouseTableNotFoundError,
  type ImportWarehouseSourcesInput,
  type SourceImportGrouping,
  type WarehouseColumn,
  type WarehouseTable,
} from '../../application/ports/warehouseSourceImport.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ImportWarehouseSourcesUseCase } from '../../application/services/importWarehouseSourcesUseCase.js';
import type { ListWarehouseConnectionsUseCase } from '../../application/services/listWarehouseConnectionsUseCase.js';
import type { ListWarehouseConnectionTablesUseCase } from '../../application/services/listWarehouseConnectionTablesUseCase.js';
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

type ImportWarehouseSourcesBody = {
  readonly connectionId?: unknown;
  readonly tables?: unknown;
  readonly groupingStrategy?: unknown;
  readonly includeColumns?: unknown;
  readonly addTests?: unknown;
  readonly addFreshness?: unknown;
};

type WarehouseSourceImportRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly listConnectionsUseCase: ListWarehouseConnectionsUseCase;
  readonly listTablesUseCase: ListWarehouseConnectionTablesUseCase;
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

      reply.code(200).send(await deps.listConnectionsUseCase.execute());
    }
  );

  app.get<{ Params: WarehouseConnectionParams; Querystring: WarehouseSourceImportQuery }>(
    RUNTIME_ROUTE_PATH.warehouseConnectionTables,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWarehouseSourceImportRequest(request, reply, deps);
      if (!authorized) return;

      try {
        reply.code(200).send(await deps.listTablesUseCase.execute(request.params.connectionId));
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
        if (error instanceof WarehouseTableNotFoundError) {
          reply.code(404).send({
            error: { type: 'not_found', reason: 'warehouse_table_not_found' },
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

function parseImportWarehouseSourcesBody(
  body: ImportWarehouseSourcesBody | undefined,
  scope: ReturnType<typeof buildEnvironmentAccessScope>
): RouteParseResult<ImportWarehouseSourcesInput> {
  if (typeof body?.connectionId !== 'string' || !Array.isArray(body.tables)) {
    return invalidBody();
  }
  const grouping = parseGrouping(body.groupingStrategy);
  if (!grouping.ok) return grouping;
  if (
    typeof body.includeColumns !== 'boolean' ||
    typeof body.addTests !== 'boolean' ||
    typeof body.addFreshness !== 'boolean'
  ) {
    return invalidBody();
  }

  const tables = parseTables(body.tables);
  if (!tables.ok) return tables;

  return {
    ok: true,
    value: {
      scope: {
        tenantId: scope.tenantId.value,
        projectId: scope.projectId.value,
        environmentId: scope.environmentId.value,
      },
      connectionId: body.connectionId,
      tables: tables.value,
      groupingStrategy: grouping.value,
      includeColumns: body.includeColumns,
      addTests: body.addTests,
      addFreshness: body.addFreshness,
    },
  };
}

function parseTables(input: readonly unknown[]): RouteParseResult<readonly WarehouseTable[]> {
  const tables: WarehouseTable[] = [];
  for (const item of input) {
    if (!isRecord(item)) {
      return invalidBody();
    }
    const { database, schema, table, rowCount, columns } = item;
    if (typeof database !== 'string' || typeof schema !== 'string' || typeof table !== 'string') {
      return invalidBody();
    }

    let parsed: WarehouseTable = { database, schema, table };
    if (typeof rowCount === 'number') {
      parsed = { ...parsed, rowCount };
    }
    if (Array.isArray(columns)) {
      const parsedColumns = parseColumns(columns);
      if (!parsedColumns.ok) return parsedColumns;
      parsed = { ...parsed, columns: parsedColumns.value };
    }
    tables.push(parsed);
  }
  return { ok: true, value: tables };
}

function parseColumns(input: readonly unknown[]): RouteParseResult<readonly WarehouseColumn[]> {
  const columns = [];
  for (const item of input) {
    if (
      !isRecord(item) ||
      typeof item.name !== 'string' ||
      typeof item.type !== 'string' ||
      typeof item.nullable !== 'boolean'
    ) {
      return invalidBody();
    }
    columns.push({ name: item.name, type: item.type, nullable: item.nullable });
  }
  return { ok: true, value: columns };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function parseGrouping(input: unknown): RouteParseResult<SourceImportGrouping> {
  return input === 'schema' || input === 'database' || input === 'custom'
    ? { ok: true, value: input }
    : invalidBody();
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
