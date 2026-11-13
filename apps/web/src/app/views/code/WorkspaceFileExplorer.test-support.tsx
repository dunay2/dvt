/** Owned concern: mount the real explorer with bounded file-command/query doubles. */
import { vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { createMockSessionContextPort } from '../../../testing/runsPortDoubles';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { IWorkspaceFileContentCommandPort, WorkspaceFileEntry } from '../../ports/workspace';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { WorkspaceFileExplorer } from './WorkspaceFileExplorer';

export function createFileExplorerHarness() {
  const save = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>();
  const list = vi.fn<() => Promise<WorkspaceFileEntry[]>>();
  const open = vi.fn<(path: string) => void>();
  const session = createMockSessionContextPort();
  let scope = session.getWorkspaceScopeSnapshot();
  const initialScope = scope;
  const listeners = new Set<() => void>();
  const tree: WorkspaceFileEntry[] = [{ path: 'demo/models', name: 'models', kind: 'directory' }];
  const receipt = {
    kind: 'saved' as const,
    disposition: 'created' as const,
    path: 'demo/models/new.sql',
    contentSha256: 'a'.repeat(64),
    lastModified: '2026-11-11T12:00:00Z',
  };
  save.mockResolvedValue(receipt);
  list.mockResolvedValue([{ path: receipt.path, name: 'new.sql', kind: 'file' }]);
  const overrides = {
    ...createAppServicesTestOverrides(),
    sessionContext: {
      ...session,
      getWorkspaceScope: () => scope,
      getWorkspaceScopeSnapshot: () => scope,
      subscribeWorkspaceScope: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    workspaceFileContentCommand: { saveFileContent: save },
    workspaceFilesQuery: { listFiles: list, getFileContent: vi.fn() },
  };
  const view = (rootPath = 'demo') => (
    <AppServicesProvider overrides={overrides}>
      <WorkspaceFileExplorer title="Explorer" tree={tree} rootPath={rootPath} onOpenFile={open} />
    </AppServicesProvider>
  );
  return {
    save,
    list,
    open,
    receipt,
    initialScope,
    view,
    changeScope(patch: Partial<WorkspaceScope> = { projectId: 'another' }) {
      scope = { ...scope, ...patch };
      listeners.forEach((listener) => listener());
    },
    mount: (rootPath = 'demo') => withTestQueryClient(view(rootPath)),
  };
}
