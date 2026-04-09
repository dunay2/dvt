import { useMemo } from 'react';

import { useRunsListForViewQuery } from '../../queries/runsQueries';
import { useWorkspaceGraphForViewQuery } from '../../queries/workspaceQueries';
import { useExecutionStore } from '../../stores/executionStore';
import { buildCostViewModel } from './costViewModel';

export function useCostData() {
  const currentRun = useExecutionStore((state) => state.currentRun);

  const graphSnapshotQuery = useWorkspaceGraphForViewQuery('cost-view');
  const runsQuery = useRunsListForViewQuery('cost-view');

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
