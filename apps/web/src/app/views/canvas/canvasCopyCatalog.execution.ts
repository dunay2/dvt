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
  planGraphDbtCompilationFailedMessage: {
    key: 'canvas.plan.graphDbtCompilationFailedMessage',
    fallback:
      'Preview stopped because native DBT compilation did not validate the generated models. Review the model SQL and target configuration.',
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
  planPreviewTitle: {
    key: 'canvas.planPreview.title',
    fallback: 'Execution Preview',
  },
  planPreviewReadOnlyLabel: {
    key: 'canvas.planPreview.readOnlyLabel',
    fallback: 'Read-only',
  },
  planPreviewDescription: {
    key: 'canvas.planPreview.description',
    fallback: 'Review the immutable execution preview before starting a run.',
  },
  planPreviewNotEstimatedValue: {
    key: 'canvas.planPreview.notEstimatedValue',
    fallback: 'Not estimated',
  },
  planPreviewIdentityTitle: {
    key: 'canvas.planPreview.identityTitle',
    fallback: 'Execution Preview identity',
  },
  planPreviewIdentityCaption: {
    key: 'canvas.planPreview.identityCaption',
    fallback: 'Immutable identifiers for the persisted preview.',
  },
  planPreviewIdLabel: {
    key: 'canvas.planPreview.idLabel',
    fallback: 'Preview ID',
  },
  planPreviewVersionLabel: {
    key: 'canvas.planPreview.versionLabel',
    fallback: 'Version',
  },
  planPreviewRefLabel: {
    key: 'canvas.planPreview.refLabel',
    fallback: 'Preview Ref',
  },
  planPreviewGeneratedLabel: {
    key: 'canvas.planPreview.generatedLabel',
    fallback: 'Generated',
  },
  planPreviewEstimatedCostLabel: {
    key: 'canvas.planPreview.estimatedCostLabel',
    fallback: 'Estimated cost',
  },
  planPreviewExecutionTargetTitle: {
    key: 'canvas.planPreview.executionTargetTitle',
    fallback: 'Execution target',
  },
  planPreviewExecutionTargetCaption: {
    key: 'canvas.planPreview.executionTargetCaption',
    fallback: 'Runtime posture that will be used when the run starts.',
  },
  planPreviewExecutorLabel: {
    key: 'canvas.planPreview.executorLabel',
    fallback: 'Executor',
  },
  planPreviewNotReportedValue: {
    key: 'canvas.planPreview.notReportedValue',
    fallback: 'Not reported',
  },
  planPreviewAdapterLabel: {
    key: 'canvas.planPreview.adapterLabel',
    fallback: 'Adapter',
  },
  planPreviewUnknownValue: {
    key: 'canvas.planPreview.unknownValue',
    fallback: 'Unknown',
  },
  planPreviewTargetLabel: {
    key: 'canvas.planPreview.targetLabel',
    fallback: 'Target',
  },
  planPreviewConnectionLabel: {
    key: 'canvas.planPreview.connectionLabel',
    fallback: 'Connection',
  },
  planPreviewResolutionSourceLabel: {
    key: 'canvas.planPreview.resolutionSourceLabel',
    fallback: 'Resolved by',
  },
  planPreviewEnvironmentDefaultValue: {
    key: 'canvas.planPreview.environmentDefaultValue',
    fallback: 'Environment default',
  },
  planPreviewCapabilitiesLabel: {
    key: 'canvas.planPreview.capabilitiesLabel',
    fallback: 'Capabilities',
  },
  planPreviewSummaryTitle: {
    key: 'canvas.planPreview.summaryTitle',
    fallback: 'Persisted preview summary',
  },
  planPreviewSummaryCaption: {
    key: 'canvas.planPreview.summaryCaption',
    fallback: 'Graph size and table scope captured by the execution preview.',
  },
  planPreviewNodesLabel: {
    key: 'canvas.planPreview.nodesLabel',
    fallback: 'Nodes',
  },
  planPreviewStepsLabel: {
    key: 'canvas.planPreview.stepsLabel',
    fallback: 'Steps',
  },
  planPreviewSourceTablesLabel: {
    key: 'canvas.planPreview.sourceTablesLabel',
    fallback: 'Source tables',
  },
  planPreviewSinkTablesLabel: {
    key: 'canvas.planPreview.sinkTablesLabel',
    fallback: 'Sink tables',
  },
  planPreviewUnavailableValue: {
    key: 'canvas.planPreview.unavailableValue',
    fallback: 'n/a',
  },
  planPreviewPersistenceTitle: {
    key: 'canvas.planPreview.persistenceTitle',
    fallback: 'Persistence evidence',
  },
  planPreviewPersistenceCaption: {
    key: 'canvas.planPreview.persistenceCaption',
    fallback: 'Proof that this preview is backed by a stored canonical preview.',
  },
  planPreviewRecordLabel: {
    key: 'canvas.planPreview.recordLabel',
    fallback: 'Preview record',
  },
  planPreviewCanonicalShaLabel: {
    key: 'canvas.planPreview.canonicalShaLabel',
    fallback: 'Canonical preview SHA',
  },
  planPreviewSelectionTitle: {
    key: 'canvas.planPreview.selectionTitle',
    fallback: 'Execution selection',
  },
  planPreviewSelectionCaption: {
    key: 'canvas.planPreview.selectionCaption',
    fallback: 'Requested execution roots and dependencies included by the governed closure policy.',
  },
  planPreviewSelectionModeLabel: {
    key: 'canvas.planPreview.selectionModeLabel',
    fallback: 'Selection mode',
  },
  planPreviewSelectionExplicitValue: {
    key: 'canvas.planPreview.selectionExplicitValue',
    fallback: 'Explicit',
  },
  planPreviewSelectionWorkspaceDefaultValue: {
    key: 'canvas.planPreview.selectionWorkspaceDefaultValue',
    fallback: 'Workspace default',
  },
  planPreviewRequestedResourcesLabel: {
    key: 'canvas.planPreview.requestedResourcesLabel',
    fallback: 'Requested resources',
  },
  planPreviewIncludedDependenciesLabel: {
    key: 'canvas.planPreview.includedDependenciesLabel',
    fallback: 'Included dependencies',
  },
  planPreviewNoneValue: {
    key: 'canvas.planPreview.noneValue',
    fallback: 'None',
  },
  planPreviewAuthorizedScopeLabel: {
    key: 'canvas.planPreview.authorizedScopeLabel',
    fallback: 'Authorized execution scope',
  },
  planPreviewProvenanceTitle: {
    key: 'canvas.planPreview.provenanceTitle',
    fallback: 'Provenance',
  },
  planPreviewDbtProvenanceCaption: {
    key: 'canvas.planPreview.dbtProvenanceCaption',
    fallback: 'Authoritative dbt project revision and server-owned execution target.',
  },
  planPreviewRepositoryProvenanceCaption: {
    key: 'canvas.planPreview.repositoryProvenanceCaption',
    fallback: 'Repository artifacts used to generate the preview.',
  },
  planPreviewCanvasLabel: {
    key: 'canvas.planPreview.canvasLabel',
    fallback: 'Canvas',
  },
  planPreviewProjectRootLabel: {
    key: 'canvas.planPreview.projectRootLabel',
    fallback: 'Project root',
  },
  planPreviewDbtVersionLabel: {
    key: 'canvas.planPreview.dbtVersionLabel',
    fallback: 'dbt version',
  },
  planPreviewProjectRevisionLabel: {
    key: 'canvas.planPreview.projectRevisionLabel',
    fallback: 'Project revision',
  },
  planPreviewAnalysisRevisionLabel: {
    key: 'canvas.planPreview.analysisRevisionLabel',
    fallback: 'Analysis revision',
  },
  planPreviewSelectedResourcesLabel: {
    key: 'canvas.planPreview.selectedResourcesLabel',
    fallback: 'Selected resources',
  },
  planPreviewGraphArtifactLabel: {
    key: 'canvas.planPreview.graphArtifactLabel',
    fallback: 'Graph artifact',
  },
  planPreviewSqlArtifactLabel: {
    key: 'canvas.planPreview.sqlArtifactLabel',
    fallback: 'SQL artifact',
  },
  planPreviewExecutionStepsTitle: {
    key: 'canvas.planPreview.executionStepsTitle',
    fallback: 'Execution steps',
  },
  planPreviewExecutionStepsCaption: {
    key: 'canvas.planPreview.executionStepsCaption',
    fallback: 'Step order and policy settings that will be submitted to the runtime.',
  },
  planPreviewStepLabel: {
    key: 'canvas.planPreview.stepLabel',
    fallback: 'Step',
  },
  planPreviewNodeSuffix: {
    key: 'canvas.planPreview.nodeSuffix',
    fallback: 'node',
  },
  planPreviewNodesSuffix: {
    key: 'canvas.planPreview.nodesSuffix',
    fallback: 'nodes',
  },
  planPreviewTimeoutLabel: {
    key: 'canvas.planPreview.timeoutLabel',
    fallback: 'Timeout',
  },
  planPreviewRetriesLabel: {
    key: 'canvas.planPreview.retriesLabel',
    fallback: 'Retries',
  },
  planPreviewConcurrencyLabel: {
    key: 'canvas.planPreview.concurrencyLabel',
    fallback: 'Concurrency',
  },
  planPreviewWarehouseLabel: {
    key: 'canvas.planPreview.warehouseLabel',
    fallback: 'Warehouse',
  },
  planPreviewExportJsonAction: {
    key: 'canvas.planPreview.exportJsonAction',
    fallback: 'Export JSON',
  },
  planPreviewStartRunAction: {
    key: 'canvas.planPreview.startRunAction',
    fallback: 'Start Run',
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
  operationalDrawerDataTab: {
    key: 'canvas.operationalDrawer.dataTab',
    fallback: 'Data',
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
    fallback: 'Create Execution Preview',
  },
  operationalDrawerPreviewReadyStatus: {
    key: 'canvas.operationalDrawer.previewReadyStatus',
    fallback: 'Preview ready',
  },
  operationalDrawerPreviewBlockedStatus: {
    key: 'canvas.operationalDrawer.previewBlockedStatus',
    fallback: 'Preview blocked',
  },
  operationalDrawerDataAriaLabel: {
    key: 'canvas.operationalDrawer.dataAriaLabel',
    fallback: 'Source data sample',
  },
  operationalDrawerDataIdleMessage: {
    key: 'canvas.operationalDrawer.dataIdleMessage',
    fallback: 'Double-click the rows and size area of an imported source to inspect a sample.',
  },
  operationalDrawerDataLoadingTemplate: {
    key: 'canvas.operationalDrawer.dataLoadingTemplate',
    fallback: 'Loading a data sample from {nodeName}…',
  },
  operationalDrawerDataEmptyTemplate: {
    key: 'canvas.operationalDrawer.dataEmptyTemplate',
    fallback: '{nodeName} returned no rows.',
  },
  operationalDrawerDataConnectionNotFoundTemplate: {
    key: 'canvas.operationalDrawer.dataConnectionNotFoundTemplate',
    fallback: 'The governed connection for {nodeName} is no longer available.',
  },
  operationalDrawerDataSourceObjectNotFoundTemplate: {
    key: 'canvas.operationalDrawer.dataSourceObjectNotFoundTemplate',
    fallback: 'The source object for {nodeName} is no longer available.',
  },
  operationalDrawerDataUnavailableTemplate: {
    key: 'canvas.operationalDrawer.dataUnavailableTemplate',
    fallback: 'The data sample for {nodeName} could not be read.',
  },
  operationalDrawerDataUnknownErrorTemplate: {
    key: 'canvas.operationalDrawer.dataUnknownErrorTemplate',
    fallback: 'The data sample for {nodeName} could not be loaded.',
  },
  operationalDrawerDataTruncatedTemplate: {
    key: 'canvas.operationalDrawer.dataTruncatedTemplate',
    fallback: 'Showing the first {limit} rows.',
  },
  operationalDrawerDataCaptionTemplate: {
    key: 'canvas.operationalDrawer.dataCaptionTemplate',
    fallback: 'Data sample from {nodeName}',
  },
  operationalDrawerDataNullValue: {
    key: 'canvas.operationalDrawer.dataNullValue',
    fallback: 'NULL',
  },
  sourceDataSampleInteractionLabel: {
    key: 'canvas.sourceDataSample.interactionLabel',
    fallback: 'Double-click this metrics area or press Enter to open a data sample.',
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
    fallback: 'Preview',
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
    fallback: 'What will run',
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
    fallback: 'Selected nodes',
  },
  selectionRecoveryUnavailableRootsLabel: {
    key: 'canvas.selectionRecovery.unavailableRootsLabel',
    fallback: 'Nodes no longer available',
  },
  selectionRecoveryNonExecutableRootsLabel: {
    key: 'canvas.selectionRecovery.nonExecutableRootsLabel',
    fallback: 'Nodes that cannot run',
  },
  selectionRecoveryDerivedDependenciesLabel: {
    key: 'canvas.selectionRecovery.derivedDependenciesLabel',
    fallback: 'Included dependencies',
  },
  selectionRecoveryAdmittedScopeLabel: {
    key: 'canvas.selectionRecovery.admittedScopeLabel',
    fallback: 'Nodes to run',
  },
  selectionRecoveryLastPreviewRevisionLabel: {
    key: 'canvas.selectionRecovery.lastPreviewRevisionLabel',
    fallback: 'Latest preview',
  },
  selectionRecoveryEmptyValue: {
    key: 'canvas.selectionRecovery.emptyValue',
    fallback: 'None',
  },
  selectionRecoveryDiscardUnavailableAction: {
    key: 'canvas.selectionRecovery.discardUnavailableAction',
    fallback: 'Remove unavailable nodes',
  },
  selectionRecoveryUseWorkspaceScopeAction: {
    key: 'canvas.selectionRecovery.useWorkspaceScopeAction',
    fallback: 'Run entire flow',
  },
  selectionRecoveryRefreshAnalysisAction: {
    key: 'canvas.selectionRecovery.refreshAnalysisAction',
    fallback: 'Check again',
  },
  selectionRecoveryRefreshingAnalysisAction: {
    key: 'canvas.selectionRecovery.refreshingAnalysisAction',
    fallback: 'Checking selection...',
  },
  selectionRecoveryRefreshFailureMessage: {
    key: 'canvas.selectionRecovery.refreshFailureMessage',
    fallback: 'The selection could not be checked again.',
  },
  selectionRecoveryProblemSummary: {
    key: 'canvas.selectionRecovery.problemSummary',
    fallback: 'A preview cannot be created with the current selection.',
  },
  selectionRecoveryProblemDetail: {
    key: 'canvas.selectionRecovery.problemDetail',
    fallback:
      'Select a model, test, or snapshot, or run the entire flow. Sources provide data but do not run by themselves.',
  },
  selectionRecoveryBlockerLabel: {
    key: 'canvas.selectionRecovery.blockerLabel',
    fallback: 'Run selection',
  },
  selectionRecoveryDiscardReceiptTemplate: {
    key: 'canvas.selectionRecovery.discardReceiptTemplate',
    fallback: 'Removed unavailable nodes: {affected}. Kept selected nodes: {retained}.',
  },
  selectionRecoveryWorkspaceReceiptTemplate: {
    key: 'canvas.selectionRecovery.workspaceReceiptTemplate',
    fallback: 'Replaced selected nodes: {affected} with the entire flow.',
  },
  selectionRecoveryRefreshReceiptTemplate: {
    key: 'canvas.selectionRecovery.refreshReceiptTemplate',
    fallback: 'Kept selected nodes: {retained}. Selection checked again.',
  },
} satisfies CanvasCopySection;
