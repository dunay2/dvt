/** Owned concern: type and format i18n messages supplied to selection-recovery presentation. */
import type { CanvasExecutionSelectionRecoveryReceipt } from '../../types/canvasExecutionSelectionRecovery';
import type { CanvasViewCopy } from '../../views/canvas/canvasCopy.types';

export type OperationalDrawerSelectionRecoveryMessages = Pick<
  CanvasViewCopy,
  | 'selectionRecoveryTitle'
  | 'selectionRecoveryReadyStatus'
  | 'selectionRecoveryBlockedStatus'
  | 'selectionRecoveryRequestedRootsLabel'
  | 'selectionRecoveryUnavailableRootsLabel'
  | 'selectionRecoveryNonExecutableRootsLabel'
  | 'selectionRecoveryDerivedDependenciesLabel'
  | 'selectionRecoveryAdmittedScopeLabel'
  | 'selectionRecoveryLastPreviewRevisionLabel'
  | 'selectionRecoveryEmptyValue'
  | 'selectionRecoveryDiscardUnavailableAction'
  | 'selectionRecoveryUseWorkspaceScopeAction'
  | 'selectionRecoveryRefreshAnalysisAction'
  | 'selectionRecoveryRefreshingAnalysisAction'
  | 'selectionRecoveryRefreshFailureMessage'
  | 'selectionRecoveryProblemSummary'
  | 'selectionRecoveryProblemDetail'
  | 'selectionRecoveryBlockerLabel'
  | 'selectionRecoveryDiscardReceiptTemplate'
  | 'selectionRecoveryWorkspaceReceiptTemplate'
  | 'selectionRecoveryRefreshReceiptTemplate'
>;

function joinNodeIds(
  nodeIds: readonly string[],
  messages: OperationalDrawerSelectionRecoveryMessages
): string {
  return nodeIds.length === 0 ? messages.selectionRecoveryEmptyValue : nodeIds.join(', ');
}

export function formatOperationalDrawerSelectionRecoveryReceipt(
  receipt: CanvasExecutionSelectionRecoveryReceipt,
  messages: OperationalDrawerSelectionRecoveryMessages
): string {
  const template =
    receipt.strategy === 'discard_unavailable'
      ? messages.selectionRecoveryDiscardReceiptTemplate
      : receipt.strategy === 'use_workspace_scope'
        ? messages.selectionRecoveryWorkspaceReceiptTemplate
        : messages.selectionRecoveryRefreshReceiptTemplate;

  return template
    .replace('{affected}', joinNodeIds(receipt.affectedNodeIds, messages))
    .replace('{retained}', joinNodeIds(receipt.retainedNodeIds, messages));
}
