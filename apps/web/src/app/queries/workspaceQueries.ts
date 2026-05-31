/** Owned concern: bind workspace query hooks to their minimal service ports. */
import { useQuery } from '@tanstack/react-query';
import {
  useWorkspaceAdminReadPort,
  useWorkspaceDiffQueryPort,
  useWorkspaceFileHistoryQueryPort,
  useWorkspaceFilesQueryPort,
  useWorkspaceGraphSnapshotQueryPort,
  useWorkspacePluginCatalogQueryPort,
} from '../services/AppServicesContext';
import type { FileContent, WorkspaceFileEntry } from '../ports/workspace';
import { classifyWorkspaceArtifact, type WorkspaceArtifactKind } from './workspaceArtifactPolicy';
import { queryKeys } from './queryKeys';

export type WorkspaceArtifactRecord = {
  file: FileContent;
  parsedContent: unknown;
  key: string;
  label: string;
  language: string;
  kind: WorkspaceArtifactKind;
};

export type WorkspaceArtifactMap = Record<string, WorkspaceArtifactRecord>;

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
  const classifiedEntries = entries.flatMap((entry) => {
    const classification = classifyWorkspaceArtifact(entry);
    return classification ? [{ entry, classification }] : [];
  });
  const records = await Promise.all(
    classifiedEntries.map(async ({ entry, classification }) => {
      const file = await getFileContent(entry.path);
      const parsedContent =
        classification.language === 'json' ? parseStructuredContent(file.content) : file.content;
      return [
        classification.key,
        {
          file,
          parsedContent,
          key: classification.key,
          label: classification.label,
          language: classification.language,
          kind: classification.kind,
        },
      ] as const;
    })
  );

  return Object.fromEntries(records);
}

export function useWorkspaceDiffChangesQuery() {
  const workspaceDiffQuery = useWorkspaceDiffQueryPort();
  return useQuery({
    queryKey: queryKeys.workspace.diffChanges(),
    queryFn: () => workspaceDiffQuery.getDiffChanges(),
  });
}

export function useWorkspacePluginCatalogQuery() {
  const workspacePluginCatalogQuery = useWorkspacePluginCatalogQueryPort();
  return useQuery({
    queryKey: queryKeys.workspace.plugins(),
    queryFn: () => workspacePluginCatalogQuery.getPlugins(),
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
