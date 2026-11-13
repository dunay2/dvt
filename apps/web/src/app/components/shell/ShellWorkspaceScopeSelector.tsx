/** Owned concern: render granted workspace scopes and dispatch SelectWorkspaceScope. */
import { useSyncExternalStore } from 'react';

import {
  WORKSPACE_SCOPE_SELECTION_STATUS,
  type WorkspaceScopeIdentity,
} from '../../ports/workspaceScopeSelection';
import { useWorkspaceScopeSelection } from '../../services/AppServicesContext';
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '../ui/dropdown-menu';
import { topAppBarClasses } from './chrome';
import styles from './ShellWorkspaceContext.module.css';
import type { ShellTopBarCopy } from './copy';

function formatWorkspaceScope(scope: WorkspaceScopeIdentity): string {
  return `${scope.projectName ?? scope.projectId} / ${scope.environmentId}`;
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
    <div data-slot="shell-workspace-scope-selector" className={styles.scopeSelector}>
      <div className={topAppBarClasses.contextLabel}>{copy.availableProjects}</div>
      <DropdownMenuRadioGroup
        className={styles.scopeOptions}
        value={JSON.stringify([
          selection.selectedScope.tenantId,
          selection.selectedScope.projectId,
          selection.selectedScope.environmentId,
        ])}
      >
        {availableScopes.map((scope) => {
          const key = JSON.stringify([scope.tenantId, scope.projectId, scope.environmentId]);
          const isSelected =
            scope.tenantId === selection.selectedScope.tenantId &&
            scope.projectId === selection.selectedScope.projectId &&
            scope.environmentId === selection.selectedScope.environmentId;
          return (
            <DropdownMenuRadioItem
              key={key}
              value={key}
              className={styles.scopeOption}
              aria-label={`${isSelected ? copy.currentProject : copy.availableProjects}: ${formatWorkspaceScope(scope)}`}
              onSelect={(event) => {
                const result = workspaceScopeSelection.selectWorkspaceScope(scope);
                if (result.status === WORKSPACE_SCOPE_SELECTION_STATUS.selected)
                  onScopeSelected?.();
                else event.preventDefault();
              }}
            >
              {formatWorkspaceScope(scope)}
            </DropdownMenuRadioItem>
          );
        })}
      </DropdownMenuRadioGroup>
      {!hasAlternativeProject && (
        <p data-slot="shell-workspace-no-alternative" className={styles.scopeHint}>
          {copy.noAlternativeProjects}
        </p>
      )}
      {selection.status === WORKSPACE_SCOPE_SELECTION_STATUS.rejected && (
        <output data-slot="shell-workspace-scope-rejection" className={styles.scopeWarning}>
          {copy.projectUnavailable}
        </output>
      )}
    </div>
  );
}
