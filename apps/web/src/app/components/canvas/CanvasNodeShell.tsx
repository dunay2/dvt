/** Owned concern: render the React Flow node shell around a precomputed Canvas node body. */
import { type DragEventHandler, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';

import { ContextMenu, ContextMenuTrigger } from '../ui/context-menu';
import { cn } from '../ui/utils';
import { CanvasNodeContextMenuView } from './CanvasNodeContextMenuView';
import {
  CanvasNodePortHandle,
  type CanvasNodePortCompatibilityView,
  type CanvasNodePortTone,
} from './CanvasNodePortHandle';
import type {
  CanvasNodeContextMenuActionId,
  CanvasNodeContextMenuModel,
} from './canvasNodeContextMenuModel';
import { isCanvasNodeEmbeddedControlTarget } from './canvasNodeInteractionBoundary';
import styles from './CanvasNodeShell.module.css';

type GovernedNodeActionContextMenuEvent = MouseEvent & Readonly<{
  dvtNodeActionsRequest?: boolean;
}>;

type CanvasNodeShellProps = Readonly<{
  children: ReactNode;
  contextMenuModel: CanvasNodeContextMenuModel;
  shouldShowSourceHandle: boolean;
  shouldShowTargetHandle: boolean;
  sourceHandleTone?: CanvasNodePortTone;
  targetHandleTone?: CanvasNodePortTone;
  sourcePortLabel?: string;
  targetPortLabel?: string;
  sourcePortCompatibility?: CanvasNodePortCompatibilityView;
  targetPortCompatibility?: CanvasNodePortCompatibilityView;
  onContextMenuAction: (actionId: CanvasNodeContextMenuActionId) => void;
  onOpenNode?: () => void;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
}>;

export function CanvasNodeShell({
  children,
  contextMenuModel,
  shouldShowSourceHandle,
  shouldShowTargetHandle,
  sourceHandleTone = 'control',
  targetHandleTone = 'control',
  sourcePortLabel,
  targetPortLabel,
  sourcePortCompatibility,
  targetPortCompatibility,
  onContextMenuAction,
  onOpenNode,
  onDragOver,
  onDrop,
}: CanvasNodeShellProps): JSX.Element {
  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (isCanvasNodeEmbeddedControlTarget(event.target)) {
      return;
    }

    onOpenNode?.();
  };

  const handleContextMenuCapture = (event: ReactMouseEvent<HTMLDivElement>): void => {
    const nativeEvent = event.nativeEvent as GovernedNodeActionContextMenuEvent;
    if (nativeEvent.dvtNodeActionsRequest === true) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-slot="canvas-node-shell"
          className={cn(styles.root, 'relative')}
          onDoubleClick={handleDoubleClick}
          onContextMenuCapture={handleContextMenuCapture}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {shouldShowTargetHandle && (
            <CanvasNodePortHandle
              id="target"
              kind="target"
              tone={targetHandleTone}
              label={targetPortLabel}
              compatibility={targetPortCompatibility}
            />
          )}

          <div className="relative">{children}</div>

          {shouldShowSourceHandle && (
            <CanvasNodePortHandle
              id="source"
              kind="source"
              tone={sourceHandleTone}
              label={sourcePortLabel}
              compatibility={sourcePortCompatibility}
            />
          )}
        </div>
      </ContextMenuTrigger>

      <CanvasNodeContextMenuView model={contextMenuModel} onAction={onContextMenuAction} />
    </ContextMenu>
  );
}
