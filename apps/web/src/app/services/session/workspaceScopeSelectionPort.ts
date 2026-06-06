/** Owned concern: implement SelectWorkspaceScope over server-granted workspace contexts. */
import type { WorkspaceScope } from '../../ports/sessionContext';
import {
  WORKSPACE_SCOPE_SELECTION_REJECTION_REASON,
  WORKSPACE_SCOPE_SELECTION_STATUS,
  type SelectWorkspaceScopeResult,
  type WorkspaceScopeIdentity,
  type WorkspaceScopeSelectionPort,
  type WorkspaceScopeSelectionState,
} from '../../ports/workspaceScopeSelection';
import { useSessionStore, type SessionState } from '../../stores/sessionStore';

export class WorkspaceScopeSelectionError extends Error {
  constructor(
    readonly reason:
      | typeof WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unavailable
      | typeof WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unresolved,
    readonly requestedScope: WorkspaceScopeIdentity,
    readonly selectedScope: WorkspaceScopeIdentity
  ) {
    super(`Workspace scope selection rejected: ${reason}.`);
    this.name = 'WorkspaceScopeSelectionError';
  }
}

export function sameWorkspaceScopeIdentity(
  left: WorkspaceScopeIdentity,
  right: WorkspaceScopeIdentity
): boolean {
  return (
    left.tenantId === right.tenantId &&
    left.projectId === right.projectId &&
    left.environmentId === right.environmentId
  );
}

function readSelectedScope(state: Pick<SessionState, 'tenantId' | 'projectId' | 'environmentId'>) {
  return {
    tenantId: state.tenantId,
    projectId: state.projectId,
    environmentId: state.environmentId,
  };
}

function normalizeAvailableWorkspaces(
  effectiveWorkspace: WorkspaceScopeIdentity,
  availableWorkspaces: readonly WorkspaceScopeIdentity[]
): readonly WorkspaceScopeIdentity[] {
  const normalized = [...availableWorkspaces];
  if (
    !normalized.some((availableWorkspace) =>
      sameWorkspaceScopeIdentity(availableWorkspace, effectiveWorkspace)
    )
  ) {
    normalized.unshift(effectiveWorkspace);
  }
  return normalized;
}

function findGrantedWorkspaceScope(
  requestedScope: WorkspaceScopeIdentity,
  availableWorkspaces: readonly WorkspaceScopeIdentity[]
): WorkspaceScopeIdentity | null {
  return (
    availableWorkspaces.find((availableWorkspace) =>
      sameWorkspaceScopeIdentity(availableWorkspace, requestedScope)
    ) ?? null
  );
}

export function resolveSelectedWorkspaceScope(params: {
  currentScope: WorkspaceScopeIdentity;
  effectiveWorkspace: WorkspaceScopeIdentity;
  availableWorkspaces: readonly WorkspaceScopeIdentity[];
}): {
  readonly selectedScope: WorkspaceScopeIdentity;
  readonly availableWorkspaces: readonly WorkspaceScopeIdentity[];
} {
  const availableWorkspaces = normalizeAvailableWorkspaces(
    params.effectiveWorkspace,
    params.availableWorkspaces
  );
  return {
    selectedScope:
      findGrantedWorkspaceScope(params.currentScope, availableWorkspaces) ??
      params.effectiveWorkspace,
    availableWorkspaces,
  };
}

export function readWorkspaceScopeSelection(
  state: SessionState = useSessionStore.getState()
): WorkspaceScopeSelectionState {
  return {
    selectedScope: readSelectedScope(state),
    availableScopes: state.availableWorkspaces,
    status: state.workspaceScopeSelectionStatus,
    rejectionReason: state.workspaceScopeSelectionRejectionReason,
    rejectedScope: state.rejectedWorkspaceScope,
  };
}

export function readGrantedWorkspaceScope(): WorkspaceScope {
  const state = useSessionStore.getState();
  const selectedScope = readSelectedScope(state);
  if (state.availableWorkspaces.length === 0) {
    throw new WorkspaceScopeSelectionError(
      WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unresolved,
      selectedScope,
      selectedScope
    );
  }

  const grantedScope = findGrantedWorkspaceScope(selectedScope, state.availableWorkspaces);
  if (!grantedScope) {
    throw new WorkspaceScopeSelectionError(
      WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unavailable,
      selectedScope,
      selectedScope
    );
  }

  return {
    ...grantedScope,
    targetAdapter: state.targetAdapter,
  };
}

function selectWorkspaceScope(requestedScope: WorkspaceScopeIdentity): SelectWorkspaceScopeResult {
  const state = useSessionStore.getState();
  const selectedScope = readSelectedScope(state);
  if (state.availableWorkspaces.length === 0) {
    state.recordRejectedWorkspaceScopeSelection(
      requestedScope,
      WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unresolved
    );
    return {
      status: WORKSPACE_SCOPE_SELECTION_STATUS.rejected,
      reason: WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unresolved,
      requestedScope,
      selectedScope,
    };
  }

  const grantedScope = findGrantedWorkspaceScope(requestedScope, state.availableWorkspaces);
  if (!grantedScope) {
    state.recordRejectedWorkspaceScopeSelection(
      requestedScope,
      WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unavailable
    );
    return {
      status: WORKSPACE_SCOPE_SELECTION_STATUS.rejected,
      reason: WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unavailable,
      requestedScope,
      selectedScope,
    };
  }

  state.setWorkspaceScopeSelectionContext({
    selectedScope: grantedScope,
    availableWorkspaces: state.availableWorkspaces,
  });
  return {
    status: WORKSPACE_SCOPE_SELECTION_STATUS.selected,
    selectedScope: grantedScope,
  };
}

export function createWorkspaceScopeSelectionPort(): WorkspaceScopeSelectionPort {
  return {
    getSelection: () => readWorkspaceScopeSelection(),
    selectWorkspaceScope,
    subscribeSelection: (onStoreChange) => {
      let previousSelection = readWorkspaceScopeSelection();

      return useSessionStore.subscribe((state) => {
        const nextSelection = readWorkspaceScopeSelection(state);
        if (
          sameWorkspaceScopeIdentity(
            previousSelection.selectedScope,
            nextSelection.selectedScope
          ) &&
          previousSelection.status === nextSelection.status &&
          previousSelection.availableScopes === nextSelection.availableScopes
        ) {
          return;
        }

        previousSelection = nextSelection;
        onStoreChange();
      });
    },
  };
}
