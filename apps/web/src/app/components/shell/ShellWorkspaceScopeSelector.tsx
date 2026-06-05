/** Owned concern: render granted workspace scopes and dispatch SelectWorkspaceScope. */
import { useSyncExternalStore } from 'react';

import {
  WORKSPACE_SCOPE_SELECTION_STATUS,
  type WorkspaceScopeIdentity,
} from '../../ports/workspaceScopeSelection';
import { useWorkspaceScopeSelection } from '../../services/AppServicesContext';
import { Button } from '../ui/button';
import { topAppBarClasses } from './chrome';

function formatWorkspaceScope(scope: WorkspaceScopeIdentity): string {
  return `${scope.tenantId} / ${scope.projectId} / ${scope.environmentId}`;
}

export function ShellWorkspaceScopeSelector() {
  const workspaceScopeSelection = useWorkspaceScopeSelection();
  const selection = useSyncExternalStore(
    workspaceScopeSelection.subscribeSelection,
    workspaceScopeSelection.getSelection,
    workspaceScopeSelection.getSelection
  );

  if (selection.availableScopes.length <= 1) {
    return null;
  }

  return (
    <div
      data-slot="shell-workspace-scope-selector"
      className="mt-3 grid gap-2 border-t border-(--border-default) pt-3"
    >
      <div className={topAppBarClasses.contextLabel}>Available workspaces</div>
      <div className="grid max-h-48 gap-1 overflow-auto">
        {selection.availableScopes.map((scope) => {
          const isSelected =
            scope.tenantId === selection.selectedScope.tenantId &&
            scope.projectId === selection.selectedScope.projectId &&
            scope.environmentId === selection.selectedScope.environmentId;
          return (
            <Button
              key={`${scope.tenantId}:${scope.projectId}:${scope.environmentId}`}
              type="button"
              variant={isSelected ? 'secondary' : 'ghost'}
              size="sm"
              className="h-auto justify-start whitespace-normal px-2 py-1.5 text-left text-xs"
              aria-pressed={isSelected}
              onClick={() => workspaceScopeSelection.selectWorkspaceScope(scope)}
            >
              {formatWorkspaceScope(scope)}
            </Button>
          );
        })}
      </div>
      {selection.status === WORKSPACE_SCOPE_SELECTION_STATUS.rejected && (
        <output
          data-slot="shell-workspace-scope-rejection"
          className="text-xs text-(--text-warning)"
        >
          Workspace is not available for this session.
        </output>
      )}
    </div>
  );
}
