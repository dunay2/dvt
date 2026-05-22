/** Owned concern: bind workspace query hooks to their minimal service ports. */
import { useQuery } from '@tanstack/react-query';
import {
  useWorkspaceAdminReadPort,
  useWorkspaceDiffQueryPort,
  useWorkspaceFileHistoryQueryPort,
  useWorkspaceFilesQueryPort,
  useWorkspaceGraphSnapshotQueryPort,
} from '../services/AppServicesContext';
import type { FileContent, WorkspaceFileEntry } from '../ports/workspace';
import { queryKeys } from './queryKeys';

export type WorkspaceArtifactRecord = {
  file: FileContent;
  parsedContent: unknown;
};

export type WorkspaceArtifactMap = Partial<
  Record<'manifest.json' | 'run_results.json' | 'catalog.json', WorkspaceArtifactRecord>
>;

const WORKSPACE_ARTIFACT_FILE_NAMES = [
  'manifest.json',
  'run_results.json',
  'catalog.json',
] as const;

function flattenWorkspaceEntries(entries: WorkspaceFileEntry[]): WorkspaceFileEntry[] {
  return entries.flatMap((entry) => [
    entry,
    ...(entry.children ? flattenWorkspaceEntries(entry.children) : []),
  ]);
}

function parseStructuredContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

async function loadWorkspaceArtifacts(
  listFiles: () => Promise<WorkspaceFileEntry[]>,
  getFileContent: (path: string) => Promise<FileContent>
): Promise<WorkspaceArtifactMap> {
  const entries = flattenWorkspaceEntries(await listFiles());
  const records = await Promise.all(
    WORKSPACE_ARTIFACT_FILE_NAMES.map(async (fileName) => {
      const match = entries.find((entry) => entry.kind === 'file' && entry.name === fileName);
      if (!match) {
        return null;
      }

      const file = await getFileContent(match.path);
      return [fileName, { file, parsedContent: parseStructuredContent(file.content) }] as const;
    })
  );

  return Object.fromEntries(
    records.filter((record): record is NonNullable<typeof record> => record !== null)
  );
}

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

export function useWorkspaceFileHistoryQuery(path: string | undefined) {
  const workspaceFileHistoryQuery = useWorkspaceFileHistoryQueryPort();
  return useQuery({
    enabled: path != null,
    queryKey: queryKeys.workspace.fileHistory(path ?? ''),
    queryFn: () => workspaceFileHistoryQuery.getFileHistory(path ?? ''),
  });
}

export function useWorkspaceRolesQuery() {
  const workspaceAdminRead = useWorkspaceAdminReadPort();
  return useQuery({
    queryKey: queryKeys.workspace.roles(),
    queryFn: () => workspaceAdminRead.getRoles(),
  });
}

export function useWorkspaceAuditQuery() {
  const workspaceAdminRead = useWorkspaceAdminReadPort();
  return useQuery({
    queryKey: queryKeys.workspace.audit(),
    queryFn: () => workspaceAdminRead.getAuditLog(),
  });
}

export function useWorkspaceArtifactsQuery() {
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  return useQuery<WorkspaceArtifactMap>({
    queryKey: queryKeys.workspace.artifacts(),
    queryFn: () =>
      loadWorkspaceArtifacts(workspaceFilesQuery.listFiles, workspaceFilesQuery.getFileContent),
  });
}
