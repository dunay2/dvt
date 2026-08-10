/** Owned concern: derive explicit Canvas node operations without owning node mutation. */

export type CanvasNodeContextMenuTarget = Readonly<{
  kind: 'node';
  nodeId: string;
  nodeName: string;
}>;

export type CanvasNodeContextMenuActionId =
  'duplicate-node' | 'select-node-for-execution' | 'deselect-node-from-execution' | 'remove-node';

export type CanvasNodeModelerActionId = CanvasNodeContextMenuActionId;

export type CanvasNodeContextMenuAction = Readonly<{
  id: CanvasNodeContextMenuActionId;
  label: string;
  intent: 'command';
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
  duplicateLabel: string;
  selectForExecutionLabel: string;
  deselectForExecutionLabel: string;
  dangerGroupLabel: string;
  deleteLabel: string;
}>;

const DEFAULT_COPY: CanvasNodeContextMenuCopy = {
  editGroupLabel: 'Edit',
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
  canDuplicateNode: boolean;
  canToggleNodeSelection: boolean;
  canRemoveNode: boolean;
  copy?: CanvasNodeContextMenuCopy;
}>;

export function buildCanvasNodeModelerActionModel({
  target,
  selectedForExecution,
  canMutateGraph,
  canDuplicateNode,
  canToggleNodeSelection,
  canRemoveNode,
  copy = DEFAULT_COPY,
}: BuildCanvasNodeModelerActionModelArgs): CanvasNodeModelerActionModel {
  const groups: CanvasNodeModelerActionGroup[] = [];
  const editActions: CanvasNodeModelerAction[] = [];

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
