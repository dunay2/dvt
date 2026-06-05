/** Owned concern: derive Canvas node context-menu actions without owning node mutation. */

export type CanvasNodeContextMenuTarget = Readonly<{
  kind: 'node';
  nodeId: string;
  nodeName: string;
}>;

export type CanvasNodeContextMenuActionId =
  | 'inspect-node'
  | 'duplicate-node'
  | 'select-node-for-execution'
  | 'deselect-node-from-execution'
  | 'remove-node';

export type CanvasNodeModelerActionId = Exclude<CanvasNodeContextMenuActionId, 'inspect-node'>;

export type CanvasNodeContextMenuAction = Readonly<{
  id: CanvasNodeContextMenuActionId;
  label: string;
  intent: 'read' | 'command';
  disabled: boolean;
  destructive?: boolean;
  disabledReason?: string;
}>;

export type CanvasNodeContextMenuActionGroup = Readonly<{
  id: string;
  label: string;
  actions: readonly CanvasNodeContextMenuAction[];
}>;

export type CanvasNodeContextMenuModel = Readonly<{
  target: CanvasNodeContextMenuTarget;
  actionGroups: readonly CanvasNodeContextMenuActionGroup[];
}>;

export type CanvasNodeModelerAction = CanvasNodeContextMenuAction &
  Readonly<{ id: CanvasNodeModelerActionId; intent: 'command' }>;

export type CanvasNodeModelerActionGroup = Readonly<{
  id: string;
  label: string;
  actions: readonly CanvasNodeModelerAction[];
}>;

export type CanvasNodeModelerActionModel = Readonly<{
  target: CanvasNodeContextMenuTarget;
  actionGroups: readonly CanvasNodeModelerActionGroup[];
}>;

type BuildCanvasNodeContextMenuModelArgs = Readonly<{
  target: CanvasNodeContextMenuTarget;
  selectedForExecution: boolean;
  canInspectNode: boolean;
  canDuplicateNode: boolean;
  canToggleNodeSelection: boolean;
  canRemoveNode: boolean;
}>;

type BuildCanvasNodeModelerActionModelArgs = Omit<
  BuildCanvasNodeContextMenuModelArgs,
  'canInspectNode'
>;

export function buildCanvasNodeModelerActionModel({
  target,
  selectedForExecution,
  canDuplicateNode,
  canToggleNodeSelection,
  canRemoveNode,
}: BuildCanvasNodeModelerActionModelArgs): CanvasNodeModelerActionModel {
  const groups: CanvasNodeModelerActionGroup[] = [];
  const editActions: CanvasNodeModelerAction[] = [];

  if (canDuplicateNode) {
    editActions.push({
      id: 'duplicate-node',
      label: 'Duplicate node',
      intent: 'command',
      disabled: false,
    });
  }

  if (canToggleNodeSelection) {
    editActions.push({
      id: selectedForExecution ? 'deselect-node-from-execution' : 'select-node-for-execution',
      label: selectedForExecution ? 'Deselect for execution' : 'Select for execution',
      intent: 'command',
      disabled: false,
    });
  }

  if (editActions.length > 0) {
    groups.push({
      id: 'edit',
      label: 'Edit',
      actions: editActions,
    });
  }

  if (canRemoveNode) {
    groups.push({
      id: 'danger',
      label: 'Danger',
      actions: [
        {
          id: 'remove-node',
          label: 'Remove node',
          intent: 'command',
          destructive: true,
          disabled: false,
        },
      ],
    });
  }

  return {
    target,
    actionGroups: groups,
  };
}

export function buildCanvasNodeContextMenuModel({
  target,
  selectedForExecution,
  canInspectNode,
  canDuplicateNode,
  canToggleNodeSelection,
  canRemoveNode,
}: BuildCanvasNodeContextMenuModelArgs): CanvasNodeContextMenuModel {
  const groups: CanvasNodeContextMenuActionGroup[] = [
    {
      id: 'inspect',
      label: 'Inspect',
      actions: [
        {
          id: 'inspect-node',
          label: 'Properties',
          intent: 'read',
          disabled: !canInspectNode,
          ...(canInspectNode ? {} : { disabledReason: 'Inspector is unavailable for this node.' }),
        },
      ],
    },
  ];
  groups.push(
    ...buildCanvasNodeModelerActionModel({
      target,
      selectedForExecution,
      canDuplicateNode,
      canToggleNodeSelection,
      canRemoveNode,
    }).actionGroups
  );

  return {
    target,
    actionGroups: groups,
  };
}
