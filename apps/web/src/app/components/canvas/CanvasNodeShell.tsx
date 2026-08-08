/** Owned concern: render the React Flow node shell around a precomputed Canvas node body. */
import { type DragEventHandler, type ReactNode } from 'react';

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
  onOpenWorkbench?: () => void;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
}>;

export function resolveCanvasNodeDoubleClickAction(
  model: CanvasNodeContextMenuModel
): CanvasNodeContextMenuActionId | 'open-workbench' | null {
  const codeAction = model.actionGroups
    .flatMap((group) => group.actions)
    .find((action) => action.id === 'open-node-code' && !action.disabled);

  if (codeAction != null) {
    return 'open-node-code';
  }

  const workbenchAction = model.actionGroups
    .flatMap((group) => group.actions)
    .find((action) => action.id === 'inspect-node' && !action.disabled);

  return workbenchAction != null ? 'open-workbench' : null;
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
  onOpenWorkbench,
  onDragOver,
  onDrop,
}: CanvasNodeShellProps): JSX.Element {
  const handleDoubleClick = (): void => {
    const action = resolveCanvasNodeDoubleClickAction(contextMenuModel);
    if (action === 'open-node-code') {
      onContextMenuAction(action);
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
