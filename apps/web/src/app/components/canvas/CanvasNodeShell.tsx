/** Owned concern: render the React Flow node shell around a precomputed Canvas node body. */
import { type DragEventHandler, type MouseEvent, type ReactNode } from 'react';

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
  onOpenCode?: () => void;
  onOpenWorkbench?: () => void;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
}>;

export function resolveCanvasNodeDoubleClickAction({
  canOpenCode,
  canOpenWorkbench,
}: Readonly<{
  canOpenCode: boolean;
  canOpenWorkbench: boolean;
}>): 'open-code' | 'open-workbench' | null {
  if (canOpenCode) {
    return 'open-code';
  }

  return canOpenWorkbench ? 'open-workbench' : null;
}

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
  onOpenCode,
  onOpenWorkbench,
  onDragOver,
  onDrop,
}: CanvasNodeShellProps): JSX.Element {
  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (isCanvasNodeEmbeddedControlTarget(event.target)) {
      return;
    }

    const action = resolveCanvasNodeDoubleClickAction({
      canOpenCode: onOpenCode != null,
      canOpenWorkbench: onOpenWorkbench != null,
    });
    if (action === 'open-code') {
      onOpenCode?.();
      return;
    }
    if (action === 'open-workbench') {
      onOpenWorkbench?.();
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(styles.root, 'relative')}
          onDoubleClick={handleDoubleClick}
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
