/** Owned concern: derive explicit/workspace executable scope without plugin-specific semantics. */
import type { ExecutionSelection, GenericGraphSourceV1 } from '@dvt/contracts';

import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export const EXECUTION_SCOPE_REJECTION = {
  explicitSelectionIsEmpty: 'explicit_selection_is_empty',
  explicitSelectionContainsUnavailableOrNonExecutableNodes:
    'explicit_selection_contains_unavailable_or_non_executable_nodes',
} as const;

export type ExecutableScopeGraph = Readonly<{
  executableNodeIds: readonly string[];
  dependencyIdsByNodeId: ReadonlyMap<string, readonly string[]>;
}>;

export type ExecutableScopeResolution =
  | Readonly<{
      ok: true;
      selectionMode: CanvasExecutionSelectionIntent['mode'];
      requestedRootNodeIds: readonly string[];
      derivedDependencyNodeIds: readonly string[];
      nodeIds: readonly string[];
    }>
  | Readonly<{
      ok: false;
      cause: (typeof EXECUTION_SCOPE_REJECTION)[keyof typeof EXECUTION_SCOPE_REJECTION];
      invalidNodeIds: readonly string[];
    }>;

export function buildExecutableScopeGraph(args: {
  readonly nodes: readonly Pick<CanonicalNode, 'id' | 'pluginId' | 'kind'>[];
  readonly edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  readonly workspaceNodeIds: readonly string[];
  readonly isExecutableNode: (
    node: Pick<CanonicalNode, 'id' | 'pluginId' | 'kind'>
  ) => boolean;
}): ExecutableScopeGraph {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  const executableNodeIds = [...new Set(args.workspaceNodeIds)].filter((nodeId) => {
    const node = nodeById.get(nodeId);
    return node != null && args.isExecutableNode(node);
  });
  const executableNodeIdSet = new Set(executableNodeIds);
  const dependencyIdsByNodeId = new Map<string, string[]>();

  for (const edge of args.edges) {
    if (!executableNodeIdSet.has(edge.sourceId) || !executableNodeIdSet.has(edge.targetId)) continue;
    const dependencies = dependencyIdsByNodeId.get(edge.targetId) ?? [];
    if (!dependencies.includes(edge.sourceId)) dependencies.push(edge.sourceId);
    dependencyIdsByNodeId.set(edge.targetId, dependencies);
  }
  for (const dependencies of dependencyIdsByNodeId.values()) dependencies.sort();
  return { executableNodeIds, dependencyIdsByNodeId };
}

export function resolveExecutableScope(args: {
  readonly selectionIntent: CanvasExecutionSelectionIntent;
  readonly workspaceNodeIds: readonly string[];
  readonly executableNodeIds: readonly string[];
  readonly dependencyIdsByNodeId: ReadonlyMap<string, readonly string[]>;
}): ExecutableScopeResolution {
  const executableNodeIds = [...new Set(args.executableNodeIds)];
  const executableNodeIdSet = new Set(executableNodeIds);
  const explicit = args.selectionIntent.mode === 'explicit';

  if (explicit && args.selectionIntent.nodeIds.length === 0) {
    return {
      ok: false,
      cause: EXECUTION_SCOPE_REJECTION.explicitSelectionIsEmpty,
      invalidNodeIds: [],
    };
  }

  const requestedNodeIds = [
    ...new Set(explicit ? args.selectionIntent.nodeIds : args.workspaceNodeIds),
  ];
  const invalidNodeIds = explicit
    ? requestedNodeIds.filter((nodeId) => !executableNodeIdSet.has(nodeId))
    : [];
  if (invalidNodeIds.length > 0) {
    return {
      ok: false,
      cause: EXECUTION_SCOPE_REJECTION.explicitSelectionContainsUnavailableOrNonExecutableNodes,
      invalidNodeIds,
    };
  }

  const requestedRootNodeIds = requestedNodeIds.filter((nodeId) => executableNodeIdSet.has(nodeId));
  const scopedNodeIds = new Set(requestedRootNodeIds);
  const includeDependencies = (nodeId: string): void => {
    for (const dependencyId of args.dependencyIdsByNodeId.get(nodeId) ?? []) {
      if (!executableNodeIdSet.has(dependencyId) || scopedNodeIds.has(dependencyId)) continue;
      scopedNodeIds.add(dependencyId);
      includeDependencies(dependencyId);
    }
  };
  for (const nodeId of requestedRootNodeIds) includeDependencies(nodeId);

  const requestedRootNodeIdSet = new Set(requestedRootNodeIds);
  const nodeIds = executableNodeIds.filter((nodeId) => scopedNodeIds.has(nodeId));
  return {
    ok: true,
    selectionMode: args.selectionIntent.mode,
    requestedRootNodeIds: executableNodeIds.filter((nodeId) => requestedRootNodeIdSet.has(nodeId)),
    derivedDependencyNodeIds: nodeIds.filter((nodeId) => !requestedRootNodeIdSet.has(nodeId)),
    nodeIds,
  };
}

export function buildExecutionIntentDraftSignature(args: {
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: ExecutionSelection;
  readonly selectionMode: CanvasExecutionSelectionIntent['mode'];
  readonly requestedRootNodeIds: readonly string[];
}): string {
  return JSON.stringify({
    graphSource: args.graphSource,
    selection: args.selection,
    selectionIntent: {
      mode: args.selectionMode,
      requestedRootNodeIds: [...new Set(args.requestedRootNodeIds)].sort(),
    },
  });
}
