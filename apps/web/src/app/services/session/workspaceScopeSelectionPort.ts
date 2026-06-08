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
    targetAdapter: state.targetAdapter,
    availableTargetAdapters: state.availableTargetAdapters,
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

  if (!state.availableTargetAdapters.includes(state.targetAdapter)) {
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
  function sameOptionalWorkspaceScopeIdentity(
    left: WorkspaceScopeIdentity | undefined,
    right: WorkspaceScopeIdentity | undefined
  ): boolean {
    if (!left || !right) {
      return left === right;
    }

    return sameWorkspaceScopeIdentity(left, right);
  }

  function sameWorkspaceScopeIdentityList(
    left: readonly WorkspaceScopeIdentity[],
    right: readonly WorkspaceScopeIdentity[]
  ): boolean {
    return (
      left.length === right.length &&
      left.every((leftScope, index) => {
        const rightScope = right[index];
        return rightScope ? sameWorkspaceScopeIdentity(leftScope, rightScope) : false;
      })
    );
  }

  function sameTargetAdapterList(
    left: readonly SessionState['targetAdapter'][],
    right: readonly SessionState['targetAdapter'][]
  ): boolean {
    return left.length === right.length && left.every((adapter, index) => adapter === right[index]);
  }

  function sameWorkspaceScopeSelectionState(
    left: WorkspaceScopeSelectionState,
    right: WorkspaceScopeSelectionState
  ): boolean {
    return (
      sameWorkspaceScopeIdentity(left.selectedScope, right.selectedScope) &&
      sameWorkspaceScopeIdentityList(left.availableScopes, right.availableScopes) &&
      left.targetAdapter === right.targetAdapter &&
      sameTargetAdapterList(left.availableTargetAdapters, right.availableTargetAdapters) &&
      left.status === right.status &&
      left.rejectionReason === right.rejectionReason &&
      sameOptionalWorkspaceScopeIdentity(left.rejectedScope, right.rejectedScope)
    );
  }

  let cachedSelection = readWorkspaceScopeSelection();

  function readCachedSelection(state: SessionState = useSessionStore.getState()) {
    const nextSelection = readWorkspaceScopeSelection(state);
    if (!sameWorkspaceScopeSelectionState(cachedSelection, nextSelection)) {
      cachedSelection = nextSelection;
    }
    return cachedSelection;
  }

  return {
    getSelection: () => readCachedSelection(),
    selectWorkspaceScope,
    subscribeSelection: (onStoreChange) => {
      let subscriberSelection = readCachedSelection();
      return useSessionStore.subscribe((state) => {
        const previousSelection = subscriberSelection;
        const nextSelection = readCachedSelection(state);
        if (previousSelection === nextSelection) {
          return;
        }

        subscriberSelection = nextSelection;
        onStoreChange();
      });
    },
  };
}
