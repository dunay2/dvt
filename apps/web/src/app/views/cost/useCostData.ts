import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryKeys } from '../../queries/queryKeys';
import { useRunsService, useWorkspaceService } from '../../services/AppServicesContext';
import { useExecutionStore } from '../../stores/executionStore';
import { buildCostViewModel } from './costViewModel';

export function useCostData() {
  const workspaceService = useWorkspaceService();
  const runsService = useRunsService();
  const currentRun = useExecutionStore((state) => state.currentRun);

  const graphSnapshotQuery = useQuery({
    queryKey: queryKeys.workspace.graphForView('cost-view'),
    queryFn: () => workspaceService.getGraphSnapshot(),
  });

  const runsQuery = useQuery({
    queryKey: queryKeys.runs.list('cost-view'),
    queryFn: () => runsService.listRunSummaries(),
  });

  const viewModel = useMemo(
    () =>
      buildCostViewModel(
        graphSnapshotQuery.data?.nodes ?? [],
        runsQuery.data ?? [],
        currentRun != null
      ),
    [currentRun, graphSnapshotQuery.data?.nodes, runsQuery.data]
  );

  return {
    currentRun,
    graphSnapshotQuery,
    runsQuery,
    isLoading: graphSnapshotQuery.isLoading || runsQuery.isLoading,
    loadError: graphSnapshotQuery.error ?? runsQuery.error,
    viewModel,
  };
}
