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
    fallback: 'Execution Preview required',
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
  toolbarCanvasSettingsLabel: {
    key: 'canvas.toolbar.canvasSettingsLabel',
    fallback: 'Canvas settings',
  },
  canvasNodeToolbarLabelTemplate: {
    key: 'canvas.nodeToolbar.labelTemplate',
    fallback: 'Node actions: {nodeName}',
  },
  canvasNodeToolbarCodeLabel: {
    key: 'canvas.nodeToolbar.codeLabel',
    fallback: 'Open node code',
  },
  canvasNodeToolbarCodeDescription: {
    key: 'canvas.nodeToolbar.codeDescription',
    fallback: 'Open the selected node code in its contextual workbench.',
  },
  canvasNodeToolbarFreezeLabel: {
    key: 'canvas.nodeToolbar.freezeLabel',
    fallback: 'Freeze node',
  },
  canvasNodeToolbarFreezeDescription: {
    key: 'canvas.nodeToolbar.freezeDescription',
    fallback: 'Keep this node fixed in its current canvas position.',
  },
  canvasNodeToolbarUnfreezeLabel: {
    key: 'canvas.nodeToolbar.unfreezeLabel',
    fallback: 'Unfreeze node',
  },
  canvasNodeToolbarUnfreezeDescription: {
    key: 'canvas.nodeToolbar.unfreezeDescription',
    fallback: 'Allow this node to move on the canvas again.',
  },
  canvasNodeToolbarMoreLabel: {
    key: 'canvas.nodeToolbar.moreLabel',
    fallback: 'More node actions',
  },
  canvasNodeToolbarMoreDescription: {
    key: 'canvas.nodeToolbar.moreDescription',
    fallback: 'Open the governed contextual actions for this node.',
  },
  canvasContextMenuAddLabel: {
    key: 'canvas.contextMenu.addLabel',
    fallback: 'Add...',
  },
  canvasContextMenuAddSourceLabel: {
    key: 'canvas.contextMenu.addSourceLabel',
    fallback: 'Add source',
  },
  canvasContextMenuAddModelLabel: {
    key: 'canvas.contextMenu.addModelLabel',
    fallback: 'Add model',
  },
  canvasContextMenuAddSeedLabel: {
    key: 'canvas.contextMenu.addSeedLabel',
    fallback: 'Add seed',
  },
  canvasContextMenuAddTransformationLabel: {
    key: 'canvas.contextMenu.addTransformationLabel',
    fallback: 'Add transformation',
  },
  canvasContextMenuAddTestLabel: {
    key: 'canvas.contextMenu.addTestLabel',
    fallback: 'Add test',
  },
  canvasContextMenuAddOutputLabel: {
    key: 'canvas.contextMenu.addOutputLabel',
    fallback: 'Add output',
  },
  canvasContextMenuAddMacroLabel: {
    key: 'canvas.contextMenu.addMacroLabel',
    fallback: 'Add macro',
  },
  canvasContextMenuAddNodeLabel: {
    key: 'canvas.contextMenu.addNodeLabel',
    fallback: 'Add',
  },
  canvasContextMenuCanvasSettingsLabel: {
    key: 'canvas.contextMenu.canvasSettingsLabel',
    fallback: 'Canvas settings',
  },
  canvasSettingsDescription: {
    key: 'canvas.settings.description',
    fallback: 'Graph display preferences for the active canvas.',
  },
  canvasSettingsCloseLabel: {
    key: 'canvas.settings.closeLabel',
    fallback: 'Close canvas settings',
  },
  canvasSettingsEnableLabel: {
    key: 'canvas.settings.enableLabel',
    fallback: 'Enable',
  },
  canvasSettingsDisableLabel: {
    key: 'canvas.settings.disableLabel',
    fallback: 'Disable',
  },
  canvasSettingsShowGridLabel: {
    key: 'canvas.settings.showGridLabel',
    fallback: 'Show grid',
  },
  canvasSettingsHideGridLabel: {
    key: 'canvas.settings.hideGridLabel',
    fallback: 'Hide grid',
  },
  canvasSettingsEnableSnapLabel: {
    key: 'canvas.settings.enableSnapLabel',
    fallback: 'Enable snap',
  },
  canvasSettingsDisableSnapLabel: {
    key: 'canvas.settings.disableSnapLabel',
    fallback: 'Disable snap',
  },
  canvasNodePortTargetLabel: {
    key: 'canvas.nodePort.targetLabel',
    fallback: 'Connect incoming port',
  },
  canvasNodePortSourceLabel: {
    key: 'canvas.nodePort.sourceLabel',
    fallback: 'Connect outgoing port',
  },
  canvasNodePortCompatibleWithPrefix: {
    key: 'canvas.nodePort.compatibleWithPrefix',
    fallback: 'Compatible with',
  },
  canvasNodePortNoCompatibleNodesMessage: {
    key: 'canvas.nodePort.noCompatibleNodesMessage',
    fallback: 'No compatible nodes available',
  },
  canvasNodePortBlockedMessage: {
    key: 'canvas.nodePort.blockedMessage',
    fallback: 'Compatible nodes are blocked by the current graph policy',
  },
  canvasAddNodeCatalogTitle: {
    key: 'canvas.addNodeCatalog.title',
    fallback: 'Add component',
  },
  canvasAddNodeCatalogSearchLabel: {
    key: 'canvas.addNodeCatalog.searchLabel',
    fallback: 'Search components',
  },
  canvasAddNodeCatalogSearchPlaceholder: {
    key: 'canvas.addNodeCatalog.searchPlaceholder',
    fallback: 'Search source, model, transformation, test, output...',
  },
  canvasAddNodeCatalogEmptyMessage: {
    key: 'canvas.addNodeCatalog.emptyMessage',
    fallback: 'No matching components',
  },
  canvasAddNodeCatalogSourceCategoryLabel: {
    key: 'canvas.addNodeCatalog.sourceCategoryLabel',
    fallback: 'Sources',
  },
  canvasAddNodeCatalogModelCategoryLabel: {
    key: 'canvas.addNodeCatalog.modelCategoryLabel',
    fallback: 'Models',
  },
  canvasAddNodeCatalogSeedCategoryLabel: {
    key: 'canvas.addNodeCatalog.seedCategoryLabel',
    fallback: 'Seeds',
  },
  canvasAddNodeCatalogTransformationCategoryLabel: {
    key: 'canvas.addNodeCatalog.transformationCategoryLabel',
    fallback: 'Transformations',
  },
  canvasAddNodeCatalogTestCategoryLabel: {
    key: 'canvas.addNodeCatalog.testCategoryLabel',
    fallback: 'Tests',
  },
  canvasAddNodeCatalogOutputCategoryLabel: {
    key: 'canvas.addNodeCatalog.outputCategoryLabel',
    fallback: 'Outputs',
  },
  canvasAddNodeCatalogMacroCategoryLabel: {
    key: 'canvas.addNodeCatalog.macroCategoryLabel',
    fallback: 'Macros',
  },
  canvasAddNodeCatalogNodeCategoryLabel: {
    key: 'canvas.addNodeCatalog.nodeCategoryLabel',
    fallback: 'Components',
  },
  canvasAddNodeCatalogSourceDescription: {
    key: 'canvas.addNodeCatalog.sourceDescription',
    fallback: 'Attach a governed warehouse or dbt source to the graph.',
  },
  canvasAddNodeCatalogModelDescription: {
    key: 'canvas.addNodeCatalog.modelDescription',
    fallback: 'Create a modeled dataset that can receive inputs and feed downstream checks.',
  },
  canvasAddNodeCatalogSeedDescription: {
    key: 'canvas.addNodeCatalog.seedDescription',
    fallback: 'Add a static seed dataset managed by the project.',
  },
  canvasAddNodeCatalogTransformationDescription: {
    key: 'canvas.addNodeCatalog.transformationDescription',
    fallback: 'Add a SQL transformation between upstream sources and downstream outputs.',
  },
  canvasAddNodeCatalogTestDescription: {
    key: 'canvas.addNodeCatalog.testDescription',
    fallback: 'Add a validation node that explains what it checks and what it targets.',
  },
  canvasAddNodeCatalogOutputDescription: {
    key: 'canvas.addNodeCatalog.outputDescription',
    fallback: 'Declare the exact destination table, write mode, and publishing target.',
  },
  canvasAddNodeCatalogMacroDescription: {
    key: 'canvas.addNodeCatalog.macroDescription',
    fallback: 'Add a reusable project macro component.',
  },
  canvasAddNodeCatalogNodeDescription: {
    key: 'canvas.addNodeCatalog.nodeDescription',
    fallback: 'Add a registered Canvas component.',
  },
  toolbarEmptyCanvasGuideLabel: {
    key: 'canvas.toolbar.emptyCanvasGuideLabel',
    fallback: 'Empty canvas guide',
  },
  toolbarProjectSnapshotMenuLabel: {
    key: 'canvas.toolbar.projectSnapshotMenuLabel',
    fallback: 'Project',
  },
  toolbarExportSnapshotLabel: {
    key: 'canvas.toolbar.exportSnapshotLabel',
    fallback: 'Export',
  },
  toolbarImportSnapshotLabel: {
    key: 'canvas.toolbar.importSnapshotLabel',
    fallback: 'Import',
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
  replaceCanvasTitle: {
    key: 'canvas.toolbar.replaceCanvasTitle',
    fallback: 'Create a new canvas?',
  },
  replaceCanvasMessage: {
    key: 'canvas.toolbar.replaceCanvasMessage',
    fallback:
      'This adds another worksheet to the current project draft. The active canvas stays available in the left project list.',
  },
  replaceCanvasCancelLabel: {
    key: 'canvas.toolbar.replaceCanvasCancelLabel',
    fallback: 'Cancel',
  },
  replaceCanvasConfirmLabel: {
    key: 'canvas.toolbar.replaceCanvasConfirmLabel',
    fallback: 'Create canvas',
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
