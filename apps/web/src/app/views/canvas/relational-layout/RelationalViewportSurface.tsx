/** Owned concern: one cursor and pointer boundary for both relational views. */
import type { DragEventHandler, ReactNode } from 'react';
import type { useCanvasRelationalTreeViewport } from '../useCanvasRelationalTreeViewport';
import { useCanvasRelationalFieldSelection } from '../CanvasRelationalFieldSelectionProvider';
import styles from '../canvasViewportInteraction.module.css';
import {
  canvasViewportScopeProps,
  useCanvasBackgroundAddMenuGesture,
  isCanvasBackgroundTarget,
  resolveCanvasKeyboardAction,
} from '../canvasViewportInteraction';
import { useCanvasRelationalOperationMenu } from '../operation-menu/CanvasRelationalOperationMenuContext';

export function RelationalViewportSurface({
  viewport,
  draft = false,
  children,
  onDragOver,
  onDrop,
}: Readonly<{
  viewport: ReturnType<typeof useCanvasRelationalTreeViewport>;
  draft?: boolean;
  children: ReactNode;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
}>) {
  const fields = useCanvasRelationalFieldSelection();
  const menu = useCanvasRelationalOperationMenu();
  const backgroundAdd = useCanvasBackgroundAddMenuGesture();
  const openAt = (point: { x: number; y: number }, opener: HTMLDivElement) => {
    const canvasPosition = viewport.projectPointer({ clientX: point.x, clientY: point.y });
    if (canvasPosition != null) menu?.openAt({ screenPosition: point, canvasPosition, opener });
  };
  return (
    <div
      {...canvasViewportScopeProps}
      {...backgroundAdd.pointerHandlers}
      ref={viewport.viewportRef}
      data-slot={
        draft ? 'canvas-relational-tree-draft-viewport' : 'canvas-relational-tree-viewport'
      }
      data-panning={viewport.panning}
      role={menu == null ? undefined : 'region'}
      aria-label={menu?.label}
      tabIndex={menu == null ? undefined : 0}
      className={`absolute inset-0 p-5 ${styles.surface} ${styles.local} ${styles.relational} ${draft ? 'pb-16' : ''}`}
      onFocusCapture={viewport.onFocusCapture}
      onPointerDown={viewport.onPointerDown}
      onPointerMove={viewport.onPointerMove}
      onPointerUp={viewport.onPointerUp}
      onPointerCancel={viewport.onPointerCancel}
      onLostPointerCapture={viewport.onLostPointerCapture}
      onClickCapture={viewport.onClickCapture}
      onDoubleClick={(event) => {
        const point = backgroundAdd.resolveRequest(event);
        if (point == null || !menu?.enabled) return;
        event.preventDefault();
        event.stopPropagation();
        openAt(point, event.currentTarget);
      }}
      onContextMenu={(event) => {
        if (!menu?.enabled || !isCanvasBackgroundTarget(event.target, event.currentTarget)) return;
        event.preventDefault();
        event.stopPropagation();
        openAt({ x: event.clientX, y: event.clientY }, event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (
          !menu?.enabled ||
          event.target !== event.currentTarget ||
          resolveCanvasKeyboardAction(event) !== 'context-menu'
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const bounds = event.currentTarget.getBoundingClientRect();
        openAt(
          { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
          event.currentTarget
        );
      }}
      onDragOver={(event) => {
        if (!fields?.backgroundDragOver(event)) onDragOver(event);
      }}
      onDrop={(event) => {
        if (!fields?.backgroundDrop(event)) onDrop(event);
      }}
    >
      {children}
    </div>
  );
}
