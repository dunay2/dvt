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
  toolbarPlanLabel: {
    key: 'canvas.toolbar.planLabel',
    fallback: 'Plan',
  },
  toolbarRunLabel: {
    key: 'canvas.toolbar.runLabel',
    fallback: 'Run',
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
