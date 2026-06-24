/** Owned concern: render the governed Canvas node context menu presentation. */
import { Fragment } from 'react';

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '../ui/context-menu';
import type {
  CanvasNodeContextMenuAction,
  CanvasNodeContextMenuActionId,
  CanvasNodeContextMenuActionGroup,
  CanvasNodeContextMenuModel,
} from './canvasNodeContextMenuModel';

export type CanvasNodeContextMenuViewProps = Readonly<{
  model: CanvasNodeContextMenuModel;
  onAction: (actionId: CanvasNodeContextMenuActionId) => void;
}>;

const NODE_CONTEXT_MENU_CONTENT_CLASS_NAME =
  'w-56 border-(--border-default) bg-(--surface-panel) text-(--text-default)';
const NODE_CONTEXT_MENU_TITLE_CLASS_NAME = 'truncate font-mono text-xs text-(--text-muted)';
const NODE_CONTEXT_MENU_GROUP_LABEL_CLASS_NAME =
  'text-[10px] uppercase tracking-wide text-(--text-muted)';

export function CanvasNodeContextMenuView({
  model,
  onAction,
}: CanvasNodeContextMenuViewProps): JSX.Element {
  return (
    <ContextMenuContent
      data-slot="canvas-node-context-menu"
      className={NODE_CONTEXT_MENU_CONTENT_CLASS_NAME}
    >
      <ContextMenuLabel className={NODE_CONTEXT_MENU_TITLE_CLASS_NAME}>
        {model.target.nodeName}
      </ContextMenuLabel>
      {model.actionGroups.map((group, groupIndex) => (
        <CanvasNodeContextMenuGroup
          key={group.id}
          group={group}
          showLabel={groupIndex > 0}
          onAction={onAction}
        />
      ))}
    </ContextMenuContent>
  );
}

export type CanvasNodeContextMenuGroupProps = Readonly<{
  group: CanvasNodeContextMenuActionGroup;
  showLabel: boolean;
  onAction: (actionId: CanvasNodeContextMenuActionId) => void;
}>;

export function CanvasNodeContextMenuGroup({
  group,
  showLabel,
  onAction,
}: CanvasNodeContextMenuGroupProps): JSX.Element {
  return (
    <Fragment>
      <ContextMenuSeparator className="bg-(--border-muted)" />
      {showLabel ? (
        <ContextMenuLabel className={NODE_CONTEXT_MENU_GROUP_LABEL_CLASS_NAME}>
          {group.label}
        </ContextMenuLabel>
      ) : null}
      {group.actions.map((action) => (
        <CanvasNodeContextMenuActionItem key={action.id} action={action} onAction={onAction} />
      ))}
    </Fragment>
  );
}

export type CanvasNodeContextMenuActionItemProps = Readonly<{
  action: CanvasNodeContextMenuAction;
  onAction: (actionId: CanvasNodeContextMenuActionId) => void;
}>;

export function CanvasNodeContextMenuActionItem({
  action,
  onAction,
}: CanvasNodeContextMenuActionItemProps): JSX.Element {
  return (
    <ContextMenuItem
      data-slot="canvas-node-context-menu-item"
      variant={action.destructive ? 'destructive' : undefined}
      disabled={action.disabled}
      title={action.disabledReason}
      onSelect={() => onAction(action.id)}
    >
      {action.label}
    </ContextMenuItem>
  );
}
