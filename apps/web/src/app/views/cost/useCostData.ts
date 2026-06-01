import { useMemo } from 'react';

import { useCostAttributionSummaryQuery } from '../../queries/costQueries';
import { useExecutionStore } from '../../stores/executionStore';
import { buildCostViewModel } from './costViewModel';

export function useCostData() {
  const currentRun = useExecutionStore((state) => state.currentRun);
  const attributionSummaryQuery = useCostAttributionSummaryQuery();

  const viewModel = useMemo(
    () => buildCostViewModel(attributionSummaryQuery.data ?? null),
    [attributionSummaryQuery.data]
  );

  return {
    currentRun,
    attributionSummaryQuery,
    isLoading: attributionSummaryQuery.isLoading,
    loadError: attributionSummaryQuery.error,
    viewModel,
  };
}
