/** Owned concern: bind workspace query hooks to their minimal service ports. */
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import {
  useWorkspaceAdminReadPort,
  useWorkspaceDiffQueryPort,
  useWorkspaceFileHistoryQueryPort,
  useWorkspaceFilesQueryPort,
  useWorkspaceGraphSnapshotQueryPort,
  useWorkspacePluginCatalogQueryPort,
  useSessionContext,
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

function useWorkspaceLayoutKey(): string {
  const sessionContext = useSessionContext();
  const { tenantId, projectId, environmentId } = useSyncExternalStore(
    sessionContext.subscribeWorkspaceScope,
    sessionContext.getWorkspaceScopeSnapshot,
    sessionContext.getWorkspaceScopeSnapshot
  );
  return `${tenantId}::${projectId}::${environmentId}`;
}

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
  const workspaceLayoutKey = useWorkspaceLayoutKey();
  return useQuery({
    queryKey: queryKeys.workspace.diffChanges(workspaceLayoutKey),
    queryFn: () => workspaceDiffQuery.getDiffChanges(),
  });
}

export function useWorkspacePluginCatalogQuery() {
  const workspacePluginCatalogQuery = useWorkspacePluginCatalogQueryPort();
  const workspaceLayoutKey = useWorkspaceLayoutKey();
  return useQuery({
    queryKey: queryKeys.workspace.plugins(workspaceLayoutKey),
    queryFn: () => workspacePluginCatalogQuery.getPlugins(),
  });
}

export function useWorkspaceGraphForViewQuery(
  viewId: string,
  staleTime?: number,
  options: Readonly<{ enabled?: boolean }> = {}
) {
  const workspaceGraphSnapshotQuery = useWorkspaceGraphSnapshotQueryPort();
  const workspaceLayoutKey = useWorkspaceLayoutKey();
  return useQuery({
    queryKey: queryKeys.workspace.graphForView(workspaceLayoutKey, viewId),
    queryFn: () => workspaceGraphSnapshotQuery.getGraphSnapshot(),
    enabled: options.enabled ?? true,
    ...(typeof staleTime === 'number' ? { staleTime } : {}),
  });
}

export function useWorkspaceFileTreeQuery() {
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  const workspaceLayoutKey = useWorkspaceLayoutKey();
  return useQuery({
    queryKey: queryKeys.workspace.fileTree(workspaceLayoutKey),
    queryFn: () => workspaceFilesQuery.listFiles(),
  });
}

export function useWorkspaceFileContentQuery(path: string | undefined) {
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  const workspaceLayoutKey = useWorkspaceLayoutKey();
  return useQuery({
    enabled: path != null,
    queryKey: queryKeys.workspace.fileContent(workspaceLayoutKey, path ?? ''),
    queryFn: () => workspaceFilesQuery.getFileContent(path ?? ''),
  });
}

export function useWorkspaceFileHistoryQuery(path: string | undefined) {
  const workspaceFileHistoryQuery = useWorkspaceFileHistoryQueryPort();
  const workspaceLayoutKey = useWorkspaceLayoutKey();
  return useQuery({
    enabled: path != null,
    queryKey: queryKeys.workspace.fileHistory(workspaceLayoutKey, path ?? ''),
    queryFn: () => workspaceFileHistoryQuery.getFileHistory(path ?? ''),
  });
}

export function useWorkspaceRolesQuery() {
  const workspaceAdminRead = useWorkspaceAdminReadPort();
  const workspaceLayoutKey = useWorkspaceLayoutKey();
  return useQuery({
    queryKey: queryKeys.workspace.roles(workspaceLayoutKey),
    queryFn: () => workspaceAdminRead.getRoles(),
  });
}

export function useWorkspaceAuditQuery() {
  const workspaceAdminRead = useWorkspaceAdminReadPort();
  const workspaceLayoutKey = useWorkspaceLayoutKey();
  return useQuery({
    queryKey: queryKeys.workspace.audit(workspaceLayoutKey),
    queryFn: () => workspaceAdminRead.getAuditLog(),
  });
}

export function useWorkspaceArtifactsQuery() {
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  const workspaceLayoutKey = useWorkspaceLayoutKey();
  return useQuery<WorkspaceArtifactMap>({
    queryKey: queryKeys.workspace.artifacts(workspaceLayoutKey),
    queryFn: () =>
      loadWorkspaceArtifacts(workspaceFilesQuery.listFiles, workspaceFilesQuery.getFileContent),
  });
}
