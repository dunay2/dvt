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
  canvasGraphSearchLabel: {
    key: 'canvas.graphSearch.label',
    fallback: 'Search graph',
  },
  canvasGraphSearchInputLabel: {
    key: 'canvas.graphSearch.inputLabel',
    fallback: 'Search graph nodes',
  },
  canvasGraphSearchPlaceholder: {
    key: 'canvas.graphSearch.placeholder',
    fallback: 'Search nodes',
  },
  canvasGraphSearchNoResultsLabel: {
    key: 'canvas.graphSearch.noResultsLabel',
    fallback: 'No results',
  },
  canvasGraphSearchPreviousLabel: {
    key: 'canvas.graphSearch.previousLabel',
    fallback: 'Previous result',
  },
  canvasGraphSearchNextLabel: {
    key: 'canvas.graphSearch.nextLabel',
    fallback: 'Next result',
  },
  canvasGraphSearchCloseLabel: {
    key: 'canvas.graphSearch.closeLabel',
    fallback: 'Close graph search',
  },
  canvasGraphFilterLabel: {
    key: 'canvas.graphFilter.label',
    fallback: 'Filter graph',
  },
  canvasGraphFilterTitle: {
    key: 'canvas.graphFilter.title',
    fallback: 'Graph filters',
  },
  canvasGraphFilterMatchSummaryTemplate: {
    key: 'canvas.graphFilter.matchSummaryTemplate',
    fallback: '{matching} of {total} nodes visible',
  },
  canvasGraphFilterCompositionLabel: {
    key: 'canvas.graphFilter.compositionLabel',
    fallback: 'Combine filters',
  },
  canvasGraphFilterAndLabel: { key: 'canvas.graphFilter.andLabel', fallback: 'All (AND)' },
  canvasGraphFilterOrLabel: { key: 'canvas.graphFilter.orLabel', fallback: 'Any (OR)' },
  canvasGraphFilterPresentationLabel: {
    key: 'canvas.graphFilter.presentationLabel',
    fallback: 'Non-matching nodes',
  },
  canvasGraphFilterDimLabel: { key: 'canvas.graphFilter.dimLabel', fallback: 'De-emphasize' },
  canvasGraphFilterHideLabel: { key: 'canvas.graphFilter.hideLabel', fallback: 'Hide' },
  canvasGraphFilterDimensionLabel: {
    key: 'canvas.graphFilter.dimensionLabel',
    fallback: 'Dimension',
  },
  canvasGraphFilterValueLabel: { key: 'canvas.graphFilter.valueLabel', fallback: 'Value' },
  canvasGraphFilterAddLabel: { key: 'canvas.graphFilter.addLabel', fallback: 'Add filter' },
  canvasGraphFilterClearLabel: {
    key: 'canvas.graphFilter.clearLabel',
    fallback: 'Clear graph filters',
  },
  canvasGraphFilterEmptyLabel: {
    key: 'canvas.graphFilter.emptyLabel',
    fallback: 'No active filters',
  },
  canvasGraphFilterRemoveLabelTemplate: {
    key: 'canvas.graphFilter.removeLabelTemplate',
    fallback: 'Remove {dimension} filter {value}',
  },
  canvasGraphFilterPluginDimensionLabel: {
    key: 'canvas.graphFilter.pluginDimensionLabel',
    fallback: 'Plugin',
  },
  canvasGraphFilterKindDimensionLabel: {
    key: 'canvas.graphFilter.kindDimensionLabel',
    fallback: 'Node type',
  },
  canvasGraphFilterRoleDimensionLabel: {
    key: 'canvas.graphFilter.roleDimensionLabel',
    fallback: 'Role',
  },
  canvasGraphFilterStatusDimensionLabel: {
    key: 'canvas.graphFilter.statusDimensionLabel',
    fallback: 'Status',
  },
  canvasGraphFilterTagDimensionLabel: {
    key: 'canvas.graphFilter.tagDimensionLabel',
    fallback: 'Tag',
  },
  canvasGraphFilterByTagLabelTemplate: {
    key: 'canvas.graphFilter.byTagLabelTemplate',
    fallback: 'Filter graph by tag {tag}',
  },
  canvasNodeContextEditGroupLabel: {
    key: 'canvas.nodeContext.editGroupLabel',
    fallback: 'Edit',
  },
  canvasNodeContextPropertiesLabel: {
    key: 'canvas.nodeContext.propertiesLabel',
    fallback: 'Properties',
  },
  canvasNodeContextDuplicateLabel: {
    key: 'canvas.nodeContext.duplicateLabel',
    fallback: 'Duplicate',
  },
  canvasNodeContextSelectForExecutionLabel: {
    key: 'canvas.nodeContext.selectForExecutionLabel',
    fallback: 'Select for execution',
  },
  canvasNodeContextDeselectForExecutionLabel: {
    key: 'canvas.nodeContext.deselectForExecutionLabel',
    fallback: 'Deselect for execution',
  },
  canvasNodeContextDangerGroupLabel: {
    key: 'canvas.nodeContext.dangerGroupLabel',
    fallback: 'Danger',
  },
  canvasNodeContextDeleteLabel: {
    key: 'canvas.nodeContext.deleteLabel',
    fallback: 'Delete',
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
  canvasContextMenuCanvasGroupLabel: {
    key: 'canvas.contextMenu.canvasGroupLabel',
    fallback: 'Canvas',
  },
  canvasContextMenuCanvasSettingsLabel: {
    key: 'canvas.contextMenu.canvasSettingsLabel',
    fallback: 'Canvas properties',
  },
  canvasContextMenuRemoveEdgeLabel: {
    key: 'canvas.contextMenu.removeEdgeLabel',
    fallback: 'Remove connection',
  },
  canvasContextMenuCloseEdgeLabel: {
    key: 'canvas.contextMenu.closeEdgeLabel',
    fallback: 'Exclude from execution',
  },
  canvasContextMenuOpenEdgeLabel: {
    key: 'canvas.contextMenu.openEdgeLabel',
    fallback: 'Include in execution',
  },
  canvasSettingsDescription: {
    key: 'canvas.settings.description',
    fallback: 'Graph display preferences for the active canvas.',
  },
  canvasSettingsCloseLabel: {
    key: 'canvas.settings.closeLabel',
    fallback: 'Close canvas settings',
  },
  canvasSettingsSectionsLabel: {
    key: 'canvas.settings.sectionsLabel',
    fallback: 'Canvas property sections',
  },
  canvasSettingsAppearanceTabLabel: {
    key: 'canvas.settings.appearanceTabLabel',
    fallback: 'Appearance',
  },
  canvasSettingsGridTabLabel: {
    key: 'canvas.settings.gridTabLabel',
    fallback: 'Grid',
  },
  canvasSettingsLayoutTabLabel: {
    key: 'canvas.settings.layoutTabLabel',
    fallback: 'Layout',
  },
  canvasSettingsBackgroundLabel: {
    key: 'canvas.settings.backgroundLabel',
    fallback: 'Canvas background',
  },
  canvasSettingsBackgroundInputLabel: {
    key: 'canvas.settings.backgroundInputLabel',
    fallback: 'Canvas background hex value',
  },
  canvasSettingsGridSizeLabel: {
    key: 'canvas.settings.gridSizeLabel',
    fallback: 'Grid size',
  },
  canvasSettingsResetGridLabel: {
    key: 'canvas.settings.resetGridLabel',
    fallback: 'Restore grid defaults',
  },
  canvasSettingsAutoLayoutLabel: {
    key: 'canvas.settings.autoLayoutLabel',
    fallback: 'Apply automatic layout',
  },
  canvasSettingsCancelLabel: {
    key: 'canvas.settings.cancelLabel',
    fallback: 'Cancel',
  },
  canvasSettingsApplyLabel: {
    key: 'canvas.settings.applyLabel',
    fallback: 'Apply',
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
  canvasAddNodeCatalogDescription: {
    key: 'canvas.addNodeCatalog.description',
    fallback: 'Search the governed component catalog and add one item to the canvas.',
  },
  canvasAddNodeCatalogCloseLabel: {
    key: 'canvas.addNodeCatalog.closeLabel',
    fallback: 'Close component catalog',
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
    fallback: 'Add a Transformation between upstream sources and downstream outputs.',
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
  workspaceProjectActionsMenuLabel: {
    key: 'canvas.workspace.projectActionsMenuLabel',
    fallback: 'Project actions',
  },
  toolbarProjectSnapshotMenuLabel: {
    key: 'canvas.toolbar.projectSnapshotMenuLabel',
    fallback: 'Project snapshots',
  },
  workspaceImportDbtProjectLabel: {
    key: 'canvas.workspace.importDbtProjectLabel',
    fallback: 'Import dbt project',
  },
  workspaceExploreProjectLabel: {
    key: 'canvas.workspace.exploreProjectLabel',
    fallback: 'Explore project',
  },
  workspaceOpenProjectCodeLabel: {
    key: 'canvas.workspace.openProjectCodeLabel',
    fallback: 'Open project code',
  },
  workspaceActiveCanvasLabelTemplate: {
    key: 'canvas.workspace.activeCanvasLabelTemplate',
    fallback: 'Active canvas: {title}',
  },
  workspaceTransformationKindLabel: {
    key: 'canvas.workspace.transformationKindLabel',
    fallback: 'Transformation',
  },
  projectExplorerTitle: {
    key: 'canvas.projectExplorer.title',
    fallback: 'Explore project',
  },
  projectExplorerDescription: {
    key: 'canvas.projectExplorer.description',
    fallback: 'Open another governed canvas in the active project.',
  },
  projectExplorerCloseLabel: {
    key: 'canvas.projectExplorer.closeLabel',
    fallback: 'Close',
  },
  projectExplorerDismissLabel: {
    key: 'canvas.projectExplorer.dismissLabel',
    fallback: 'Close project explorer window',
  },
  projectExplorerSearchLabel: {
    key: 'canvas.projectExplorer.searchLabel',
    fallback: 'Search canvases',
  },
  projectExplorerSearchPlaceholder: {
    key: 'canvas.projectExplorer.searchPlaceholder',
    fallback: 'Search by canvas, kind, environment, or id',
  },
  projectExplorerEmptyMessage: {
    key: 'canvas.projectExplorer.emptyMessage',
    fallback: 'No canvas documents match this search.',
  },
  projectExplorerListLabel: {
    key: 'canvas.projectExplorer.listLabel',
    fallback: 'Project canvases',
  },
  projectExplorerCurrentCanvasLabel: {
    key: 'canvas.projectExplorer.currentCanvasLabel',
    fallback: 'Current canvas',
  },
  projectExplorerOpenCanvasTemplate: {
    key: 'canvas.projectExplorer.openCanvasTemplate',
    fallback: 'Open {title}',
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
