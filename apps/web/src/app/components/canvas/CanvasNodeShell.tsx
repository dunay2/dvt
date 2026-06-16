/** Owned concern: render the React Flow node shell around a precomputed Canvas node body. */
import { Handle, Position } from '@xyflow/react';
import { Copy, Info, MousePointer, Trash2 } from 'lucide-react';
import { Fragment, type DragEventHandler, type ReactNode } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { cn } from '../ui/utils';
import styles from './DbtNodeComponent.module.css';
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

const CONTEXT_MENU_ACTION_ICONS: Record<CanvasNodeContextMenuActionId, typeof Info> = {
  'inspect-node': Info,
  'duplicate-node': Copy,
  'select-node-for-execution': MousePointer,
  'deselect-node-from-execution': MousePointer,
  'remove-node': Trash2,
};

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

      <ContextMenuContent className="w-56 bg-slate-900 border-slate-600 text-slate-50">
        <ContextMenuLabel className="truncate font-mono text-xs">
          {contextMenuModel.target.nodeName}
        </ContextMenuLabel>
        {contextMenuModel.actionGroups.map((group, groupIndex) => (
          <Fragment key={group.id}>
            <ContextMenuSeparator className="bg-slate-600" />
            {groupIndex > 0 ? (
              <ContextMenuLabel className="text-[10px] uppercase tracking-wide text-slate-400">
                {group.label}
              </ContextMenuLabel>
            ) : null}
            {group.actions.map((action) => {
              const Icon = CONTEXT_MENU_ACTION_ICONS[action.id];
              return (
                <ContextMenuItem
                  key={action.id}
                  variant={action.destructive ? 'destructive' : undefined}
                  disabled={action.disabled}
                  title={action.disabledReason}
                  onSelect={() => onContextMenuAction(action.id)}
                >
                  <Icon className="size-4" />
                  {action.label}
                </ContextMenuItem>
              );
            })}
          </Fragment>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
