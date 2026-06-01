/** Owned concern: adapt the protected runtime cost attribution query rail to the web cost port. */
import type {
  CostAttributionSummary,
  CostAttributionSummaryQuery,
  ICostAttributionSummaryPort,
} from '../../ports/cost';
import type { ApiClient } from '../api/createApiClient';
import { decodeCostAttributionSummary } from './costApiDecoders';

function appendStringParam(params: URLSearchParams, key: string, value: string | undefined): void {
  const normalized = value?.trim();
  if (normalized && normalized.length > 0) {
    params.set(key, normalized);
  }
}

function buildCostAttributionSummaryEndpoint(query: CostAttributionSummaryQuery): string {
  const params = new URLSearchParams();
  appendStringParam(params, 'tenantId', query.tenantId);
  appendStringParam(params, 'projectId', query.projectId);
  appendStringParam(params, 'environmentId', query.environmentId);
  if (typeof query.limit === 'number') {
    params.set('limit', String(query.limit));
  }

  const queryString = params.toString();
  return queryString.length > 0
    ? `/cost/attribution-summary?${queryString}`
    : '/cost/attribution-summary';
}

export function createApiCostAttributionSummaryPort(
  apiClient: ApiClient
): ICostAttributionSummaryPort {
  return {
    async getCostAttributionSummary(
      query: CostAttributionSummaryQuery
    ): Promise<CostAttributionSummary> {
      const payload = await apiClient.getJson<unknown>(buildCostAttributionSummaryEndpoint(query));
      return decodeCostAttributionSummary(payload);
    },
  };
}
