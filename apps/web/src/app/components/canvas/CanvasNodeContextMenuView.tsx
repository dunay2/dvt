/** Owned concern: render the governed Canvas node operations menu presentation. */
import { Fragment } from 'react';

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '../ui/context-menu';
import type {
  CanvasNodeContextMenuActionId,
  CanvasNodeContextMenuModel,
} from './canvasNodeContextMenuModel';

export type CanvasNodeContextMenuViewProps = Readonly<{
  model: CanvasNodeContextMenuModel;
  onAction: (actionId: CanvasNodeContextMenuActionId) => void;
}>;

export function CanvasNodeContextMenuView({
  model,
  onAction,
}: CanvasNodeContextMenuViewProps): JSX.Element {
  return (
    <ContextMenuContent
      data-slot="canvas-node-context-menu"
      className="w-56 border-(--border-default) bg-(--surface-panel) text-(--text-default)"
    >
      <ContextMenuLabel className="truncate font-mono text-xs text-(--text-muted)">
        {model.target.nodeName}
      </ContextMenuLabel>
      {model.actionGroups.map((group, groupIndex) => (
        <Fragment key={group.id}>
          <ContextMenuSeparator className="bg-(--border-muted)" />
          {groupIndex > 0 ? <ContextMenuLabel>{group.label}</ContextMenuLabel> : null}
          {group.actions.map((action) => (
            <ContextMenuItem
              key={action.id}
              data-slot="canvas-node-context-menu-item"
              variant={action.destructive ? 'destructive' : undefined}
              disabled={action.disabled}
              title={action.disabledReason}
              onSelect={() => onAction(action.id)}
            >
              {action.label}
            </ContextMenuItem>
          ))}
        </Fragment>
      ))}
    </ContextMenuContent>
  );
}
