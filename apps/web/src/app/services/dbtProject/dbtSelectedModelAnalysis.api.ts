/** Owned concern: adapt AnalyzeSelectedDbtModel to the browser query port. */
import {
  CanvasAuthoringAuthorityBindingSchema,
  DbtSelectedModelAnalysisSchema,
  DbtSelectedModelExecutionSqlSelectionSchema,
  ModelSqlIdentitySchema,
  type DbtSelectedModelAnalysis,
  type DbtSelectedModelExecutionSqlSelection,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import type {
  IDbtSelectedModelAnalysisQueryPort,
  DbtSelectedModelAnalysisTarget,
} from '../../ports/dbtSelectedModelAnalysis';
import { ApiError, type ApiClient } from '../api/createApiClient';
import {
  readGrantedWorkspaceScope,
  sameWorkspaceScopeIdentity,
} from '../session/workspaceScopeSelectionPort';

function assertSelectedAnalysisTarget(
  binding: DbtSelectedModelAnalysisTarget,
  selectedUniqueId: string
): void {
  ModelSqlIdentitySchema.parse(binding.canvasId);
  if (!selectedUniqueId.trim())
    throw new Error('AnalyzeSelectedDbtModel requires a selected model identity.');
  if (binding.authority != null) {
    const parsed = CanvasAuthoringAuthorityBindingSchema.parse(binding);
    if (parsed.authority.kind !== 'dbt-project-files')
      throw new Error('AnalyzeSelectedDbtModel requires dbt-project-files authority.');
  }
}

function appendSelectedSqlQuery(
  query: URLSearchParams,
  executionSql: DbtSelectedModelExecutionSqlSelection | undefined
): void {
  if (executionSql == null) return;
  const selection = DbtSelectedModelExecutionSqlSelectionSchema.parse(executionSql);
  query.set('includeExecutableSql', '1');
  if (selection.expectedProjectRevision != null)
    query.set('expectedProjectRevision', selection.expectedProjectRevision);
}

function selectedAnalysisRequest(
  binding: DbtSelectedModelAnalysisTarget,
  selectedUniqueId: string,
  executionSql?: DbtSelectedModelExecutionSqlSelection
) {
  assertSelectedAnalysisTarget(binding, selectedUniqueId);
  const scope = readGrantedWorkspaceScope();
  const query = new URLSearchParams({
    tenantId: scope.tenantId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
    canvasId: binding.canvasId,
    selectedUniqueId,
  });
  if (binding.authority != null) query.set('projectRoot', binding.authority.projectRoot);
  appendSelectedSqlQuery(query, executionSql);
  return { scope, endpoint: `/workspace/dbt/analysis/selected-model?${query}` };
}

function assertSelectedAnalysis(
  analysis: DbtSelectedModelAnalysis,
  binding: DbtSelectedModelAnalysisTarget,
  selectedUniqueId: string
): void {
  const authority = analysis.authorityBinding.authority;
  if (authority.kind !== 'dbt-project-files')
    throw new Error('AnalyzeSelectedDbtModel returned different authority or model.');
  const facts = [
    [analysis.authorityBinding.canvasId, binding.canvasId],
    [analysis.selectedUniqueId, selectedUniqueId],
  ];
  if (binding.authority != null) facts.push([authority.projectRoot, binding.authority.projectRoot]);
  if (facts.some(([actual, expected]) => actual !== expected))
    throw new Error(
      'AnalyzeSelectedDbtModel returned analysis for a different authority or model.'
    );
}

function assertSelectedSqlReceipt(
  analysis: DbtSelectedModelAnalysis,
  selection: DbtSelectedModelExecutionSqlSelection | undefined
): void {
  if (selection == null) return;
  const sql = analysis.executionSql;
  if (sql == null)
    throw new Error('AnalyzeSelectedDbtModel did not return requested executable SQL.');
  const facts = [[sql.sqlSha256, sha256HexUtf8(sql.sql)]];
  if (selection.expectedProjectRevision != null)
    facts.push([sql.projectRevisionSha256, selection.expectedProjectRevision]);
  if (facts.some(([actual, expected]) => actual !== expected))
    throw new Error('AnalyzeSelectedDbtModel returned a changed executable SQL observation.');
}

export function createApiDbtSelectedModelAnalysisQueryPort(
  apiClient: ApiClient
): IDbtSelectedModelAnalysisQueryPort {
  return {
    async analyzeSelectedModel(binding, selectedUniqueId, executionSql) {
      const { scope, endpoint } = selectedAnalysisRequest(binding, selectedUniqueId, executionSql);
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
      if (!sameWorkspaceScopeIdentity(scope, readGrantedWorkspaceScope()))
        throw new Error('AnalyzeSelectedDbtModel workspace changed.');
      assertSelectedAnalysis(analysis, binding, selectedUniqueId);
      assertSelectedSqlReceipt(analysis, executionSql);
      return analysis;
    },
  };
}
