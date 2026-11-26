/** Owned concern: compose existing Canvas, Model and Code workspace surfaces without changing their DOM or lifetime. */
import type { ReactNode } from 'react';
import { RouteWorkbenchFrame } from '../../components/workbench/RouteWorkbenchFrame';
import { CanvasShellWorkspaceSurfaces } from './CanvasShellMainPanelFrame';
import { isCanvasNodeWorkbenchVisible } from './canvasNodeWorkbenchVisibility';
import type { CanvasShellLayout, CanvasShellPanels } from './canvasShell.types';

type CanvasShellSurfaceInput = Readonly<{
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  projectFiles?: Readonly<{ active: boolean; panel?: ReactNode; tree: ReactNode }>;
  workspaceTask?: ReactNode;
}>;

function isExternalCanvasSurfaceActive(
  { layout, panels, projectFiles, workspaceTask }: CanvasShellSurfaceInput,
  contextualWorkbench: CanvasShellLayout['contextualWorkbench']
): boolean {
  const nodeWorkbenchVisible = isCanvasNodeWorkbenchVisible({
    focusMode: layout.focusMode,
    inspectorPanelVisible: layout.inspectorPanelVisible,
    surfaceStrategy: layout.surfaceStrategy,
    hasInspectorNode: panels.inspectorNode != null || panels.inspectorTarget != null,
  });
  return (
    projectFiles?.active === true ||
    workspaceTask != null ||
    nodeWorkbenchVisible ||
    contextualWorkbench != null ||
    layout.centerSurfaceVisible === true
  );
}

export function projectCanvasShellSurfacePolicy(input: CanvasShellSurfaceInput) {
  const { layout, projectFiles, workspaceTask } = input;
  const contextualWorkbench =
    projectFiles != null && layout.contextualWorkbench?.id === 'project-code'
      ? undefined
      : layout.contextualWorkbench;
  return {
    contextualWorkbench,
    inspectorInViewport: layout.centerSurface == null || layout.centerSurfaceVisible === false,
    hideNodeInspector: workspaceTask != null || contextualWorkbench != null,
    externalNodeSurfaceActive: isExternalCanvasSurfaceActive(input, contextualWorkbench),
  };
}

function renderCanvasShellProjectCodeSurface({
  projectFiles,
}: Pick<CanvasShellSurfaceInput, 'projectFiles'>): JSX.Element | undefined {
  if (projectFiles?.panel == null) return undefined;
  return (
    <RouteWorkbenchFrame
      scroll={false}
      presentationMode="embedded"
      bodyClassName="flex"
      slots={{ leftPanel: projectFiles.tree, primarySurface: projectFiles.panel }}
    />
  );
}

export function CanvasShellWorkspaceBody({
  layout,
  panels,
  projectFiles,
  workspaceTask,
  viewport,
  codeVisible,
}: CanvasShellSurfaceInput & { viewport: ReactNode; codeVisible: boolean }): JSX.Element {
  const modelWorkspaceOpen = layout.centerSurfaceVisible != null;
  return (
    <CanvasShellWorkspaceSurfaces
      viewport={
        modelWorkspaceOpen || workspaceTask != null ? viewport : (layout.centerSurface ?? viewport)
      }
      editor={modelWorkspaceOpen ? layout.centerSurface : null}
      modelWorkspace={layout.modelWorkspace}
      editorVisible={workspaceTask == null && layout.centerSurfaceVisible === true}
      hasWorkspaceTabs={panels.activeCanvas != null || projectFiles?.panel != null}
      code={renderCanvasShellProjectCodeSurface({ projectFiles })}
      codeVisible={codeVisible}
    />
  );
}
