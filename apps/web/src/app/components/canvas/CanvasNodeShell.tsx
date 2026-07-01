/** Owned concern: render the React Flow node shell around a precomputed Canvas node body. */
import { type DragEventHandler, type ReactNode } from 'react';

import { ContextMenu, ContextMenuTrigger } from '../ui/context-menu';
import { cn } from '../ui/utils';
import { CanvasNodeContextMenuView } from './CanvasNodeContextMenuView';
import { CanvasNodePortHandle, type CanvasNodePortTone } from './CanvasNodePortHandle';
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
  onContextMenuAction: (actionId: CanvasNodeContextMenuActionId) => void;
  onOpenWorkbench?: () => void;
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
  onContextMenuAction,
  onOpenWorkbench,
  onDragOver,
  onDrop,
}: CanvasNodeShellProps): JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(styles.root, 'relative')}
          onDoubleClick={onOpenWorkbench}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {shouldShowTargetHandle && (
            <CanvasNodePortHandle
              id="target"
              kind="target"
              tone={targetHandleTone}
              label={targetPortLabel}
            />
          )}

          <div className="relative">{children}</div>

          {shouldShowSourceHandle && (
            <CanvasNodePortHandle
              id="source"
              kind="source"
              tone={sourceHandleTone}
              label={sourcePortLabel}
            />
          )}
        </div>
      </ContextMenuTrigger>

      <CanvasNodeContextMenuView model={contextMenuModel} onAction={onContextMenuAction} />
    </ContextMenu>
  );
}
