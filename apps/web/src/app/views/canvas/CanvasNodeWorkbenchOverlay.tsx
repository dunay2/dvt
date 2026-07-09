/** Owned concern: render the contextual NodeWorkbench overlay presentation shell. */
import { useCallback, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';

import type {
  CanvasShellChromeCommands,
  CanvasShellLayout,
  CanvasShellPanels,
} from './canvasShell.types';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';

const CANVAS_NODE_WORKBENCH_OVERLAY_SURFACE_CLASS_NAME =
  'absolute bottom-4 z-20 w-[min(28rem,calc(100%-2rem))] overflow-hidden rounded-md border border-(--border-default) bg-(--surface-panel) shadow-xl';

const NODE_WORKBENCH_DEFAULT_TOP = 64;
const NODE_WORKBENCH_DEFAULT_RIGHT = 16;
const NODE_WORKBENCH_DEFAULT_WIDTH = 448;
const NODE_WORKBENCH_MIN_LEFT = 16;
const NODE_WORKBENCH_MIN_TOP = 16;
const NODE_WORKBENCH_DRAG_EXCLUDED_SELECTOR =
  'button,a,input,textarea,select,[data-workbench-drag-excluded="true"]';

type CanvasNodeWorkbenchPosition = Readonly<{
  left: number;
  top: number;
}>;

type CanvasNodeWorkbenchDragState = Readonly<{
  pointerId: number;
  originLeft: number;
  originTop: number;
  startX: number;
  startY: number;
}>;

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

function resolveDefaultWorkbenchPosition(): CanvasNodeWorkbenchPosition {
  if (typeof window === 'undefined') {
    return {
      left: NODE_WORKBENCH_MIN_LEFT,
      top: NODE_WORKBENCH_DEFAULT_TOP,
    };
  }

  return {
    left: Math.max(
      NODE_WORKBENCH_MIN_LEFT,
      window.innerWidth - NODE_WORKBENCH_DEFAULT_WIDTH - NODE_WORKBENCH_DEFAULT_RIGHT
    ),
    top: NODE_WORKBENCH_DEFAULT_TOP,
  };
}

function CanvasNodeWorkbenchOverlaySurface({
  children,
  onPointerCancel,
  onPointerMove,
  onPointerUp,
  position,
}: Readonly<{
  children: ReactNode;
  onPointerCancel: HTMLAttributes<HTMLDivElement>['onPointerCancel'];
  onPointerMove: HTMLAttributes<HTMLDivElement>['onPointerMove'];
  onPointerUp: HTMLAttributes<HTMLDivElement>['onPointerUp'];
  position: CanvasNodeWorkbenchPosition;
}>): JSX.Element {
  return (
    <div
      data-slot="canvas-node-workbench-overlay"
      className={CANVAS_NODE_WORKBENCH_OVERLAY_SURFACE_CLASS_NAME}
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
  const [position, setPosition] = useState<CanvasNodeWorkbenchPosition>(() =>
    resolveDefaultWorkbenchPosition()
  );
  const dragStateRef = useRef<CanvasNodeWorkbenchDragState | null>(null);
  const surfaceStrategy = layout.surfaceStrategy;
  const nodeWorkbenchPlacement = surfaceStrategy?.nodeWorkbench.placement;
  const handleWorkbenchDragStart = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>['onPointerDown']>
  >(
    (event) => {
      if (event.button !== 0) {
        return;
      }

      if (
        event.target instanceof HTMLElement &&
        event.target.closest(NODE_WORKBENCH_DRAG_EXCLUDED_SELECTOR) != null
      ) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragStateRef.current = {
        pointerId: event.pointerId,
        originLeft: position.left,
        originTop: position.top,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [position.left, position.top]
  );
  const handleWorkbenchDragMove = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>['onPointerMove']>
  >((event) => {
    const dragState = dragStateRef.current;
    if (dragState == null || dragState.pointerId !== event.pointerId) {
      return;
    }

    setPosition({
      left: Math.max(
        NODE_WORKBENCH_MIN_LEFT,
        dragState.originLeft + event.clientX - dragState.startX
      ),
      top: Math.max(NODE_WORKBENCH_MIN_TOP, dragState.originTop + event.clientY - dragState.startY),
    });
  }, []);
  const handleWorkbenchDragEnd = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>['onPointerUp']>
  >((event) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
  }, []);

  if (
    surfaceStrategy == null ||
    nodeWorkbenchPlacement !== 'contextual-overlay' ||
    layout.focusMode ||
    !layout.inspectorPanelVisible ||
    panels.inspectorNode == null
  ) {
    return null;
  }

  return (
    <CanvasNodeWorkbenchOverlaySurface
      position={position}
      onPointerCancel={handleWorkbenchDragEnd}
      onPointerMove={handleWorkbenchDragMove}
      onPointerUp={handleWorkbenchDragEnd}
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
        dragHandleProps={{
          'data-slot': 'canvas-node-workbench-drag-handle',
          onPointerDown: handleWorkbenchDragStart,
        }}
      />
    </CanvasNodeWorkbenchOverlaySurface>
  );
}
