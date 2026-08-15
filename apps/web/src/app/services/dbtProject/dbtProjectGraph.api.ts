/** Owned concern: adapt ProjectDbtGraphFromFiles to the browser query port. */
import {
  CanvasAuthoringAuthorityBindingSchema,
  DBT_PROJECT_GRAPH_PROJECTION_FEATURE,
  DbtProjectGraphProjectionSchema,
} from '@dvt/contracts';

import type {
  DbtProjectFilesAuthorityBinding,
  IDbtProjectGraphQueryPort,
} from '../../ports/dbtProjectGraph';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { readGrantedWorkspaceScope } from '../session/workspaceScopeSelectionPort';

const DBT_PROJECT_GRAPH_ENDPOINT = '/workspace/dbt/graph';

function assertProjectionMatchesAuthority(
  binding: DbtProjectFilesAuthorityBinding,
  projection: ReturnType<typeof DbtProjectGraphProjectionSchema.parse>
): void {
  const projectedAuthority = projection.authorityBinding.authority;
  if (
    projectedAuthority.kind !== 'dbt-project-files' ||
    projection.authorityBinding.canvasId !== binding.canvasId ||
    projectedAuthority.projectRoot !== binding.authority.projectRoot
  ) {
    throw new Error('ProjectDbtGraphFromFiles returned a projection for a different authority.');
  }
}

function buildDbtProjectGraphEndpoint(binding: DbtProjectFilesAuthorityBinding): string {
  const parsedBinding = CanvasAuthoringAuthorityBindingSchema.parse(binding);
  if (parsedBinding.authority.kind !== 'dbt-project-files') {
    throw new Error('ProjectDbtGraphFromFiles requires dbt-project-files authority.');
  }

  const { tenantId, projectId, environmentId } = readGrantedWorkspaceScope();
  const query = new URLSearchParams({
    tenantId,
    projectId,
    environmentId,
    canvasId: parsedBinding.canvasId,
    projectRoot: parsedBinding.authority.projectRoot,
    projectionFeature: DBT_PROJECT_GRAPH_PROJECTION_FEATURE.governedSourceIdentity,
  });
  return `${DBT_PROJECT_GRAPH_ENDPOINT}?${query.toString()}`;
}

export function createApiDbtProjectGraphQueryPort(apiClient: ApiClient): IDbtProjectGraphQueryPort {
  return {
    async getProjectGraph(authorityBinding) {
      const endpoint = buildDbtProjectGraphEndpoint(authorityBinding);
      const response = await apiClient.requestRaw(endpoint, { method: 'GET' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new ApiError({
          message: `Request to ${endpoint} failed (${response.status})`,
          endpoint,
          statusCode: response.status,
          category: response.status >= 500 ? 'server' : 'client',
          responseBody: payload,
        });
      }

      const projection = DbtProjectGraphProjectionSchema.parse(payload);
      assertProjectionMatchesAuthority(authorityBinding, projection);
      return projection;
    },
  };
}
