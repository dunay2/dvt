/** Owned concern: render the contextual NodeWorkbench overlay presentation shell. */
import type { ReactNode } from 'react';

import type {
  CanvasShellChromeCommands,
  CanvasShellLayout,
  CanvasShellPanels,
} from './canvasShell.types';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';

const CANVAS_NODE_WORKBENCH_OVERLAY_SURFACE_CLASS_NAME =
  'absolute top-16 right-4 bottom-4 z-20 w-[min(28rem,calc(100%-2rem))] overflow-hidden rounded-md border border-(--border-default) bg-(--surface-panel) shadow-xl';

export type CanvasNodeWorkbenchOverlayProps = Readonly<{
  layout: Pick<CanvasShellLayout, 'focusMode' | 'inspectorPanelVisible' | 'surfaceStrategy'>;
  panels: Pick<
    CanvasShellPanels,
    | 'activeRunId'
    | 'inspectorAuthoring'
    | 'inspectorGraphEdges'
    | 'inspectorGraphNodes'
    | 'inspectorNode'
    | 'inspectorPreferredTabId'
    | 'inspectorPreferredTabRequestId'
    | 'registeredPlugins'
  >;
  onHide: CanvasShellChromeCommands['onHideInspector'];
}>;

function CanvasNodeWorkbenchOverlaySurface({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <div
      data-slot="canvas-node-workbench-overlay"
      className={CANVAS_NODE_WORKBENCH_OVERLAY_SURFACE_CLASS_NAME}
    >
      {children}
    </div>
  );
}

export function CanvasNodeWorkbenchOverlay({
  layout,
  panels,
  onHide,
}: CanvasNodeWorkbenchOverlayProps): JSX.Element | null {
  const nodeWorkbenchPlacement = layout.surfaceStrategy?.nodeWorkbench.placement;

  if (
    nodeWorkbenchPlacement !== 'contextual-overlay' ||
    layout.focusMode ||
    !layout.inspectorPanelVisible ||
    panels.inspectorNode == null
  ) {
    return null;
  }

  return (
    <CanvasNodeWorkbenchOverlaySurface>
      <CanvasNodeWorkbenchPanel
        node={panels.inspectorNode}
        nodes={panels.inspectorGraphNodes}
        edges={panels.inspectorGraphEdges}
        activeRunId={panels.activeRunId}
        registeredPlugins={panels.registeredPlugins}
        preferredTabId={panels.inspectorPreferredTabId}
        preferredTabRequestId={panels.inspectorPreferredTabRequestId}
        onClose={onHide}
        authoring={panels.inspectorAuthoring}
      />
    </CanvasNodeWorkbenchOverlaySurface>
  );
}
