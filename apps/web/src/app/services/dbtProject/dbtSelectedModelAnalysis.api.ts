/** Owned concern: adapt AnalyzeSelectedDbtModel to the browser query port. */
import {
  CanvasAuthoringAuthorityBindingSchema,
  DbtSelectedModelAnalysisSchema,
} from '@dvt/contracts';

import type { IDbtSelectedModelAnalysisQueryPort } from '../../ports/dbtSelectedModelAnalysis';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { readGrantedWorkspaceScope } from '../session/workspaceScopeSelectionPort';

export function createApiDbtSelectedModelAnalysisQueryPort(
  apiClient: ApiClient
): IDbtSelectedModelAnalysisQueryPort {
  return {
    async analyzeSelectedModel(binding, selectedUniqueId) {
      if (!selectedUniqueId.trim()) {
        throw new Error('AnalyzeSelectedDbtModel requires a selected model identity.');
      }
      const parsedBinding = CanvasAuthoringAuthorityBindingSchema.parse(binding);
      if (parsedBinding.authority.kind !== 'dbt-project-files') {
        throw new Error('AnalyzeSelectedDbtModel requires dbt-project-files authority.');
      }
      const { tenantId, projectId, environmentId } = readGrantedWorkspaceScope();
      const query = new URLSearchParams({
        tenantId,
        projectId,
        environmentId,
        canvasId: parsedBinding.canvasId,
        selectedUniqueId,
        projectRoot: parsedBinding.authority.projectRoot,
      });
      const endpoint = `/workspace/dbt/analysis/selected-model?${query.toString()}`;
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

      const analysis = DbtSelectedModelAnalysisSchema.parse(payload);
      if (
        analysis.authorityBinding.authority.kind !== 'dbt-project-files' ||
        analysis.authorityBinding.canvasId !== parsedBinding.canvasId ||
        analysis.authorityBinding.authority.projectRoot !== parsedBinding.authority.projectRoot ||
        analysis.selectedUniqueId !== selectedUniqueId
      ) {
        throw new Error(
          'AnalyzeSelectedDbtModel returned analysis for a different authority or model.'
        );
      }
      return analysis;
    },
  };
}
