import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { asStringOrUndefined, type StartRunParseResult } from './startRunRouteBodyValidation.js';

export type ParsedStartRunScope = {
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
};

export function parseStartRunScope(
  record: Record<string, unknown>
): StartRunParseResult<ParsedStartRunScope, string> {
  const tenantId = TenantId.parse(asStringOrUndefined(record.tenantId));
  const projectId = ProjectId.parse(asStringOrUndefined(record.projectId));
  const environmentId = EnvironmentId.parse(asStringOrUndefined(record.environmentId));

  if (!tenantId.ok) return { ok: false, code: tenantId.code };
  if (!projectId.ok) return { ok: false, code: projectId.code };
  if (!environmentId.ok) return { ok: false, code: environmentId.code };

  return {
    ok: true,
    value: {
      tenantId: tenantId.value,
      projectId: projectId.value,
      environmentId: environmentId.value,
    },
  };
}
