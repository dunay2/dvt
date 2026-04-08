import { useQuery } from '@tanstack/react-query';
import { useRunsService } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';

export function useRunsListForViewQuery(viewId: string) {
  const runsService = useRunsService();
  return useQuery({
    queryKey: queryKeys.runs.list(viewId),
    queryFn: () => runsService.listRunSummaries(),
  });
}

export function useScopedRunSummariesQuery(workspaceLayoutKey: string) {
  const runsService = useRunsService();
  return useQuery({
    queryKey: queryKeys.runs.summaries(workspaceLayoutKey),
    queryFn: () => runsService.listRunSummaries(),
  });
}
