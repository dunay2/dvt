/** Owned concern: derive explicit Canvas node operations without owning node mutation. */

export type CanvasNodeContextMenuTarget = Readonly<{
  kind: 'node';
  nodeId: string;
  nodeName: string;
}>;

export type CanvasNodeContextMenuActionId =
  | 'open-properties'
  | 'duplicate-node'
  | 'select-node-for-execution'
  | 'deselect-node-from-execution'
  | 'remove-node';

export type CanvasNodeModelerActionId = CanvasNodeContextMenuActionId;

export type CanvasNodeContextMenuAction = Readonly<{
  id: CanvasNodeContextMenuActionId;
  label: string;
  intent: 'command' | 'query';
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

export type CanvasNodeContextMenuCopy = Readonly<{
  editGroupLabel: string;
  propertiesLabel: string;
  duplicateLabel: string;
  selectForExecutionLabel: string;
  deselectForExecutionLabel: string;
  dangerGroupLabel: string;
  deleteLabel: string;
}>;

const DEFAULT_COPY: CanvasNodeContextMenuCopy = {
  editGroupLabel: 'Edit',
  propertiesLabel: 'Properties',
  duplicateLabel: 'Duplicate',
  selectForExecutionLabel: 'Select for execution',
  deselectForExecutionLabel: 'Deselect for execution',
  dangerGroupLabel: 'Danger',
  deleteLabel: 'Delete',
};

export type CanvasNodeModelerAction = CanvasNodeContextMenuAction &
  Readonly<{ id: CanvasNodeModelerActionId }>;

export type CanvasNodeModelerActionGroup = Readonly<{
  id: string;
  label: string;
  actions: readonly CanvasNodeModelerAction[];
}>;

export type CanvasNodeModelerActionModel = Readonly<{
  target: CanvasNodeContextMenuTarget;
  actionGroups: readonly CanvasNodeModelerActionGroup[];
}>;

type BuildCanvasNodeModelerActionModelArgs = Readonly<{
  target: CanvasNodeContextMenuTarget;
  selectedForExecution: boolean;
  canMutateGraph: boolean;
  canInspectNode: boolean;
  canDuplicateNode: boolean;
  canToggleNodeSelection: boolean;
  canRemoveNode: boolean;
  copy?: CanvasNodeContextMenuCopy;
}>;

export function buildCanvasNodeModelerActionModel({
  target,
  selectedForExecution,
  canMutateGraph,
  canInspectNode,
  canDuplicateNode,
  canToggleNodeSelection,
  canRemoveNode,
  copy = DEFAULT_COPY,
}: BuildCanvasNodeModelerActionModelArgs): CanvasNodeModelerActionModel {
  const groups: CanvasNodeModelerActionGroup[] = [];
  const editActions: CanvasNodeModelerAction[] = [];

  if (canInspectNode) {
    editActions.push({
      id: 'open-properties',
      label: copy.propertiesLabel,
      intent: 'query',
      disabled: false,
    });
  }

  if (canMutateGraph && canDuplicateNode) {
    editActions.push({
      id: 'duplicate-node',
      label: copy.duplicateLabel,
      intent: 'command',
      disabled: false,
    });
  }

  if (canToggleNodeSelection) {
    editActions.push({
      id: selectedForExecution ? 'deselect-node-from-execution' : 'select-node-for-execution',
      label: selectedForExecution ? copy.deselectForExecutionLabel : copy.selectForExecutionLabel,
      intent: 'command',
      disabled: false,
    });
  }

  if (editActions.length > 0) {
    groups.push({
      id: 'edit',
      label: copy.editGroupLabel,
      actions: editActions,
    });
  }

  if (canMutateGraph && canRemoveNode) {
    groups.push({
      id: 'danger',
      label: copy.dangerGroupLabel,
      actions: [
        {
          id: 'remove-node',
          label: copy.deleteLabel,
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
export type CanvasColumnContextMenuTarget = Readonly<{
  kind: 'column';
  nodeId: string;
  columnId: string;
  columnName: string;
  parentColumnId?: string;
}>;

export type CanvasColumnContextMenuAction =
  | Readonly<{
      id: 'invoke-function' | 'append-field';
      targetId: string;
      label: string;
      disabled: false;
    }>
  | Readonly<{
      id: 'move-field-up' | 'move-field-down';
      label: string;
      disabled: boolean;
    }>
  | Readonly<{
      id: 'unavailable';
      label: string;
      disabled: true;
    }>;

export type CanvasColumnContextMenuModel = Readonly<{
  target: CanvasColumnContextMenuTarget;
  label: string;
  actions: readonly CanvasColumnContextMenuAction[];
}>;

export function buildCanvasColumnContextMenuModel(args: {
  target: CanvasColumnContextMenuTarget;
  label: string;
  functions?: readonly Readonly<{ id: string; label: string }>[];
  appendFields?: readonly Readonly<{ id: string; label: string }>[];
  move?: Readonly<{
    upLabel: string;
    downLabel: string;
    canMoveUp: boolean;
    canMoveDown: boolean;
  }>;
  unavailableLabel: string;
}): CanvasColumnContextMenuModel {
  const actions: CanvasColumnContextMenuAction[] = [
    ...(args.functions ?? []).map((item) => ({
      id: 'invoke-function' as const,
      targetId: item.id,
      label: item.label,
      disabled: false as const,
    })),
    ...(args.appendFields ?? []).map((item) => ({
      id: 'append-field' as const,
      targetId: item.id,
      label: item.label,
      disabled: false as const,
    })),
    ...(args.move == null
      ? []
      : [
          {
            id: 'move-field-up' as const,
            label: args.move.upLabel,
            disabled: !args.move.canMoveUp,
          },
          {
            id: 'move-field-down' as const,
            label: args.move.downLabel,
            disabled: !args.move.canMoveDown,
          },
        ]),
  ];

  return {
    target: args.target,
    label: args.label,
    actions:
      actions.length === 0
        ? [{ id: 'unavailable', label: args.unavailableLabel, disabled: true }]
        : actions,
  };
}
