/** Owned concern: render the React Flow node shell around a precomputed Canvas node body. */
import { Handle, Position } from '@xyflow/react';
import { type DragEventHandler, type ReactNode } from 'react';

import { ContextMenu, ContextMenuTrigger } from '../ui/context-menu';
import { cn } from '../ui/utils';
import styles from './DbtNodeComponent.module.css';
import { CanvasNodeContextMenuView } from './CanvasNodeContextMenuView';
import type {
  CanvasNodeContextMenuActionId,
  CanvasNodeContextMenuModel,
} from './canvasNodeContextMenuModel';

type CanvasNodeShellProps = Readonly<{
  children: ReactNode;
  contextMenuModel: CanvasNodeContextMenuModel;
  shouldShowSourceHandle: boolean;
  shouldShowTargetHandle: boolean;
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
            <Handle
              type="target"
              position={Position.Left}
              className="bg-gray-400! w-3! h-3! border-2! border-white!"
            />
          )}

          <div className="relative">{children}</div>

          {shouldShowSourceHandle && (
            <Handle
              type="source"
              position={Position.Right}
              className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
            />
          )}
        </div>
      </ContextMenuTrigger>

      <CanvasNodeContextMenuView model={contextMenuModel} onAction={onContextMenuAction} />
    </ContextMenu>
  );
}
