import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { asStringOrUndefined } from './startRunRouteBodyValidation.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export type ParsedStartRunScope = {
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
};

export function parseStartRunScope(
  record: Record<string, unknown>
): RouteParseResult<ParsedStartRunScope> {
  const tenantIdRaw = asStringOrUndefined(record.tenantId);
  if (tenantIdRaw === undefined) {
    return badRequestResult('missing_tenant_id', { target: 'tenantId' });
  }
  const tenantId = TenantId.parse(tenantIdRaw);

  const projectIdRaw = asStringOrUndefined(record.projectId);
  if (projectIdRaw === undefined) {
    return badRequestResult('missing_project_id', { target: 'projectId' });
  }
  const projectId = ProjectId.parse(projectIdRaw);

  const environmentIdRaw = asStringOrUndefined(record.environmentId);
  if (environmentIdRaw === undefined) {
    return badRequestResult('missing_environment_id', { target: 'environmentId' });
  }
  const environmentId = EnvironmentId.parse(environmentIdRaw);

  if (!tenantId.ok) return badRequestResult('invalid_tenant_id', { target: 'tenantId' });
  if (!projectId.ok) return badRequestResult('invalid_project_id', { target: 'projectId' });
  if (!environmentId.ok) {
    return badRequestResult('invalid_environment_id', { target: 'environmentId' });
  }

  return {
    ok: true,
    value: {
      tenantId: tenantId.value,
      projectId: projectId.value,
      environmentId: environmentId.value,
    },
  };
}
