/** Owned concern: derive Canvas node context-menu actions without owning node mutation. */

export type CanvasNodeContextMenuTarget = Readonly<{
  kind: 'node';
  nodeId: string;
  nodeName: string;
}>;

export type CanvasNodeContextMenuActionId =
  | 'edit-sql'
  | 'inspect-node'
  | 'preview-node'
  | 'run-from-node'
  | 'show-lineage'
  | 'duplicate-node'
  | 'select-node-for-execution'
  | 'deselect-node-from-execution'
  | 'remove-node';

export type CanvasNodeModelerActionId =
  | 'duplicate-node'
  | 'select-node-for-execution'
  | 'deselect-node-from-execution'
  | 'remove-node';

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
  canMutateGraph: boolean;
  canInspectNode: boolean;
  canDuplicateNode: boolean;
  canToggleNodeSelection: boolean;
  canRemoveNode: boolean;
}>;

type BuildCanvasNodeModelerActionModelArgs = Omit<
  BuildCanvasNodeContextMenuModelArgs,
  'canInspectNode'
>;

export const NODE_CONTEXT_MENU_BASE_ACTIONS = {
  editSql: {
    id: 'edit-sql',
    label: 'Edit SQL',
    intent: 'command',
    disabled: true,
    disabledReason: 'SQL workbench is not available for this node.',
  },
  previewNode: {
    id: 'preview-node',
    label: 'Preview node',
    intent: 'command',
    disabled: true,
    disabledReason: 'Node-scoped preview is not available for this node.',
  },
  runFromNode: {
    id: 'run-from-node',
    label: 'Run from here',
    intent: 'command',
    disabled: true,
    disabledReason: 'Run-from-node is not available for this node.',
  },
  showLineage: {
    id: 'show-lineage',
    label: 'Show lineage',
    intent: 'read',
    disabled: true,
    disabledReason: 'Node lineage is not available for this node.',
  },
} as const satisfies Record<string, CanvasNodeContextMenuAction>;

function buildOpenWorkbenchAction(canInspectNode: boolean): CanvasNodeContextMenuAction | null {
  if (!canInspectNode) {
    return null;
  }

  return {
    id: 'inspect-node',
    label: 'Open workbench',
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
}: BuildCanvasNodeModelerActionModelArgs): CanvasNodeModelerActionModel {
  const groups: CanvasNodeModelerActionGroup[] = [];
  const editActions: CanvasNodeModelerAction[] = [];

  if (canMutateGraph && canDuplicateNode) {
    editActions.push({
      id: 'duplicate-node',
      label: 'Duplicate',
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

  if (canMutateGraph && canRemoveNode) {
    groups.push({
      id: 'danger',
      label: 'Danger',
      actions: [
        {
          id: 'remove-node',
          label: 'Delete',
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
  canDuplicateNode,
  canToggleNodeSelection,
  canRemoveNode,
}: BuildCanvasNodeContextMenuModelArgs): CanvasNodeContextMenuModel {
  const executionSelectionAction: CanvasNodeContextMenuAction | null = canToggleNodeSelection
    ? {
        id: selectedForExecution ? 'deselect-node-from-execution' : 'select-node-for-execution',
        label: selectedForExecution ? 'Deselect for execution' : 'Select for execution',
        intent: 'command',
        disabled: false,
      }
    : null;
  const executeActions: CanvasNodeContextMenuAction[] = [
    { ...NODE_CONTEXT_MENU_BASE_ACTIONS.previewNode },
    { ...NODE_CONTEXT_MENU_BASE_ACTIONS.runFromNode },
    ...(executionSelectionAction != null ? [executionSelectionAction] : []),
  ];

  const groups: CanvasNodeContextMenuActionGroup[] = [
    {
      id: 'configure',
      label: 'Configure',
      actions: [
        { ...NODE_CONTEXT_MENU_BASE_ACTIONS.editSql },
        buildOpenWorkbenchAction(canInspectNode),
      ].filter((action): action is CanvasNodeContextMenuAction => action != null),
    },
    {
      id: 'execute',
      label: 'Execute',
      actions: executeActions,
    },
  ];

  groups.push({
    id: 'lineage',
    label: 'Lineage',
    actions: [{ ...NODE_CONTEXT_MENU_BASE_ACTIONS.showLineage }],
  });

  groups.push(
    ...buildCanvasNodeModelerActionModel({
      target,
      selectedForExecution,
      canMutateGraph,
      canDuplicateNode,
      canToggleNodeSelection: false,
      canRemoveNode,
    }).actionGroups
  );

  return {
    target,
    actionGroups: groups,
  };
}
