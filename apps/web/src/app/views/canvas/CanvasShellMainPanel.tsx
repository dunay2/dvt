/** Owned concern: compose Canvas chrome state, viewport, and center-surface overlay inside the main shell panel. */
import { CanvasGraphStatusOverlay } from './CanvasGraphStatusOverlay';
import type { ReactNode } from 'react';
import type { CanvasExplorerProjectWorkspace } from './explorer/CanvasExplorer';
import { RouteWorkbenchFrame } from '../../components/workbench/RouteWorkbenchFrame';
import {
  CanvasShellContextualWorkbenchSplit,
  CanvasShellMainPanelFrame,
  CanvasShellReadOnlyBannerSlot,
  CanvasShellWorkspaceSurfaces,
} from './CanvasShellMainPanelFrame';
import { CanvasNodeWorkbenchOverlay } from './CanvasNodeWorkbenchOverlay';
import { isCanvasNodeWorkbenchVisible } from './canvasNodeWorkbenchVisibility';
import CanvasViewport from './CanvasViewport';
import { CanvasWorkspaceMenuContributionRegistrar } from './CanvasWorkspaceMenuControls';
import type { CanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';
import type {
  CanvasShellChromeCommands,
  CanvasShellChromeState,
  CanvasShellGraph,
  CanvasShellGraphCommands,
  CanvasShellLayout,
  CanvasShellOpenDataRegistryCommand,
  CanvasShellPanels,
} from './canvasShell.types';

type CanvasShellMainPanelProps = Readonly<{
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  graph: CanvasShellGraph;
  chromeState: CanvasShellChromeState;
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
  onOpenSourceImport?: CanvasShellOpenDataRegistryCommand;
  onOpenProjectExplorer?: () => void;
  onOpenProjectCode?: () => void;
  onImportDbtProject?: () => void;
  onOpenCanvasSettings?: () => void;
  onOpenModelEditor?: (nodeId: string) => void;
  contextMenuPresenter: CanvasContextMenuPresenter;
  workspaceTask?: ReactNode;
  projectFiles?: CanvasExplorerProjectWorkspace &
    Readonly<{ tree: ReactNode; panel?: ReactNode; active: boolean }>;
}>;

function CanvasShellMenuContributionRegistrars({
  panels,
  chromeState,
  chromeCommands,
  onOpenProjectExplorer,
  onOpenProjectCode,
  onImportDbtProject,
  projectFiles,
  workspaceTask,
}: Pick<
  CanvasShellMainPanelProps,
  | 'panels'
  | 'chromeState'
  | 'chromeCommands'
  | 'onOpenProjectExplorer'
  | 'onOpenProjectCode'
  | 'onImportDbtProject'
  | 'projectFiles'
  | 'workspaceTask'
>): JSX.Element {
  return (
    <CanvasWorkspaceMenuContributionRegistrar
      activeCanvas={panels.activeCanvas}
      canExportProjectSnapshot={chromeState.canExportProjectSnapshot}
      canImportProjectSnapshot={chromeState.canImportProjectSnapshot}
      canOpenProjectExplorer={typeof onOpenProjectExplorer === 'function'}
      canOpenProjectCode={typeof onOpenProjectCode === 'function'}
      canImportDbtProject={typeof onImportDbtProject === 'function'}
      {...(chromeCommands.onExportProjectSnapshot == null
        ? {}
        : { onExportProjectSnapshot: chromeCommands.onExportProjectSnapshot })}
      {...(chromeCommands.onImportProjectSnapshotFile == null
        ? {}
        : { onImportProjectSnapshotFile: chromeCommands.onImportProjectSnapshotFile })}
      onOpenProjectExplorer={onOpenProjectExplorer}
      onOpenProjectCode={onOpenProjectCode}
      onImportDbtProject={onImportDbtProject}
      codeTab={
        projectFiles == null
          ? undefined
          : {
              active: workspaceTask == null && projectFiles.active,
              onSelect: () => {
                void projectFiles.onActivate();
              },
              onCanvas: projectFiles.onCanvas,
            }
      }
    />
  );
}

function CanvasShellViewport({
  layout,
  panels,
  graph,
  graphCommands,
  onOpenSourceImport,
  onOpenCanvasSettings,
  contextMenuPresenter,
  workspaceTask,
  projectFiles,
  inspector,
}: Pick<
  CanvasShellMainPanelProps,
  | 'layout'
  | 'panels'
  | 'graph'
  | 'graphCommands'
  | 'onOpenSourceImport'
  | 'onOpenCanvasSettings'
  | 'contextMenuPresenter'
  | 'workspaceTask'
  | 'projectFiles'
> & { inspector: ReactNode }): JSX.Element {
  const nodeWorkbenchVisible = isCanvasNodeWorkbenchVisible({
    focusMode: layout.focusMode,
    inspectorPanelVisible: layout.inspectorPanelVisible,
    surfaceStrategy: layout.surfaceStrategy,
    hasInspectorNode: panels.inspectorNode != null,
  });

  return (
    <CanvasViewport
      workspaceTask={workspaceTask}
      projectFiles={projectFiles}
      inspector={inspector}
      canEditEdges={panels.userPermissions.canEditEdges}
      canMoveNodes={layout.canMoveNodes}
      canSelectNodes={layout.canSelectNodes}
      nodesWithImpact={graph.nodesWithImpact}
      sourceCatalogue={panels.inspectorGraphNodes}
      onInspectSource={graphCommands.onInspectSource}
      edges={graph.edges}
      nodeTypes={graph.nodeTypes}
      gridSize={graph.gridSize}
      canvasPalette={graph.canvasPalette}
      canvasGridVisible={graph.canvasGridVisible}
      canvasGridColor={graph.canvasGridColor}
      canvasSnapToGrid={graph.canvasSnapToGrid}
      viewport={graph.viewport}
      frozenNodeIds={graph.frozenNodeIds}
      onToggleFrozenNode={graphCommands.onToggleFrozenNode}
      onNodesChange={graphCommands.onNodesChange}
      onNodeDrag={graphCommands.onNodeDrag}
      onNodeDragStop={graphCommands.onNodeDragStop}
      onEdgesChange={graphCommands.onEdgesChange}
      onConnect={graphCommands.onConnect}
      onReconnect={graphCommands.onReconnect}
      onViewportChange={graphCommands.onViewportChange}
      onDrop={graphCommands.onDrop}
      onDragOver={graphCommands.onDragOver}
      authoringNodeKinds={panels.authoringNodeKinds}
      onCreateAuthoringNode={graphCommands.onCreateAuthoringNode}
      importedNodeFocusIds={panels.importedNodeFocusIds}
      onImportedNodeFocusComplete={graphCommands.onImportedNodeFocusComplete}
      onImpactFocusNodeChange={graphCommands.onImpactFocusNodeChange}
      canOpenSourceImport={typeof onOpenSourceImport === 'function'}
      onOpenSourceImport={
        onOpenSourceImport == null
          ? undefined
          : (flowPosition) =>
              onOpenSourceImport(
                undefined,
                flowPosition == null ? undefined : { canvasPosition: flowPosition }
              )
      }
      canOpenCanvasSettings={typeof onOpenCanvasSettings === 'function'}
      onOpenCanvasSettings={onOpenCanvasSettings}
      contextMenuPresenter={contextMenuPresenter}
      externalNodeSurfaceActive={
        projectFiles?.active === true ||
        workspaceTask != null ||
        nodeWorkbenchVisible ||
        (layout.contextualWorkbench != null &&
          !(projectFiles != null && layout.contextualWorkbench.id === 'project-code')) ||
        layout.centerSurfaceVisible === true
      }
    />
  );
}

function CanvasShellMainSurface({
  layout,
  panels,
  graph,
  graphCommands,
  onOpenSourceImport,
  onOpenCanvasSettings,
  contextMenuPresenter,
  inspector,
  workspaceTask,
  projectFiles,
}: Pick<
  CanvasShellMainPanelProps,
  | 'layout'
  | 'panels'
  | 'graph'
  | 'graphCommands'
  | 'onOpenSourceImport'
  | 'onOpenCanvasSettings'
  | 'contextMenuPresenter'
  | 'workspaceTask'
  | 'projectFiles'
> & { inspector: ReactNode }): JSX.Element {
  const modelWorkspaceOpen = layout.centerSurfaceVisible != null;
  const inspectorInViewport = layout.centerSurface == null || layout.centerSurfaceVisible === false;
  const contextualWorkbench =
    projectFiles != null && layout.contextualWorkbench?.id === 'project-code'
      ? undefined
      : layout.contextualWorkbench;
  const nodeInspector = workspaceTask == null && contextualWorkbench == null ? inspector : null;
  const viewport = (
    <CanvasShellViewport
      workspaceTask={workspaceTask}
      projectFiles={projectFiles}
      inspector={inspectorInViewport ? nodeInspector : null}
      layout={layout}
      panels={panels}
      graph={graph}
      graphCommands={graphCommands}
      onOpenSourceImport={onOpenSourceImport}
      onOpenCanvasSettings={onOpenCanvasSettings}
      contextMenuPresenter={contextMenuPresenter}
    />
  );

  const baseSurface = (
    <CanvasShellWorkspaceSurfaces
      viewport={
        modelWorkspaceOpen || workspaceTask != null ? viewport : (layout.centerSurface ?? viewport)
      }
      editor={modelWorkspaceOpen ? layout.centerSurface : null}
      editorVisible={workspaceTask == null && layout.centerSurfaceVisible === true}
      hasWorkspaceTabs={panels.activeCanvas != null}
      code={
        projectFiles == null ? undefined : projectFiles.panel == null ? (
          <></>
        ) : (
          <RouteWorkbenchFrame
            scroll={false}
            presentationMode="embedded"
            bodyClassName="flex"
            slots={{ leftPanel: projectFiles.tree, primarySurface: projectFiles.panel }}
          />
        )
      }
      codeVisible={workspaceTask == null && projectFiles?.active === true}
    />
  );

  return (
    <CanvasShellContextualWorkbenchSplit
      baseSurface={baseSurface}
      workbench={workspaceTask == null ? contextualWorkbench : undefined}
      inspector={inspectorInViewport ? null : nodeInspector}
    />
  );
}

export function CanvasShellMainPanel({
  layout,
  panels,
  graph,
  chromeState,
  graphCommands,
  chromeCommands,
  onOpenSourceImport,
  onOpenProjectExplorer,
  onOpenProjectCode,
  onImportDbtProject,
  onOpenCanvasSettings,
  onOpenModelEditor,
  contextMenuPresenter,
  workspaceTask,
  projectFiles,
}: CanvasShellMainPanelProps): JSX.Element {
  const shouldShowGraphStatusOverlay =
    workspaceTask == null &&
    projectFiles?.active !== true &&
    (layout.centerSurface == null || layout.centerSurfaceVisible === false);

  return (
    <CanvasShellMainPanelFrame defaultSize={100}>
      <CanvasShellMenuContributionRegistrars
        panels={panels}
        chromeState={chromeState}
        chromeCommands={chromeCommands}
        onOpenProjectExplorer={onOpenProjectExplorer}
        onOpenProjectCode={onOpenProjectCode}
        onImportDbtProject={onImportDbtProject}
        projectFiles={projectFiles}
        workspaceTask={workspaceTask}
      />
      {layout.readOnlyBanner ? (
        <CanvasShellReadOnlyBannerSlot>{layout.readOnlyBanner}</CanvasShellReadOnlyBannerSlot>
      ) : null}
      <CanvasShellMainSurface
        workspaceTask={workspaceTask}
        projectFiles={projectFiles}
        layout={layout}
        panels={panels}
        graph={graph}
        graphCommands={graphCommands}
        onOpenSourceImport={onOpenSourceImport}
        onOpenCanvasSettings={onOpenCanvasSettings}
        contextMenuPresenter={contextMenuPresenter}
        inspector={
          <CanvasNodeWorkbenchOverlay
            layout={layout}
            panels={panels}
            onHide={chromeCommands.onHideInspector}
            {...(onOpenModelEditor == null ? {} : { onOpenModelEditor })}
          />
        }
      />
      {shouldShowGraphStatusOverlay ? (
        <CanvasGraphStatusOverlay
          activeCanvas={panels.activeCanvas}
          draftStatusState={chromeState.draftStatusState}
          onReloadLatestDraft={chromeCommands.onReloadLatestDraft}
        />
      ) : null}
    </CanvasShellMainPanelFrame>
  );
}
