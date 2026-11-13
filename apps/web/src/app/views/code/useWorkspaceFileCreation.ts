/**
 * Owned concern: publish one new scoped file through the existing conditional command port.
 * @decision Keep publication separate from query recovery and discard retired-scope replies.
 * @consequence Duplicate activation and refresh retries never submit an accepted write twice.
 */
import { useEffect, useReducer, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { queryKeys } from '../../queries/queryKeys';
import {
  useSessionContext,
  useWorkspaceFileContentCommandPort,
  useWorkspaceFilesQueryPort,
} from '../../services/AppServicesContext';
import { hasCodeWorkspaceFilePath } from './codeViewFileSelection';
import { resolveCodeFileCreationFailure } from './codeWorkbenchErrorModel';
import {
  MAX_FILE_CREATION_IMPORT_BYTES,
  resolveFileCreationPath,
  transitionFileCreation,
  type FileCreationDraft,
  type FileCreationState,
} from './workspaceFileCreationModel';

export type WorkspaceFileCreationController = Readonly<{
  state: FileCreationState;
  begin: (draft: FileCreationDraft) => void;
  edit: (field: keyof FileCreationDraft, value: string) => void;
  close: () => void;
  submit: () => Promise<void>;
  importFile: (file: File, folder: string) => Promise<void>;
}>;

export function useWorkspaceFileCreation(
  rootPath: string,
  scope: WorkspaceScope,
  onOpenFile: (path: string) => void
): WorkspaceFileCreationController {
  const [state, dispatch] = useReducer(transitionFileCreation, { kind: 'closed' });
  const command = useWorkspaceFileContentCommandPort();
  const files = useWorkspaceFilesQueryPort();
  const session = useSessionContext();
  const queryClient = useQueryClient();
  const mounted = useRef(true);
  const busy = useRef(false);
  const uploadId = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      uploadId.current++;
    };
  }, []);
  const current = () => mounted.current && session.getWorkspaceScopeSnapshot() === scope;
  const treeKey = queryKeys.workspace.fileTree(
    `${scope.tenantId}::${scope.projectId}::${scope.environmentId}`
  );

  async function refresh(path: string) {
    try {
      if (!current()) return;
      await queryClient.invalidateQueries({ queryKey: treeKey, refetchType: 'none' });
      if (!current()) return;
      const tree = await queryClient.fetchQuery({
        queryKey: treeKey,
        queryFn: () => files.listFiles(),
        staleTime: 0,
        retry: false,
      });
      if (!current()) return;
      if (!hasCodeWorkspaceFilePath(tree, path)) throw new Error('Published file not observed');
      // Other read models become stale; this command never fabricates a model or compilation.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.dbtProjectGraphRoot(),
        refetchType: 'none',
      });
      onOpenFile(path);
      dispatch({ type: 'observed' });
    } catch {
      if (current()) dispatch({ type: 'refreshFailed' });
    }
  }

  async function submit() {
    if (busy.current || !current()) return;
    if (state.kind === 'published') {
      busy.current = true;
      dispatch({ type: 'refresh' });
      try {
        await refresh(state.path);
      } finally {
        busy.current = false;
      }
      return;
    }
    if (state.kind !== 'editing') return;
    if (state.error === 'invalidText' || state.error === 'importTooLarge') return;
    const path = resolveFileCreationPath(rootPath, state.draft.path);
    if (!path) {
      dispatch({ type: 'reject', error: 'invalidPath' });
      return;
    }
    busy.current = true;
    dispatch({ type: 'save' });
    try {
      const receipt = await command.saveFileContent({
        path,
        content: state.draft.content,
        expectedRevision: { kind: 'absent' },
      });
      if (!current()) return;
      if (receipt.path !== path) {
        dispatch({ type: 'unconfirmed' });
        return;
      }
      dispatch({ type: 'publish', path: receipt.path });
      await refresh(receipt.path);
    } catch (error) {
      if (current()) dispatch({ type: 'reject', error: resolveCodeFileCreationFailure(error) });
    } finally {
      busy.current = false;
    }
  }

  async function importFile(file: File, folder: string) {
    if (!current() || state.kind !== 'closed') return;
    const request = ++uploadId.current;
    dispatch({ type: 'read', draft: { path: folder + file.name, content: '' } });
    if (file.size > MAX_FILE_CREATION_IMPORT_BYTES) {
      dispatch({ type: 'reject', error: 'importTooLarge' });
      return;
    }
    try {
      const content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
        await file.arrayBuffer()
      );
      if (current() && request === uploadId.current) dispatch({ type: 'decoded', content });
    } catch {
      if (current() && request === uploadId.current)
        dispatch({ type: 'reject', error: 'invalidText' });
    }
  }
  return {
    state,
    submit,
    importFile,
    begin: (draft) => {
      if (current()) dispatch({ type: 'begin', draft });
    },
    edit: (field, value) => dispatch({ type: 'edit', field, value }),
    close: () => {
      uploadId.current++;
      dispatch({ type: 'close' });
    },
  };
}
