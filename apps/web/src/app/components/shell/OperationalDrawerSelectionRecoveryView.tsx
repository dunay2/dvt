/** Owned concern: render a supplied execution-selection recovery contract. */
import type {
  CanvasExecutionSelectionRecoveryCommands,
  CanvasExecutionSelectionRecoveryReadModel,
} from '../../types/canvasExecutionSelectionRecovery';
import {
  OperationalDrawerCodeToken,
  OperationalDrawerSecondaryAction,
  OperationalDrawerSectionKicker,
} from './OperationalDrawerPanelPrimitives';
import {
  OperationalDrawerRecoveryActions,
  OperationalDrawerRecoveryFailure,
  OperationalDrawerRecoveryReceipt,
  OperationalDrawerRecoveryScopeGrid,
  OperationalDrawerRecoveryScopeGroup,
  OperationalDrawerRecoverySurface,
} from './OperationalDrawerSelectionRecoveryPrimitives';
import {
  formatOperationalDrawerSelectionRecoveryReceipt,
  type OperationalDrawerSelectionRecoveryMessages,
} from './operationalDrawerSelectionRecoveryMessages';

export function OperationalDrawerSelectionRecoveryView({
  commands,
  messages,
  model,
}: Readonly<{
  commands: CanvasExecutionSelectionRecoveryCommands;
  messages: OperationalDrawerSelectionRecoveryMessages;
  model: CanvasExecutionSelectionRecoveryReadModel;
}>): JSX.Element {
  const actionPending = model.pendingStrategy != null;

  return (
    <OperationalDrawerRecoverySurface>
      <div>
        <OperationalDrawerSectionKicker>
          {messages.selectionRecoveryTitle}
        </OperationalDrawerSectionKicker>
        <OperationalDrawerCodeToken dataSlot="bottom-operational-selection-status">
          {model.status === 'ready'
            ? messages.selectionRecoveryReadyStatus
            : messages.selectionRecoveryBlockedStatus}
        </OperationalDrawerCodeToken>
      </div>
      <OperationalDrawerRecoveryScopeGrid>
        <OperationalDrawerRecoveryScopeGroup
          emptyLabel={messages.selectionRecoveryEmptyValue}
          label={messages.selectionRecoveryRequestedRootsLabel}
          values={model.requestedRootNodeIds}
        />
        <OperationalDrawerRecoveryScopeGroup
          emptyLabel={messages.selectionRecoveryEmptyValue}
          label={messages.selectionRecoveryUnavailableRootsLabel}
          values={model.unavailableRootNodeIds}
        />
        <OperationalDrawerRecoveryScopeGroup
          emptyLabel={messages.selectionRecoveryEmptyValue}
          label={messages.selectionRecoveryNonExecutableRootsLabel}
          values={model.nonExecutableRootNodeIds}
        />
        <OperationalDrawerRecoveryScopeGroup
          emptyLabel={messages.selectionRecoveryEmptyValue}
          label={messages.selectionRecoveryDerivedDependenciesLabel}
          values={model.derivedDependencyNodeIds}
        />
        <OperationalDrawerRecoveryScopeGroup
          emptyLabel={messages.selectionRecoveryEmptyValue}
          label={messages.selectionRecoveryAdmittedScopeLabel}
          values={model.admittedScopeNodeIds}
        />
        <OperationalDrawerRecoveryScopeGroup
          emptyLabel={messages.selectionRecoveryEmptyValue}
          label={messages.selectionRecoveryLastPreviewRevisionLabel}
          values={model.lastPreviewRevision == null ? [] : [model.lastPreviewRevision]}
        />
      </OperationalDrawerRecoveryScopeGrid>
      {model.status === 'blocked' ? (
        <OperationalDrawerRecoveryActions>
          {model.canDiscardUnavailable ? (
            <OperationalDrawerSecondaryAction
              disabled={actionPending}
              onClick={commands.discardUnavailable}
            >
              {messages.selectionRecoveryDiscardUnavailableAction}
            </OperationalDrawerSecondaryAction>
          ) : null}
          {model.canUseWorkspaceScope ? (
            <OperationalDrawerSecondaryAction
              disabled={actionPending}
              onClick={commands.useWorkspaceScope}
            >
              {messages.selectionRecoveryUseWorkspaceScopeAction}
            </OperationalDrawerSecondaryAction>
          ) : null}
          {model.canRefreshAnalysis ? (
            <OperationalDrawerSecondaryAction
              disabled={actionPending}
              onClick={commands.refreshAnalysis}
            >
              {model.pendingStrategy === 'refresh_analysis'
                ? messages.selectionRecoveryRefreshingAnalysisAction
                : messages.selectionRecoveryRefreshAnalysisAction}
            </OperationalDrawerSecondaryAction>
          ) : null}
        </OperationalDrawerRecoveryActions>
      ) : null}
      {model.receipt == null ? null : (
        <OperationalDrawerRecoveryReceipt>
          {formatOperationalDrawerSelectionRecoveryReceipt(model.receipt, messages)}
        </OperationalDrawerRecoveryReceipt>
      )}
      {model.failure == null ? null : (
        <OperationalDrawerRecoveryFailure>
          {messages.selectionRecoveryRefreshFailureMessage}
        </OperationalDrawerRecoveryFailure>
      )}
    </OperationalDrawerRecoverySurface>
  );
}
