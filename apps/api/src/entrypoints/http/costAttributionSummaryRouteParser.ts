/**
 * Owned concern: parse the protected cost attribution summary HTTP query into
 * canonical filters and an explicit tenant/project/environment access scope.
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

import {
  COST_ATTRIBUTION_SUMMARY_ACTION,
  COST_ATTRIBUTION_SUMMARY_LIMIT,
} from './costAttributionSummaryRouteParser.constants.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, forbiddenResult, type RouteParseResult } from './routeParseIssue.js';
import {
  parseIntWithDefault,
  parseOptionalEnvironmentId,
  parseOptionalProjectId,
  parseRequiredTenantId,
} from './routeParserPrimitives.js';

export interface ParsedCostAttributionSummaryRequest {
  readonly requestedScope: RequestedScope & {
    readonly action: typeof COST_ATTRIBUTION_SUMMARY_ACTION;
  };
  readonly query: {
    readonly limit: number;
  };
}

type ParsedCostAttributionSummaryResult = RouteParseResult<ParsedCostAttributionSummaryRequest>;
type ParsedCostAttributionSummaryScope =
  | TenantAccessScope
  | ProjectAccessScope
  | EnvironmentAccessScope;

export function parseCostAttributionSummaryRequest(input: {
  readonly tenantId: string | undefined;
  readonly projectId: string | undefined;
  readonly environmentId: string | undefined;
  readonly limit: string | undefined;
}): ParsedCostAttributionSummaryResult {
  const requestedScope = parseCostAttributionSummaryScope(input);
  if (!requestedScope.ok) return requestedScope;

  const limit = parseCostAttributionSummaryLimit(input.limit);
  if (!limit.ok) return limit;

  return {
    ok: true,
    value: {
      requestedScope: {
        ...requestedScope.value,
        action: COST_ATTRIBUTION_SUMMARY_ACTION,
      },
      query: { limit: limit.value },
    },
  };
}

function parseCostAttributionSummaryScope(input: {
  readonly tenantId: string | undefined;
  readonly projectId: string | undefined;
  readonly environmentId: string | undefined;
}): RouteParseResult<ParsedCostAttributionSummaryScope> {
  const tenant = parseCostAttributionSummaryTenantId(input.tenantId);
  if (!tenant.ok) return tenant;

  const project = parseCostAttributionSummaryProjectId(input.projectId);
  if (!project.ok) return project;

  const environment = parseCostAttributionSummaryEnvironmentId(input.environmentId, project.value);
  if (!environment.ok) return environment;

  return {
    ok: true,
    value: buildCostAttributionSummaryScope(tenant.value, project.value, environment.value),
  };
}

function parseCostAttributionSummaryLimit(
  limitInput: string | undefined
): RouteParseResult<number> {
  const limit = parseIntWithDefault(limitInput, COST_ATTRIBUTION_SUMMARY_LIMIT.DEFAULT);
  if (limit === null) {
    return badRequestResult(HTTP_ERROR_REASON.invalidLimit, { target: 'limit' });
  }
  if (limit <= 0 || limit > COST_ATTRIBUTION_SUMMARY_LIMIT.MAX) {
    return badRequestResult(HTTP_ERROR_REASON.limitOutOfRange, { target: 'limit' });
  }
  return { ok: true, value: limit };
}

function parseCostAttributionSummaryTenantId(
  tenantId: string | undefined
): RouteParseResult<TenantId> {
  const tenant = parseRequiredTenantId(tenantId);
  if (tenant.kind === 'missing') {
    return forbiddenResult(HTTP_ERROR_REASON.missingTenantScope, { target: 'tenantId' });
  }
  if (tenant.kind === 'invalid') {
    return badRequestResult(HTTP_ERROR_REASON.invalidTenantId, { target: 'tenantId' });
  }
  return { ok: true, value: tenant.value };
}

function parseCostAttributionSummaryProjectId(
  projectId: string | undefined
): RouteParseResult<ProjectId | undefined> {
  const project = parseOptionalProjectId(projectId);
  if (project.kind === 'invalid') {
    return badRequestResult(HTTP_ERROR_REASON.invalidProjectId, { target: 'projectId' });
  }
  return { ok: true, value: project.value };
}

function parseCostAttributionSummaryEnvironmentId(
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

function buildCostAttributionSummaryScope(
  tenantId: TenantId,
  projectId: ProjectId | undefined,
  environmentId: EnvironmentId | undefined
): ParsedCostAttributionSummaryScope {
  if (environmentId !== undefined) {
    if (projectId === undefined) {
      throw new Error('Project ID is required when environment scope is requested.');
    }
    return buildEnvironmentAccessScope(tenantId, projectId, environmentId);
  }
  if (projectId !== undefined) return buildProjectAccessScope(tenantId, projectId);
  return buildTenantAccessScope(tenantId);
}
