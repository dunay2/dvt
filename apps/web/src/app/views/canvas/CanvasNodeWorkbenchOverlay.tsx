/** Owned concern: render the contextual NodeWorkbench overlay presentation shell. */
import { useCallback, useEffect, type HTMLAttributes, type ReactNode, type RefObject } from 'react';

import type {
  CanvasShellChromeCommands,
  CanvasShellLayout,
  CanvasShellPanels,
} from './canvasShell.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
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
  onOpenNodeCode?: () => void;
}>;

function CanvasNodeWorkbenchOverlaySurface({
  accessibleLabel,
  children,
  onPointerCancel,
  onPointerMove,
  onPointerUp,
  position,
  surfaceRef,
}: Readonly<{
  accessibleLabel: string;
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
      role="dialog"
      aria-label={accessibleLabel}
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
  onOpenNodeCode,
}: CanvasNodeWorkbenchOverlayProps): JSX.Element | null {
  const surfaceStrategy = layout.surfaceStrategy;
  const visible = isCanvasNodeWorkbenchVisible({
    focusMode: layout.focusMode,
    inspectorPanelVisible: layout.inspectorPanelVisible,
    surfaceStrategy,
    hasInspectorNode: panels.inspectorNode != null,
  });
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const positionController = useCanvasNodeWorkbenchPosition(visible);
  const inspectorNodeId = panels.inspectorNode?.id ?? null;

  const hideAndRestoreNodeFocus = useCallback((): void => {
    onHide();
    window.requestAnimationFrame(() => {
      const nodeElement = Array.from(
        document.querySelectorAll<HTMLElement>('.react-flow__node')
      ).find((candidate) => candidate.dataset.id === inspectorNodeId);
      nodeElement?.focus({ preventScroll: true });
    });
  }, [inspectorNodeId, onHide]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      positionController.surfaceRef.current
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true });
    });
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      hideAndRestoreNodeFocus();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [hideAndRestoreNodeFocus, positionController.surfaceRef, visible]);

  if (!visible || surfaceStrategy == null || panels.inspectorNode == null) {
    return null;
  }

  return (
    <CanvasNodeWorkbenchOverlaySurface
      accessibleLabel={copy.inspectorEditablePropertiesTitle}
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
        onClose={hideAndRestoreNodeFocus}
        authoring={panels.inspectorAuthoring}
        contributions={panels.inspectorWorkbenchContributions}
        onOpenNodeCode={onOpenNodeCode}
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
