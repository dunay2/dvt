/** Owned concern: render the contextual NodeWorkbench overlay presentation shell. */
import { type HTMLAttributes, type ReactNode, type RefObject } from 'react';

import type {
  CanvasShellChromeCommands,
  CanvasShellLayout,
  CanvasShellPanels,
} from './canvasShell.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasNodeWorkbenchPosition } from './canvasNodeWorkbenchPositionModel';
import { isCanvasNodeWorkbenchVisible } from './canvasNodeWorkbenchVisibility';
import { canvasNodeWorkbenchVisualTokens } from './canvasNodeWorkbenchVisualTokens';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';
import { useCanvasNodeWorkbenchPosition } from './useCanvasNodeWorkbenchPosition';

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
    | 'inspectorWorkbenchContributions'
    | 'registeredPlugins'
  >;
  onHide: CanvasShellChromeCommands['onHideInspector'];
}>;

function CanvasNodeWorkbenchOverlaySurface({
  children,
  onPointerCancel,
  onPointerMove,
  onPointerUp,
  position,
  surfaceRef,
}: Readonly<{
  children: ReactNode;
  onPointerCancel: HTMLAttributes<HTMLDivElement>['onPointerCancel'];
  onPointerMove: HTMLAttributes<HTMLDivElement>['onPointerMove'];
  onPointerUp: HTMLAttributes<HTMLDivElement>['onPointerUp'];
  position: CanvasNodeWorkbenchPosition;
  surfaceRef: RefObject<HTMLDivElement>;
}>): JSX.Element {
  return (
    <div
      ref={surfaceRef}
      data-slot="canvas-node-workbench-overlay"
      className={canvasNodeWorkbenchVisualTokens.overlay}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
      onPointerCancel={onPointerCancel}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
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
  const surfaceStrategy = layout.surfaceStrategy;
  const visible = isCanvasNodeWorkbenchVisible({
    focusMode: layout.focusMode,
    inspectorPanelVisible: layout.inspectorPanelVisible,
    surfaceStrategy,
    hasInspectorNode: panels.inspectorNode != null,
  });
  const copy = resolveCanvasViewCopy();
  const positionController = useCanvasNodeWorkbenchPosition(visible);

  if (!visible || surfaceStrategy == null || panels.inspectorNode == null) {
    return null;
  }

  return (
    <CanvasNodeWorkbenchOverlaySurface
      position={positionController.position}
      surfaceRef={positionController.surfaceRef}
      {...positionController.surfacePointerProps}
    >
      <CanvasNodeWorkbenchPanel
        node={panels.inspectorNode}
        nodes={panels.inspectorGraphNodes}
        edges={panels.inspectorGraphEdges}
        activeRunId={panels.activeRunId}
        registeredPlugins={panels.registeredPlugins}
        preferredTabId={panels.inspectorPreferredTabId}
        preferredTabRequestId={panels.inspectorPreferredTabRequestId}
        primarySectionIds={surfaceStrategy.nodeWorkbench.sections}
        onClose={onHide}
        authoring={panels.inspectorAuthoring}
        contributions={panels.inspectorWorkbenchContributions}
        dragHandleProps={{
          'aria-label': copy.nodeWorkbenchMoveLabel,
          'data-slot': 'canvas-node-workbench-drag-handle',
          role: 'button',
          tabIndex: 0,
          ...positionController.dragHandleProps,
        }}
      />
    </CanvasNodeWorkbenchOverlaySurface>
  );
}
