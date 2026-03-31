import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asStringOrUndefined } from './startRunRouteBodyValidation.js';

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
    return badRequestResult(HTTP_ERROR_REASON.missingTenantId, { target: 'tenantId' });
  }
  const tenantId = TenantId.parse(tenantIdRaw);

  const projectIdRaw = asStringOrUndefined(record.projectId);
  if (projectIdRaw === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.missingProjectId, { target: 'projectId' });
  }
  const projectId = ProjectId.parse(projectIdRaw);

  const environmentIdRaw = asStringOrUndefined(record.environmentId);
  if (environmentIdRaw === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.missingEnvironmentId, { target: 'environmentId' });
  }
  const environmentId = EnvironmentId.parse(environmentIdRaw);

  if (!tenantId.ok)
    return badRequestResult(HTTP_ERROR_REASON.invalidTenantId, { target: 'tenantId' });
  if (!projectId.ok)
    return badRequestResult(HTTP_ERROR_REASON.invalidProjectId, { target: 'projectId' });
  if (!environmentId.ok) {
    return badRequestResult(HTTP_ERROR_REASON.invalidEnvironmentId, { target: 'environmentId' });
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
