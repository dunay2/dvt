/** Owned concern: preserve DBT execution-selection intent while deriving executable scope. */
export const DBT_EXECUTION_SCOPE_REJECTION = {
  explicitSelectionHasNoExecutableNodes: 'explicit_selection_has_no_executable_nodes',
} as const;

export type DbtExecutionScopeResolution =
  | {
      readonly ok: true;
      readonly nodeIds: readonly string[];
    }
  | {
      readonly ok: false;
      readonly cause: (typeof DBT_EXECUTION_SCOPE_REJECTION)[keyof typeof DBT_EXECUTION_SCOPE_REJECTION];
    };

export function resolveDbtExecutionScope(args: {
  readonly selectedNodeIds: readonly string[];
  readonly workspaceNodeIds: readonly string[];
  readonly executableNodeIds: readonly string[];
  readonly dependencyIdsByNodeId: ReadonlyMap<string, readonly string[]>;
}): DbtExecutionScopeResolution {
  const executableNodeIds = [...new Set(args.executableNodeIds)];
  const executableNodeIdSet = new Set(executableNodeIds);
  const hasExplicitSelection = args.selectedNodeIds.length > 0;
  const requestedNodeIds = hasExplicitSelection ? args.selectedNodeIds : args.workspaceNodeIds;
  const executableRoots = requestedNodeIds.filter((nodeId) => executableNodeIdSet.has(nodeId));

  if (hasExplicitSelection && executableRoots.length === 0) {
    return {
      ok: false,
      cause: DBT_EXECUTION_SCOPE_REJECTION.explicitSelectionHasNoExecutableNodes,
    };
  }

  const scopedNodeIds = new Set(executableRoots);
  const includeDependencies = (nodeId: string): void => {
    for (const dependencyId of args.dependencyIdsByNodeId.get(nodeId) ?? []) {
      if (!executableNodeIdSet.has(dependencyId) || scopedNodeIds.has(dependencyId)) continue;
      scopedNodeIds.add(dependencyId);
      includeDependencies(dependencyId);
    }
  };

  for (const nodeId of executableRoots) includeDependencies(nodeId);

  return {
    ok: true,
    nodeIds: executableNodeIds.filter((nodeId) => scopedNodeIds.has(nodeId)),
  };
}
