/** Owned concern: render granted workspace scopes and dispatch SelectWorkspaceScope. */
import { useSyncExternalStore } from 'react';

import {
  WORKSPACE_SCOPE_SELECTION_STATUS,
  type WorkspaceScopeIdentity,
} from '../../ports/workspaceScopeSelection';
import { useWorkspaceScopeSelection } from '../../services/AppServicesContext';
import { Button } from '../ui/button';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';

function formatWorkspaceScope(scope: WorkspaceScopeIdentity): string {
  return `${scope.tenantId} / ${scope.projectId} / ${scope.environmentId}`;
}

export function ShellWorkspaceScopeSelector({
  copy,
  onScopeSelected,
}: Readonly<{
  copy: Pick<
    ShellTopBarCopy,
    'availableProjects' | 'currentProject' | 'noAlternativeProjects' | 'projectUnavailable'
  >;
  onScopeSelected?: () => void;
}>) {
  const workspaceScopeSelection = useWorkspaceScopeSelection();
  const selection = useSyncExternalStore(
    workspaceScopeSelection.subscribeSelection,
    workspaceScopeSelection.getSelection,
    workspaceScopeSelection.getSelection
  );

  const availableScopes =
    selection.availableScopes.length === 0 ? [selection.selectedScope] : selection.availableScopes;
  const hasAlternativeProject = availableScopes.some(
    (scope) =>
      scope.tenantId !== selection.selectedScope.tenantId ||
      scope.projectId !== selection.selectedScope.projectId ||
      scope.environmentId !== selection.selectedScope.environmentId
  );

  return (
    <div
      data-slot="shell-workspace-scope-selector"
      className="mt-3 grid gap-2 border-t border-(--border-default) pt-3"
    >
      <div className={topAppBarClasses.contextLabel}>{copy.availableProjects}</div>
      <div className="grid max-h-48 gap-1 overflow-auto">
        {availableScopes.map((scope) => {
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
              aria-label={`${isSelected ? copy.currentProject : copy.availableProjects}: ${formatWorkspaceScope(scope)}`}
              onClick={() => {
                const result = workspaceScopeSelection.selectWorkspaceScope(scope);
                if (result.status === WORKSPACE_SCOPE_SELECTION_STATUS.selected) {
                  onScopeSelected?.();
                }
              }}
            >
              {formatWorkspaceScope(scope)}
            </Button>
          );
        })}
      </div>
      {!hasAlternativeProject && (
        <p data-slot="shell-workspace-no-alternative" className="text-xs text-(--text-subtle)">
          {copy.noAlternativeProjects}
        </p>
      )}
      {selection.status === WORKSPACE_SCOPE_SELECTION_STATUS.rejected && (
        <output
          data-slot="shell-workspace-scope-rejection"
          className="text-xs text-(--text-warning)"
        >
          {copy.projectUnavailable}
        </output>
      )}
    </div>
  );
}
