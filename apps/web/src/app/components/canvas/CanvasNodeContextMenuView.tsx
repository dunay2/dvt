/** Owned concern: render the governed Canvas node context menu presentation. */
import {
  CanvasNodeContextMenuActionPrimitive,
  CanvasNodeContextMenuGroupFrame,
  CanvasNodeContextMenuGroupLabel,
  CanvasNodeContextMenuSurface,
  CanvasNodeContextMenuTitle,
} from './CanvasNodeContextMenuPrimitives';
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

export function CanvasNodeContextMenuView({
  model,
  onAction,
}: CanvasNodeContextMenuViewProps): JSX.Element {
  return (
    <CanvasNodeContextMenuSurface>
      <CanvasNodeContextMenuTitle>{model.target.nodeName}</CanvasNodeContextMenuTitle>
      {model.actionGroups.map((group, groupIndex) => (
        <CanvasNodeContextMenuGroup
          key={group.id}
          group={group}
          showLabel={groupIndex > 0}
          onAction={onAction}
        />
      ))}
    </CanvasNodeContextMenuSurface>
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
    <CanvasNodeContextMenuGroupFrame>
      {showLabel ? (
        <CanvasNodeContextMenuGroupLabel>{group.label}</CanvasNodeContextMenuGroupLabel>
      ) : null}
      {group.actions.map((action) => (
        <CanvasNodeContextMenuActionItem key={action.id} action={action} onAction={onAction} />
      ))}
    </CanvasNodeContextMenuGroupFrame>
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
    <CanvasNodeContextMenuActionPrimitive
      destructive={action.destructive}
      disabled={action.disabled}
      disabledReason={action.disabledReason}
      onSelect={() => onAction(action.id)}
    >
      {action.label}
    </CanvasNodeContextMenuActionPrimitive>
  );
}
