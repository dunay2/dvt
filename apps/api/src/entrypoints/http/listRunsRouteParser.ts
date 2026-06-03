/**
 * Owned concern: parse the protected list-runs HTTP query into canonical
 * filters and an explicit tenant/project/environment access scope.
 */
import {
  buildEnvironmentAccessScope,
  buildProjectAccessScope,
  buildTenantAccessScope,
  type EnvironmentAccessScope,
  type ProjectAccessScope,
  type RequestedScope,
  type TenantAccessScope,
} from '../../application/ports/accessDecision.js';
import type { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { LIST_RUNS_ACTION, LIST_RUNS_LIMIT } from './listRunsRouteParser.constants.js';
import { badRequestResult, forbiddenResult, type RouteParseResult } from './routeParseIssue.js';
import {
  parseIntWithDefault,
  parseOptionalEnvironmentId,
  parseOptionalProjectId,
  parseRequiredTenantId,
} from './routeParserPrimitives.js';

export interface ParsedListRunsRequest {
  readonly requestedScope: RequestedScope & {
    readonly action: typeof LIST_RUNS_ACTION;
  };
  readonly query: {
    readonly limit: number;
  };
}

type ParsedListRunsResult = RouteParseResult<ParsedListRunsRequest>;
type ParsedListRunsScope = TenantAccessScope | ProjectAccessScope | EnvironmentAccessScope;

export function parseListRunsRequest(input: {
  readonly tenantId: string | undefined;
  readonly projectId: string | undefined;
  readonly environmentId: string | undefined;
  readonly limit: string | undefined;
  readonly cursor: string | undefined;
}): ParsedListRunsResult {
  const requestedScope = parseListRunsScope(input);
  if (!requestedScope.ok) {
    return requestedScope;
  }

  if (input.cursor !== undefined) {
    return badRequestResult(HTTP_ERROR_REASON.unsupportedCursor, { target: 'cursor' });
  }

  const limit = parseListRunsLimit(input.limit);
  if (!limit.ok) {
    return limit;
  }

  return {
    ok: true,
    value: {
      requestedScope: {
        ...requestedScope.value,
        action: LIST_RUNS_ACTION,
      },
      query: { limit: limit.value },
    },
  };
}

function parseListRunsScope(input: {
  readonly tenantId: string | undefined;
  readonly projectId: string | undefined;
  readonly environmentId: string | undefined;
}): RouteParseResult<ParsedListRunsScope> {
  const tenant = parseListRunsTenantId(input.tenantId);
  if (!tenant.ok) {
    return tenant;
  }

  const project = parseListRunsProjectId(input.projectId);
  if (!project.ok) {
    return project;
  }

  const environment = parseListRunsEnvironmentId(input.environmentId, project.value);
  if (!environment.ok) {
    return environment;
  }

  return {
    ok: true,
    value: buildListRunsScope(tenant.value, project.value, environment.value),
  };
}

function parseListRunsLimit(limitInput: string | undefined): RouteParseResult<number> {
  const limit = parseIntWithDefault(limitInput, LIST_RUNS_LIMIT.DEFAULT);
  if (limit === null) {
    return badRequestResult(HTTP_ERROR_REASON.invalidLimit, { target: 'limit' });
  }
  if (limit <= 0 || limit > LIST_RUNS_LIMIT.MAX) {
    return badRequestResult(HTTP_ERROR_REASON.limitOutOfRange, { target: 'limit' });
  }

  return { ok: true, value: limit };
}

function parseListRunsTenantId(tenantId: string | undefined): RouteParseResult<TenantId> {
  const tenant = parseRequiredTenantId(tenantId);
  if (tenant.kind === 'missing') {
    return forbiddenResult(HTTP_ERROR_REASON.missingTenantScope, { target: 'tenantId' });
  }
  if (tenant.kind === 'invalid') {
    return badRequestResult(HTTP_ERROR_REASON.invalidTenantId, { target: 'tenantId' });
  }

  return { ok: true, value: tenant.value };
}

function parseListRunsProjectId(projectId: string | undefined): RouteParseResult<ProjectId | undefined> {
  const project = parseOptionalProjectId(projectId);
  if (project.kind === 'invalid') {
    return badRequestResult(HTTP_ERROR_REASON.invalidProjectId, { target: 'projectId' });
  }

  return { ok: true, value: project.value };
}

function parseListRunsEnvironmentId(
  environmentId: string | undefined,
  projectId: ProjectId | undefined
): RouteParseResult<EnvironmentId | undefined> {
  const environment = parseOptionalEnvironmentId(environmentId);
  if (environment.kind === 'invalid') {
    return badRequestResult(HTTP_ERROR_REASON.invalidEnvironmentId, { target: 'environmentId' });
  }
  if (environment.value !== undefined && projectId === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.missingProjectId, { target: 'projectId' });
  }

  return { ok: true, value: environment.value };
}

function buildListRunsScope(
  tenantId: TenantId,
  projectId: ProjectId | undefined,
  environmentId: EnvironmentId | undefined
): ParsedListRunsScope {
  if (environmentId !== undefined) {
    if (projectId === undefined) {
      throw new Error('Project ID is required when environment scope is requested.');
    }

    return buildEnvironmentAccessScope(tenantId, projectId, environmentId);
  }
  if (projectId !== undefined) {
    return buildProjectAccessScope(tenantId, projectId);
  }

  return buildTenantAccessScope(tenantId);
}
