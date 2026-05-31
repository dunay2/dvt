/** Owned concern: bind the Cost route to the protected runtime cost attribution query rail. */
import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useCostAttributionSummaryPort, useSessionContext } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';

export const COST_ATTRIBUTION_SUMMARY_LIMIT = 50;

export function useCostAttributionSummaryQuery(limit = COST_ATTRIBUTION_SUMMARY_LIMIT) {
  const costAttributionSummaryPort = useCostAttributionSummaryPort();
  const sessionContext = useSessionContext();
  const { tenantId, projectId, environmentId } = useSyncExternalStore(
    sessionContext.subscribeWorkspaceScope,
    sessionContext.getWorkspaceScopeSnapshot,
    sessionContext.getWorkspaceScopeSnapshot
  );

  return useQuery({
    queryKey: queryKeys.cost.attributionSummary(tenantId, projectId, environmentId, limit),
    queryFn: () =>
      costAttributionSummaryPort.getCostAttributionSummary({
        tenantId,
        projectId,
        environmentId,
        limit,
      }),
    staleTime: 30_000,
  });
}
