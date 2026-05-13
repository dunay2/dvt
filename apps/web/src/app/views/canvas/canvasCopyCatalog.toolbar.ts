/** Owned concern: declare default Canvas toolbar copy entries for governed actions. */
import type { LocalizableString } from '../../plugins/contracts/PluginManifest';
import type { CanvasViewCopy } from './canvasCopy.types';

type CanvasCopySection = Partial<Record<keyof CanvasViewCopy, LocalizableString>>;

export const canvasViewToolbarCopyByKey = {
  dependencyAddedMessage: {
    key: 'canvas.edge.dependencyAddedMessage',
    fallback: 'Dependency added',
  },
  layoutAppliedMessage: {
    key: 'canvas.layout.appliedMessage',
    fallback: 'Layout applied',
  },
  toolbarWorkflowRecoveryLabel: {
    key: 'canvas.toolbar.workflow.recoveryLabel',
    fallback: 'Recovery',
  },
  toolbarWorkflowReadOnlyLabel: {
    key: 'canvas.toolbar.workflow.readOnlyLabel',
    fallback: 'Read only',
  },
  toolbarWorkflowRunReadyLabel: {
    key: 'canvas.toolbar.workflow.runReadyLabel',
    fallback: 'Run ready',
  },
  toolbarWorkflowPlanRequiredLabel: {
    key: 'canvas.toolbar.workflow.planRequiredLabel',
    fallback: 'Plan required',
  },
  toolbarLayoutLabel: {
    key: 'canvas.toolbar.layoutLabel',
    fallback: 'Layout',
  },
  toolbarImpactLabel: {
    key: 'canvas.toolbar.impactLabel',
    fallback: 'Impact',
  },
  toolbarColumnsLabel: {
    key: 'canvas.toolbar.columnsLabel',
    fallback: 'Columns',
  },
  toolbarCostLabel: {
    key: 'canvas.toolbar.costLabel',
    fallback: 'Cost',
  },
  toolbarGridLabel: {
    key: 'canvas.toolbar.gridLabel',
    fallback: 'Grid',
  },
  toolbarGridColorLabel: {
    key: 'canvas.toolbar.gridColorLabel',
    fallback: 'Grid color',
  },
  toolbarSnapToGridLabel: {
    key: 'canvas.toolbar.snapToGridLabel',
    fallback: 'Snap',
  },
  toolbarExportSnapshotLabel: {
    key: 'canvas.toolbar.exportSnapshotLabel',
    fallback: 'Export',
  },
  toolbarImportSnapshotLabel: {
    key: 'canvas.toolbar.importSnapshotLabel',
    fallback: 'Import',
  },
  toolbarPlanLabel: {
    key: 'canvas.toolbar.planLabel',
    fallback: 'Plan',
  },
  toolbarRunLabel: {
    key: 'canvas.toolbar.runLabel',
    fallback: 'Run',
  },
  projectSnapshotExportUnavailableMessage: {
    key: 'canvas.projectSnapshot.exportUnavailableMessage',
    fallback: 'Project snapshot export is available after the draft is saved.',
  },
  projectSnapshotImportRejectedMessage: {
    key: 'canvas.projectSnapshot.importRejectedMessage',
    fallback: 'Project snapshot import was rejected.',
  },
  projectSnapshotImportFailedMessage: {
    key: 'canvas.projectSnapshot.importFailedMessage',
    fallback: 'Project snapshot import failed.',
  },
  newCanvasLabel: {
    key: 'canvas.toolbar.newCanvasLabel',
    fallback: 'New canvas',
  },
  workbenchGraphTabLabel: {
    key: 'canvas.workbench.tabs.graphLabel',
    fallback: 'Graph',
  },
  workbenchCodeTabLabel: {
    key: 'canvas.workbench.tabs.codeLabel',
    fallback: 'Code',
  },
  workbenchLineageTabLabel: {
    key: 'canvas.workbench.tabs.lineageLabel',
    fallback: 'Lineage',
  },
  workbenchDiffTabLabel: {
    key: 'canvas.workbench.tabs.diffLabel',
    fallback: 'Diff',
  },
  workbenchArtifactsTabLabel: {
    key: 'canvas.workbench.tabs.artifactsLabel',
    fallback: 'Artifacts',
  },
  workbenchRunsTabLabel: {
    key: 'canvas.workbench.tabs.runsLabel',
    fallback: 'Runs',
  },
  replaceCanvasTitle: {
    key: 'canvas.toolbar.replaceCanvasTitle',
    fallback: 'Replace current canvas?',
  },
  replaceCanvasMessage: {
    key: 'canvas.toolbar.replaceCanvasMessage',
    fallback:
      'This creates a blank canvas in the current workspace draft. Existing nodes and edges are removed after confirmation.',
  },
  replaceCanvasCancelLabel: {
    key: 'canvas.toolbar.replaceCanvasCancelLabel',
    fallback: 'Cancel',
  },
  replaceCanvasConfirmLabel: {
    key: 'canvas.toolbar.replaceCanvasConfirmLabel',
    fallback: 'Create blank canvas',
  },
  draftSyncedLabel: {
    key: 'canvas.draft.toolbar.syncedLabel',
    fallback: 'Draft synced',
  },
  savingDraftLabel: {
    key: 'canvas.draft.toolbar.savingLabel',
    fallback: 'Saving draft',
  },
  draftSavedLabel: {
    key: 'canvas.draft.toolbar.savedLabel',
    fallback: 'Draft saved',
  },
  draftSaveFailedLabel: {
    key: 'canvas.draft.toolbar.saveFailedLabel',
    fallback: 'Draft save failed',
  },
  staleVersionLabel: {
    key: 'canvas.draft.toolbar.staleVersionLabel',
    fallback: 'Stale version',
  },
  draftMissingLabel: {
    key: 'canvas.draft.toolbar.missingLabel',
    fallback: 'Draft missing',
  },
  projectionGapLabel: {
    key: 'canvas.draft.toolbar.projectionGapLabel',
    fallback: 'Projection gap',
  },
  preparingCanvasRouteDetail: {
    key: 'canvas.bootstrap.preparingDetail',
    fallback: 'Preparing canvas route',
  },
  checkingBackendReadinessDetail: {
    key: 'canvas.bootstrap.checkingBackendDetail',
    fallback: 'Checking backend readiness for canvas',
  },
  loadingWorkspaceGraphDetail: {
    key: 'canvas.bootstrap.loadingGraphDetail',
    fallback: 'Loading workspace graph for canvas',
  },
  needsCanvasReadyDetail: {
    key: 'canvas.bootstrap.needsCanvasReadyDetail',
    fallback: 'Canvas playground is ready to create the first canvas',
  },
  emptyCanvasReadyDetail: {
    key: 'canvas.bootstrap.emptyReadyDetail',
    fallback: 'Canvas is ready with no graph content yet',
  },
  canvasReadyDetail: {
    key: 'canvas.bootstrap.readyDetail',
    fallback: 'Canvas is ready',
  },
} satisfies CanvasCopySection;
