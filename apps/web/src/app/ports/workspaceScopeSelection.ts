/** Owned concern: define workspace-scope selection command and read-model ports. */
import type { RunContext } from '../types/engine';

export type WorkspaceScopeIdentity = {
  readonly tenantId: string;
  readonly projectId: string;
  readonly projectName?: string;
  readonly environmentId: string;
};

export const WORKSPACE_SCOPE_SELECTION_STATUS = Object.freeze({
  unresolved: 'unresolved',
  selected: 'selected',
  rejected: 'rejected',
} as const);

export type WorkspaceScopeSelectionStatus =
  (typeof WORKSPACE_SCOPE_SELECTION_STATUS)[keyof typeof WORKSPACE_SCOPE_SELECTION_STATUS];

export const WORKSPACE_SCOPE_SELECTION_REJECTION_REASON = Object.freeze({
  unavailable: 'workspace_scope_unavailable',
  unresolved: 'workspace_scope_unresolved',
} as const);

export type WorkspaceScopeSelectionRejectionReason =
  (typeof WORKSPACE_SCOPE_SELECTION_REJECTION_REASON)[keyof typeof WORKSPACE_SCOPE_SELECTION_REJECTION_REASON];

export type WorkspaceScopeSelectionState = {
  readonly selectedScope: WorkspaceScopeIdentity;
  readonly availableScopes: readonly WorkspaceScopeIdentity[];
  readonly targetAdapter: RunContext['targetAdapter'];
  readonly availableTargetAdapters: readonly RunContext['targetAdapter'][];
  readonly status: WorkspaceScopeSelectionStatus;
  readonly rejectionReason?: WorkspaceScopeSelectionRejectionReason;
  readonly rejectedScope?: WorkspaceScopeIdentity;
};

export type SelectWorkspaceScopeResult =
  | {
      readonly status: typeof WORKSPACE_SCOPE_SELECTION_STATUS.selected;
      readonly selectedScope: WorkspaceScopeIdentity;
    }
  | {
      readonly status: typeof WORKSPACE_SCOPE_SELECTION_STATUS.rejected;
      readonly reason: WorkspaceScopeSelectionRejectionReason;
      readonly requestedScope: WorkspaceScopeIdentity;
      readonly selectedScope: WorkspaceScopeIdentity;
    };

export interface WorkspaceScopeSelectionPort {
  getSelection(): WorkspaceScopeSelectionState;
  selectWorkspaceScope(requestedScope: WorkspaceScopeIdentity): SelectWorkspaceScopeResult;
  subscribeSelection(onStoreChange: () => void): () => void;
}
