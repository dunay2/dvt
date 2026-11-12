/**
 * Owned concern: recover one accepted file revision through existing query and working-tree ports.
 * @baseline ADR-0060: persisted bytes and project analysis jointly determine authority.
 * @decision Keep reload/reconciliation currentness beside the session they can replace.
 * @consequence A late reload cannot overwrite another file's buffer.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';
import { useWorkspaceFileContentQuery } from '../../queries/workspaceQueries';
import { useWorkspaceFileContentCommandPort } from '../../services/AppServicesContext';
import type { CodeWorkingTreeReconciliationOutcome } from './codeWorkingTreeSyncModel';
import {
  resolveCodeWorkspaceFileEditPosture,
  type CodeWorkspaceFileAccess,
} from './codeWorkspaceFileEditPosture';
import { useCodeWorkingTreeSync } from './useCodeWorkingTreeSync';
import { reconcileWorkspaceFileAuthority } from './workspaceFileReconciliationAuthority';
import { useCodeWorkspaceFileContext } from './useCodeWorkspaceFileContext';

export type WorkspaceFileCodeAuthority = 'graph-draft' | 'dbt-project-files' | 'missing' | 'mixed';

export type WorkspaceFileSessionInput = Readonly<{
  access?: CodeWorkspaceFileAccess;
  authority: WorkspaceFileCodeAuthority;
  path: string | undefined;
  graphOwnedPaths?: ReadonlySet<string>;
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
  onPersistenceRecovered?: () => void | Promise<void>;
  dbtProject?: DbtProjectGraphProjection;
}>;

const EMPTY_GRAPH_OWNED_PATHS: ReadonlySet<string> = new Set();

export function useWorkspaceFileEditorSession({
  access = 'read-only',
  authority,
  path,
  graphOwnedPaths = EMPTY_GRAPH_OWNED_PATHS,
  reconcilePersistedFile,
  onPersistenceRecovered,
  dbtProject,
}: WorkspaceFileSessionInput) {
  const reloadRequestId = useRef(0);
  useEffect(() => {
    reloadRequestId.current += 1;
    return () => {
      reloadRequestId.current += 1;
    };
  }, [path]);
  const commandPort = useWorkspaceFileContentCommandPort();
  const fileQuery = useWorkspaceFileContentQuery(path);
  const refetch = fileQuery.refetch;
  const posture = resolveCodeWorkspaceFileEditPosture({
    access,
    authority,
    selectedPath: path,
    graphOwnedPaths,
  });
  const acceptedFile =
    fileQuery.isSuccess && !fileQuery.isFetching && fileQuery.data.path === path
      ? fileQuery.data
      : undefined;
  const context = useCodeWorkspaceFileContext({
    file: acceptedFile,
    project: dbtProject,
    allowed: authority !== 'mixed' && (path === undefined || !graphOwnedPaths.has(path)),
  });
  const reconcileProject = reconcilePersistedFile ?? context.reconcilePersistedFile;
  const reconcileAuthority = useCallback(
    async (receipt: WorkspaceFileSaveReceipt): Promise<CodeWorkingTreeReconciliationOutcome> => {
      if (reconcileProject == null) throw new Error('Project reconciliation is unavailable.');
      const projectOutcome = await reconcileProject(receipt);
      const authoritativeFile = await refetch();
      if (!authoritativeFile.isSuccess || authoritativeFile.data == null)
        return { kind: 'verification-unavailable' };
      return reconcileWorkspaceFileAuthority(receipt, authoritativeFile.data, projectOutcome);
    },
    [reconcileProject, refetch]
  );
  const workingTree = useCodeWorkingTreeSync({
    file: fileQuery.data,
    commandPort,
    reconcilePersistedFile: reconcileProject == null ? undefined : reconcileAuthority,
  });
  const retry = useCallback(async (): Promise<void> => {
    await workingTree.retry();
    await onPersistenceRecovered?.();
  }, [onPersistenceRecovered, workingTree.retry]);
  const reload = useCallback(() => {
    const requestId = ++reloadRequestId.current;
    void refetch().then((result) => {
      if (requestId === reloadRequestId.current && result.isSuccess && result.data?.path === path) {
        workingTree.loadAuthoritative(result.data);
      }
    });
  }, [path, refetch, workingTree.loadAuthoritative]);
  return { fileQuery, posture, acceptedFile, context, workingTree, retry, reload };
}
