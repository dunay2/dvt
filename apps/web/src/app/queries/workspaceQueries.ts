/** Owned concern: bind workspace query hooks to their minimal service ports. */
import { useQuery } from '@tanstack/react-query';
import {
  useWorkspaceDiffQueryPort,
  useWorkspaceFilesQueryPort,
  useWorkspaceGraphSnapshotQueryPort,
} from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';

export function useWorkspaceDiffChangesQuery() {
  const workspaceDiffQuery = useWorkspaceDiffQueryPort();
  return useQuery({
    queryKey: queryKeys.workspace.diffChanges(),
    queryFn: () => workspaceDiffQuery.getDiffChanges(),
  });
}

export function useWorkspaceGraphForViewQuery(viewId: string, staleTime?: number) {
  const workspaceGraphSnapshotQuery = useWorkspaceGraphSnapshotQueryPort();
  return useQuery({
    queryKey: queryKeys.workspace.graphForView(viewId),
    queryFn: () => workspaceGraphSnapshotQuery.getGraphSnapshot(),
    ...(typeof staleTime === 'number' ? { staleTime } : {}),
  });
}

export function useWorkspaceFileTreeQuery() {
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  return useQuery({
    queryKey: queryKeys.workspace.fileTree(),
    queryFn: () => workspaceFilesQuery.listFiles(),
  });
}

export function useWorkspaceFileContentQuery(path: string | undefined) {
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  return useQuery({
    enabled: path != null,
    queryKey: queryKeys.workspace.fileContent(path ?? ''),
    queryFn: () => workspaceFilesQuery.getFileContent(path ?? ''),
  });
}
