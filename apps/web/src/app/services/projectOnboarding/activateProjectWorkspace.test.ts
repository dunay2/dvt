import { describe, expect, it, vi } from 'vitest';

import {
  WORKSPACE_SCOPE_SELECTION_REJECTION_REASON,
  WORKSPACE_SCOPE_SELECTION_STATUS,
  type WorkspaceScopeIdentity,
  type WorkspaceScopeSelectionPort,
} from '../../ports/workspaceScopeSelection';
import { activateProjectWorkspace } from './activateProjectWorkspace';

const CREATED_WORKSPACE: WorkspaceScopeIdentity = {
  tenantId: 'tenant-1',
  projectId: 'orders',
  projectName: 'Orders',
  environmentId: 'dev',
};

function buildSelectionPort(
  selectWorkspaceScope: WorkspaceScopeSelectionPort['selectWorkspaceScope']
): WorkspaceScopeSelectionPort {
  return {
    getSelection: vi.fn(),
    selectWorkspaceScope,
    subscribeSelection: vi.fn(),
  };
}

describe('activateProjectWorkspace', () => {
  it('refreshes server-granted context before selecting the created workspace', async () => {
    const calls: string[] = [];
    const resolveSessionContext = vi.fn(async () => {
      calls.push('refresh');
    });
    const selectWorkspaceScope = vi.fn((workspace: WorkspaceScopeIdentity) => {
      calls.push('select');
      return {
        status: WORKSPACE_SCOPE_SELECTION_STATUS.selected,
        selectedScope: workspace,
      } as const;
    });

    await activateProjectWorkspace(CREATED_WORKSPACE, {
      apiClient: { getJson: vi.fn() },
      resolveSessionContext,
      workspaceScopeSelection: buildSelectionPort(selectWorkspaceScope),
    });

    expect(calls).toEqual(['refresh', 'select']);
    expect(selectWorkspaceScope).toHaveBeenCalledWith(CREATED_WORKSPACE);
  });

  it('does not select optimistic local state when the authoritative refresh fails', async () => {
    const selectWorkspaceScope = vi.fn();

    await expect(
      activateProjectWorkspace(CREATED_WORKSPACE, {
        apiClient: { getJson: vi.fn() },
        resolveSessionContext: vi.fn().mockRejectedValue(new Error('runtime unavailable')),
        workspaceScopeSelection: buildSelectionPort(selectWorkspaceScope),
      })
    ).rejects.toThrow('runtime unavailable');

    expect(selectWorkspaceScope).not.toHaveBeenCalled();
  });

  it('fails closed when the refreshed catalog does not grant the created workspace', async () => {
    const selectWorkspaceScope = vi.fn(
      () =>
        ({
          status: WORKSPACE_SCOPE_SELECTION_STATUS.rejected,
          reason: WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unavailable,
          requestedScope: CREATED_WORKSPACE,
          selectedScope: {
            tenantId: 'tenant-1',
            projectId: 'current',
            projectName: 'Current',
            environmentId: 'dev',
          },
        }) as const
    );

    await expect(
      activateProjectWorkspace(CREATED_WORKSPACE, {
        apiClient: { getJson: vi.fn() },
        resolveSessionContext: vi.fn().mockResolvedValue(undefined),
        workspaceScopeSelection: buildSelectionPort(selectWorkspaceScope),
      })
    ).rejects.toThrow('workspace_scope_unavailable');
  });
});
