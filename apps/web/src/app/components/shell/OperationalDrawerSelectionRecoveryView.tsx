/** Owned concern: render a supplied execution-selection recovery contract. */
import type {
  CanvasExecutionSelectionRecoveryCommands,
  CanvasExecutionSelectionRecoveryReadModel,
} from '../../types/canvasExecutionSelectionRecovery';
import {
  OperationalDrawerInlineToken,
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

type OperationalDrawerSelectionRecoveryViewProps = Readonly<{
  commands: CanvasExecutionSelectionRecoveryCommands;
  messages: OperationalDrawerSelectionRecoveryMessages;
  model: CanvasExecutionSelectionRecoveryReadModel;
}>;

export function OperationalDrawerSelectionRecoveryView({
  commands,
  messages,
  model,
}: OperationalDrawerSelectionRecoveryViewProps): JSX.Element {
  return (
    <OperationalDrawerRecoverySurface>
      <div>
        <OperationalDrawerSectionKicker>
          {messages.selectionRecoveryTitle}
        </OperationalDrawerSectionKicker>
        <OperationalDrawerInlineToken variant="code" dataSlot="bottom-operational-selection-status">
          {model.status === 'ready'
            ? messages.selectionRecoveryReadyStatus
            : messages.selectionRecoveryBlockedStatus}
        </OperationalDrawerInlineToken>
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
      <OperationalDrawerSelectionRecoveryActions
        commands={commands}
        messages={messages}
        model={model}
      />
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

function OperationalDrawerSelectionRecoveryActions({
  commands,
  messages,
  model,
}: OperationalDrawerSelectionRecoveryViewProps): JSX.Element | null {
  if (model.status !== 'blocked') return null;
  const actionPending = model.pendingStrategy != null;
  return (
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
  );
}
