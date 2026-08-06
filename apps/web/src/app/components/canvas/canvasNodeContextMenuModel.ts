/** Owned concern: derive Canvas node context-menu actions without owning node mutation. */

export type CanvasNodeContextMenuTarget = Readonly<{
  kind: 'node';
  nodeId: string;
  nodeName: string;
}>;

export type CanvasNodeContextMenuActionId =
  | 'inspect-node'
  | 'open-node-code'
  | 'duplicate-node'
  | 'select-node-for-execution'
  | 'deselect-node-from-execution'
  | 'remove-node';

export type CanvasNodeModelerActionId =
  'duplicate-node' | 'select-node-for-execution' | 'deselect-node-from-execution' | 'remove-node';

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

export type CanvasNodeContextMenuCopy = Readonly<{
  openWorkbenchLabel: string;
  openCodeLabel: string;
  workbenchGroupLabel: string;
  executeGroupLabel: string;
  editGroupLabel: string;
  duplicateLabel: string;
  selectForExecutionLabel: string;
  deselectForExecutionLabel: string;
  dangerGroupLabel: string;
  deleteLabel: string;
}>;

const DEFAULT_COPY: CanvasNodeContextMenuCopy = {
  openWorkbenchLabel: 'Open workbench',
  openCodeLabel: 'Open node code',
  workbenchGroupLabel: 'Workbench',
  executeGroupLabel: 'Execution',
  editGroupLabel: 'Edit',
  duplicateLabel: 'Duplicate',
  selectForExecutionLabel: 'Select for execution',
  deselectForExecutionLabel: 'Deselect for execution',
  dangerGroupLabel: 'Danger',
  deleteLabel: 'Delete',
};

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
  canMutateGraph: boolean;
  canInspectNode: boolean;
  canOpenNodeCode?: boolean;
  canDuplicateNode: boolean;
  canToggleNodeSelection: boolean;
  canRemoveNode: boolean;
  copy?: CanvasNodeContextMenuCopy;
}>;

type BuildCanvasNodeModelerActionModelArgs = Omit<
  BuildCanvasNodeContextMenuModelArgs,
  'canInspectNode' | 'canOpenNodeCode'
>;

function buildOpenWorkbenchAction(
  canInspectNode: boolean,
  copy: CanvasNodeContextMenuCopy
): CanvasNodeContextMenuAction | null {
  if (!canInspectNode) {
    return null;
  }

  return {
    id: 'inspect-node',
    label: copy.openWorkbenchLabel,
    intent: 'read',
    disabled: false,
  };
}

function buildOpenNodeCodeAction(
  canOpenNodeCode: boolean,
  copy: CanvasNodeContextMenuCopy
): CanvasNodeContextMenuAction | null {
  if (!canOpenNodeCode) {
    return null;
  }

  return {
    id: 'open-node-code',
    label: copy.openCodeLabel,
    intent: 'read',
    disabled: false,
  };
}

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

export function buildCanvasNodeContextMenuModel({
  target,
  selectedForExecution,
  canMutateGraph,
  canInspectNode,
  canOpenNodeCode = false,
  canDuplicateNode,
  canToggleNodeSelection,
  canRemoveNode,
  copy = DEFAULT_COPY,
}: BuildCanvasNodeContextMenuModelArgs): CanvasNodeContextMenuModel {
  const executionSelectionAction: CanvasNodeContextMenuAction | null = canToggleNodeSelection
    ? {
        id: selectedForExecution ? 'deselect-node-from-execution' : 'select-node-for-execution',
        label: selectedForExecution ? copy.deselectForExecutionLabel : copy.selectForExecutionLabel,
        intent: 'command',
        disabled: false,
      }
    : null;
  const workbenchAction = buildOpenWorkbenchAction(canInspectNode, copy);
  const codeAction = buildOpenNodeCodeAction(canOpenNodeCode, copy);
  const groups: CanvasNodeContextMenuActionGroup[] = [];

  if (workbenchAction != null || codeAction != null) {
    groups.push({
      id: 'workbench',
      label: copy.workbenchGroupLabel,
      actions: [workbenchAction, codeAction].filter(
        (action): action is CanvasNodeContextMenuAction => action != null
      ),
    });
  }

  if (executionSelectionAction != null) {
    groups.push({
      id: 'execute',
      label: copy.executeGroupLabel,
      actions: [executionSelectionAction],
    });
  }

  groups.push(
    ...buildCanvasNodeModelerActionModel({
      target,
      selectedForExecution,
      canMutateGraph,
      canDuplicateNode,
      canToggleNodeSelection: false,
      canRemoveNode,
      copy,
    }).actionGroups
  );

  return {
    target,
    actionGroups: groups,
  };
}
