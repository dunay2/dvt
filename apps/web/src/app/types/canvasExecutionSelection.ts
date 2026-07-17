/** Closed route-local state before selection intent becomes an execution contract. */
export type CanvasExecutionSelectionIntent =
  | {
      readonly mode: 'workspace';
      readonly nodeIds: [];
    }
  | {
      readonly mode: 'explicit';
      readonly nodeIds: string[];
    };

export function createCanvasExecutionSelectionIntent(
  nodeIds: readonly string[],
  requestedMode: CanvasExecutionSelectionIntent['mode'] = nodeIds.length > 0
    ? 'explicit'
    : 'workspace'
): CanvasExecutionSelectionIntent {
  const uniqueNodeIds = [...new Set(nodeIds)];

  if (requestedMode === 'workspace') {
    if (uniqueNodeIds.length > 0) {
      throw new Error('Workspace selection intent cannot contain requested node ids.');
    }

    return { mode: 'workspace', nodeIds: [] };
  }

  return { mode: 'explicit', nodeIds: uniqueNodeIds };
}
