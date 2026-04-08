import { useQuery } from '@tanstack/react-query';
import { useWorkspaceService } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';

export function useWorkspaceDiffChangesQuery() {
  const workspaceService = useWorkspaceService();
  return useQuery({
    queryKey: queryKeys.workspace.diffChanges(),
    queryFn: () => workspaceService.getDiffChanges(),
  });
}

export function useWorkspaceGraphForViewQuery(viewId: string, staleTime?: number) {
  const workspaceService = useWorkspaceService();
  return useQuery({
    queryKey: queryKeys.workspace.graphForView(viewId),
    queryFn: () => workspaceService.getGraphSnapshot(),
    ...(typeof staleTime === 'number' ? { staleTime } : {}),
  });
}

export function useWorkspaceFileTreeQuery() {
  const workspaceService = useWorkspaceService();
  return useQuery({
    queryKey: queryKeys.workspace.fileTree(),
    queryFn: () => workspaceService.listFiles(),
  });
}

export function useWorkspaceFileContentQuery(path: string | undefined) {
  const workspaceService = useWorkspaceService();
  return useQuery({
    enabled: path != null,
    queryKey: queryKeys.workspace.fileContent(path ?? ''),
    queryFn: () => workspaceService.getFileContent(path ?? ''),
  });
}
