import type { LocalizableString } from '../../plugins/contracts/PluginManifest';
import type { CanvasViewCopy } from './canvasCopy.types';

type CanvasCopySection = Partial<Record<keyof CanvasViewCopy, LocalizableString>>;

export const canvasViewExecutionCopyByKey = {
  planPermissionDeniedMessage: {
    key: 'canvas.plan.permissionDeniedMessage',
    fallback: 'You do not have permission to create Execution Previews',
  },
  planSqlArtifactRequiredMessage: {
    key: 'canvas.plan.sqlArtifactRequiredMessage',
    fallback:
      'Preview provenance must resolve the SQL artifact before creating a persisted Execution Preview.',
  },
  planUnableToCreateMessage: {
    key: 'canvas.plan.unableToCreateMessage',
    fallback: 'Unable to create Execution Preview',
  },
  planGraphModelSqlDivergenceMessageTemplate: {
    key: 'canvas.plan.graphModelSqlDivergenceMessageTemplate',
    fallback:
      'Project Code contains a newer edit for {path}. Preview stopped without overwriting it. Continue from a file-authoritative DBT project or restore the Canvas-generated revision.',
  },
  planGraphAuthorityRefusedMessage: {
    key: 'canvas.plan.graphAuthorityRefusedMessage',
    fallback:
      'Preview stopped because this Canvas does not have exclusive graph-draft authority. Open the file-authoritative project or resolve the Canvas authority conflict.',
  },
  previewProvenanceTransformPathRequiredMessage: {
    key: 'canvas.preview.transformPathRequiredMessage',
    fallback:
      'Execution Preview needs SQL content. Select a workspace SQL file for the SQL transform, or use a canvas-authored transform so DVT can create one.',
  },
  previewProvenanceWorkspaceNotConfiguredMessage: {
    key: 'canvas.preview.workspaceNotConfiguredMessage',
    fallback:
      'Preview provenance is not configured for this workspace. Set the Git repo and graph artifact path before planning.',
  },
  previewProvenanceExplicitGitRevisionRequiredMessage: {
    key: 'canvas.preview.explicitGitRevisionRequiredMessage',
    fallback: 'Preview provenance requires an explicit Git branch and commit before planning.',
  },
  previewProvenanceWorkspaceFilesUnavailableMessage: {
    key: 'canvas.preview.workspaceFilesUnavailableMessage',
    fallback: 'Preview provenance could not be resolved from the workspace files.',
  },
  runPermissionDeniedMessage: {
    key: 'canvas.run.permissionDeniedMessage',
    fallback: 'You do not have permission to start runs',
  },
  runNoPlanMessage: {
    key: 'canvas.run.noPlanMessage',
    fallback: 'No Execution Preview available - preview execution first.',
  },
  runPreviewStaleMessage: {
    key: 'canvas.run.previewStaleMessage',
    fallback: 'Execution Preview is stale. Preview execution again before starting.',
  },
  runPlanRefUnavailableMessage: {
    key: 'canvas.run.planRefUnavailableMessage',
    fallback: 'Execution Preview reference is unavailable for this mode',
  },
  runPersistedPreviewRequiredMessage: {
    key: 'canvas.run.persistedPreviewRequiredMessage',
    fallback:
      'Run start requires a persisted Execution Preview bound to the current Execution Preview reference. Preview execution again first.',
  },
  runFailedMessage: {
    key: 'canvas.run.failedMessage',
    fallback: 'Failed to start run',
  },
  canvasExecutionUnavailableMessage: {
    key: 'canvas.execution.unavailableMessage',
    fallback: 'Execution Preview and run start are not available for this canvas kind.',
  },
  dbtExplicitSelectionRequiresExecutableResourceMessage: {
    key: 'canvas.dbt.explicitSelectionRequiresExecutableResourceMessage',
    fallback:
      'Execution selection contains unavailable or non-executable resources. Resolve the explicit selection in Operations before Preview.',
  },
  planCreatedMessage: {
    key: 'canvas.plan.createdMessage',
    fallback: 'Execution Preview created',
  },
  planPreviewSelectionRejectedTitle: {
    key: 'canvas.planPreview.selectionRejectedTitle',
    fallback: 'Execution Preview rejected',
  },
  planPreviewSelectionRejectedDescription: {
    key: 'canvas.planPreview.selectionRejectedDescription',
    fallback: 'The current execution selection was not admitted.',
  },
  planPreviewPlanInvalidTitle: {
    key: 'canvas.planPreview.planInvalidTitle',
    fallback: 'Execution Preview is not executable',
  },
  planPreviewPlanInvalidDescription: {
    key: 'canvas.planPreview.planInvalidDescription',
    fallback: 'The persisted preview failed runtime executability validation.',
  },
  planPreviewUnknownCodeMessage: {
    key: 'canvas.planPreview.unknownCodeMessage',
    fallback: 'The Execution Preview was rejected. Review the technical code.',
  },
  planPreviewCodeLabel: {
    key: 'canvas.planPreview.codeLabel',
    fallback: 'Technical code',
  },
  planPreviewCauseLabel: {
    key: 'canvas.planPreview.causeLabel',
    fallback: 'Cause',
  },
  planPreviewReasonLabel: {
    key: 'canvas.planPreview.reasonLabel',
    fallback: 'Reason',
  },
  planPreviewCloseLabel: {
    key: 'canvas.planPreview.closeLabel',
    fallback: 'Close',
  },
  planPreviewDecisionsTitle: {
    key: 'canvas.planPreview.decisionsTitle',
    fallback: 'Execution decisions',
  },
  planPreviewDecisionsCaption: {
    key: 'canvas.planPreview.decisionsCaption',
    fallback: 'Planner-owned decisions persisted with this immutable preview.',
  },
  planPreviewDecisionSubjectLabel: {
    key: 'canvas.planPreview.decisionSubjectLabel',
    fallback: 'Subject',
  },
  planPreviewDecisionStatusLabel: {
    key: 'canvas.planPreview.decisionStatusLabel',
    fallback: 'Decision',
  },
  planPreviewDecisionReasonLabel: {
    key: 'canvas.planPreview.decisionReasonLabel',
    fallback: 'Planner reason',
  },
  planPreviewDecisionIncludedLabel: {
    key: 'canvas.planPreview.decisionIncludedLabel',
    fallback: 'Included scope',
  },
  planPreviewDecisionExcludedLabel: {
    key: 'canvas.planPreview.decisionExcludedLabel',
    fallback: 'Excluded scope',
  },
  planPreviewDecisionRunLabel: {
    key: 'canvas.planPreview.decisionRunLabel',
    fallback: 'Run',
  },
  planPreviewDecisionSkipLabel: {
    key: 'canvas.planPreview.decisionSkipLabel',
    fallback: 'Skip',
  },
  planPreviewDecisionPartialLabel: {
    key: 'canvas.planPreview.decisionPartialLabel',
    fallback: 'Partial',
  },
  planPreviewDecisionSelectedRootReason: {
    key: 'canvas.planPreview.decisionSelectedRootReason',
    fallback: 'Explicitly selected execution root.',
  },
  planPreviewDecisionSelectedClosureReason: {
    key: 'canvas.planPreview.decisionSelectedClosureReason',
    fallback: 'Dependency included by the selected execution closure.',
  },
  planPreviewDecisionOutsideClosureReason: {
    key: 'canvas.planPreview.decisionOutsideClosureReason',
    fallback: 'Outside the selected execution closure.',
  },
  planPreviewDecisionBoundedSelectionReason: {
    key: 'canvas.planPreview.decisionBoundedSelectionReason',
    fallback: 'The selected execution scope includes only part of the graph.',
  },
  runStartedMessage: {
    key: 'canvas.run.startedMessage',
    fallback: 'Run started',
  },
  planStatusRunUnavailableMessage: {
    key: 'canvas.planStatus.runUnavailableMessage',
    fallback: 'Run start is unavailable in this context.',
  },
  planStatusPreviewRequiredMessage: {
    key: 'canvas.planStatus.previewRequiredMessage',
    fallback: 'Preview required before running.',
  },
  planStatusPreviewNotAlignedMessage: {
    key: 'canvas.planStatus.previewNotAlignedMessage',
    fallback:
      'Execution Preview is not aligned with the active Execution Preview reference. Preview execution again before starting.',
  },
  planStatusPreviewNotPersistedMessage: {
    key: 'canvas.planStatus.previewNotPersistedMessage',
    fallback:
      'Execution Preview is not persisted. Preview execution to create a persisted preview.',
  },
  planStatusPreviewReadyMessage: {
    key: 'canvas.planStatus.previewReadyMessage',
    fallback: 'Preview is current and ready to run.',
  },
  operationalDrawerTitle: {
    key: 'canvas.operationalDrawer.title',
    fallback: 'Canvas operations',
  },
  operationalDrawerLogTab: {
    key: 'canvas.operationalDrawer.logTab',
    fallback: 'Log',
  },
  operationalDrawerProblemsTab: {
    key: 'canvas.operationalDrawer.problemsTab',
    fallback: 'Problems',
  },
  operationalDrawerRunsTab: {
    key: 'canvas.operationalDrawer.runsTab',
    fallback: 'Runs',
  },
  operationalDrawerPreviewTab: {
    key: 'canvas.operationalDrawer.previewTab',
    fallback: 'Preview',
  },
  operationalDrawerProblemsAriaLabel: {
    key: 'canvas.operationalDrawer.problemsAriaLabel',
    fallback: 'Canvas problems',
  },
  operationalDrawerNoProblemsMessage: {
    key: 'canvas.operationalDrawer.noProblemsMessage',
    fallback: 'No current Canvas problems.',
  },
  operationalDrawerRunsAriaLabel: {
    key: 'canvas.operationalDrawer.runsAriaLabel',
    fallback: 'Canvas runs',
  },
  operationalDrawerRunReadyStatus: {
    key: 'canvas.operationalDrawer.runReadyStatus',
    fallback: 'Run ready',
  },
  operationalDrawerRunBlockedStatus: {
    key: 'canvas.operationalDrawer.runBlockedStatus',
    fallback: 'Run blocked',
  },
  operationalDrawerRunActiveStatus: {
    key: 'canvas.operationalDrawer.runActiveStatus',
    fallback: 'Active run',
  },
  operationalDrawerActiveRunSummaryTemplate: {
    key: 'canvas.operationalDrawer.activeRunSummaryTemplate',
    fallback: 'Run {runId} is active.',
  },
  operationalDrawerReadyRunSummary: {
    key: 'canvas.operationalDrawer.readyRunSummary',
    fallback: 'Run is ready after the current execution preview.',
  },
  operationalDrawerPreviewAriaLabel: {
    key: 'canvas.operationalDrawer.previewAriaLabel',
    fallback: 'Canvas execution preview',
  },
  operationalDrawerPreviewAction: {
    key: 'canvas.operationalDrawer.previewAction',
    fallback: 'Preview execution plan',
  },
  operationalDrawerPreviewReadyStatus: {
    key: 'canvas.operationalDrawer.previewReadyStatus',
    fallback: 'Preview ready',
  },
  operationalDrawerPreviewBlockedStatus: {
    key: 'canvas.operationalDrawer.previewBlockedStatus',
    fallback: 'Preview blocked',
  },
  operationalDrawerTabsAriaLabel: {
    key: 'canvas.operationalDrawer.tabsAriaLabel',
    fallback: 'Canvas operational drawer',
  },
  operationalDrawerInfoSeverity: {
    key: 'canvas.operationalDrawer.infoSeverity',
    fallback: 'Info',
  },
  operationalDrawerWarningSeverity: {
    key: 'canvas.operationalDrawer.warningSeverity',
    fallback: 'Warning',
  },
  operationalDrawerErrorSeverity: {
    key: 'canvas.operationalDrawer.errorSeverity',
    fallback: 'Error',
  },
  operationalDrawerPlanIntegrityBlocker: {
    key: 'canvas.operationalDrawer.planIntegrityBlocker',
    fallback: 'Execution Preview integrity',
  },
  operationalDrawerBackpressureBlocker: {
    key: 'canvas.operationalDrawer.backpressureBlocker',
    fallback: 'Backpressure',
  },
  operationalDrawerCapabilityMismatchBlocker: {
    key: 'canvas.operationalDrawer.capabilityMismatchBlocker',
    fallback: 'Capability mismatch',
  },
  operationalDrawerAdapterDegradedBlocker: {
    key: 'canvas.operationalDrawer.adapterDegradedBlocker',
    fallback: 'Adapter degraded',
  },
  operationalDrawerAuthorizationDeniedBlocker: {
    key: 'canvas.operationalDrawer.authorizationDeniedBlocker',
    fallback: 'Authorization denied',
  },
  planStatusBackpressureMessage: {
    key: 'canvas.planStatus.backpressureMessage',
    fallback: 'Runtime admission is temporarily backpressured. Retry after capacity recovers.',
  },
  planStatusAdapterDegradedMessage: {
    key: 'canvas.planStatus.adapterDegradedMessage',
    fallback:
      'The execution adapter is degraded. Run start remains blocked until runtime recovers.',
  },
  selectionRecoveryTitle: {
    key: 'canvas.selectionRecovery.title',
    fallback: 'Execution selection',
  },
  selectionRecoveryReadyStatus: {
    key: 'canvas.selectionRecovery.readyStatus',
    fallback: 'ready',
  },
  selectionRecoveryBlockedStatus: {
    key: 'canvas.selectionRecovery.blockedStatus',
    fallback: 'blocked',
  },
  selectionRecoveryRequestedRootsLabel: {
    key: 'canvas.selectionRecovery.requestedRootsLabel',
    fallback: 'Requested roots',
  },
  selectionRecoveryUnavailableRootsLabel: {
    key: 'canvas.selectionRecovery.unavailableRootsLabel',
    fallback: 'Unavailable roots',
  },
  selectionRecoveryNonExecutableRootsLabel: {
    key: 'canvas.selectionRecovery.nonExecutableRootsLabel',
    fallback: 'Non-executable roots',
  },
  selectionRecoveryDerivedDependenciesLabel: {
    key: 'canvas.selectionRecovery.derivedDependenciesLabel',
    fallback: 'Derived dependencies',
  },
  selectionRecoveryAdmittedScopeLabel: {
    key: 'canvas.selectionRecovery.admittedScopeLabel',
    fallback: 'Admitted scope',
  },
  selectionRecoveryLastPreviewRevisionLabel: {
    key: 'canvas.selectionRecovery.lastPreviewRevisionLabel',
    fallback: 'Last preview revision',
  },
  selectionRecoveryEmptyValue: {
    key: 'canvas.selectionRecovery.emptyValue',
    fallback: 'None',
  },
  selectionRecoveryDiscardUnavailableAction: {
    key: 'canvas.selectionRecovery.discardUnavailableAction',
    fallback: 'Discard unavailable selection',
  },
  selectionRecoveryUseWorkspaceScopeAction: {
    key: 'canvas.selectionRecovery.useWorkspaceScopeAction',
    fallback: 'Use workspace scope',
  },
  selectionRecoveryRefreshAnalysisAction: {
    key: 'canvas.selectionRecovery.refreshAnalysisAction',
    fallback: 'Keep blocked and refresh analysis',
  },
  selectionRecoveryRefreshingAnalysisAction: {
    key: 'canvas.selectionRecovery.refreshingAnalysisAction',
    fallback: 'Refreshing authoritative analysis...',
  },
  selectionRecoveryRefreshFailureMessage: {
    key: 'canvas.selectionRecovery.refreshFailureMessage',
    fallback: 'Authoritative analysis could not be refreshed.',
  },
  selectionRecoveryProblemSummary: {
    key: 'canvas.selectionRecovery.problemSummary',
    fallback: 'Execution selection requires recovery.',
  },
  selectionRecoveryProblemDetail: {
    key: 'canvas.selectionRecovery.problemDetail',
    fallback: 'Unavailable or non-executable requested roots must be resolved before Preview.',
  },
  selectionRecoveryBlockerLabel: {
    key: 'canvas.selectionRecovery.blockerLabel',
    fallback: 'Execution selection',
  },
  selectionRecoveryDiscardReceiptTemplate: {
    key: 'canvas.selectionRecovery.discardReceiptTemplate',
    fallback: 'Discarded unavailable roots: {affected}. Retained explicit roots: {retained}.',
  },
  selectionRecoveryWorkspaceReceiptTemplate: {
    key: 'canvas.selectionRecovery.workspaceReceiptTemplate',
    fallback: 'Replaced explicit roots: {affected} with workspace scope.',
  },
  selectionRecoveryRefreshReceiptTemplate: {
    key: 'canvas.selectionRecovery.refreshReceiptTemplate',
    fallback: 'Kept requested roots: {retained}. Authoritative analysis refreshed.',
  },
} satisfies CanvasCopySection;
