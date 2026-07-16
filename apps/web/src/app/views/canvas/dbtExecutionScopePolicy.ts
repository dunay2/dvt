import type { ExecutionSelection, GenericGraphSourceV1 } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import {
  createCanvasExecutionSelectionIntent,
  type CanvasExecutionSelectionIntent,
} from '../../types/canvasExecutionSelection';

/** Owned concern: preserve DBT execution-selection intent while deriving executable scope. */
export const DBT_EXECUTION_SCOPE_REJECTION = {
  explicitSelectionIsEmpty: 'explicit_selection_is_empty',
  explicitSelectionContainsUnavailableOrNonExecutableNodes:
    'explicit_selection_contains_unavailable_or_non_executable_nodes',
} as const;

export const DBT_EXECUTABLE_STEP_KIND_BY_NODE_KIND = {
  'dbt:model': 'DBT_MODEL',
  'dbt:test': 'DBT_TEST',
  'dbt:snapshot': 'DBT_SNAPSHOT',
} as const;

export function resolveDbtExecutableStepKind(node: Pick<CanonicalNode, 'pluginId' | 'kind'>) {
  if (node.pluginId !== 'dbt') return null;

  return (
    DBT_EXECUTABLE_STEP_KIND_BY_NODE_KIND[
      node.kind as keyof typeof DBT_EXECUTABLE_STEP_KIND_BY_NODE_KIND
    ] ?? null
  );
}

export function isDbtExecutionSelectableNode(
  node: Pick<CanonicalNode, 'pluginId' | 'kind'>
): boolean {
  return resolveDbtExecutableStepKind(node) !== null;
}

export function canOfferDbtExecutionSelectionToggle(args: {
  readonly isExecutableRoot: boolean;
  readonly selectedForExecution: boolean;
}): boolean {
  return args.isExecutableRoot || args.selectedForExecution;
}

export type DbtExecutionScopeResolution =
  | {
      readonly ok: true;
      readonly selectionMode: CanvasExecutionSelectionIntent['mode'];
      readonly requestedRootNodeIds: readonly string[];
      readonly derivedDependencyNodeIds: readonly string[];
      readonly nodeIds: readonly string[];
    }
  | {
      readonly ok: false;
      readonly cause: (typeof DBT_EXECUTION_SCOPE_REJECTION)[keyof typeof DBT_EXECUTION_SCOPE_REJECTION];
      readonly invalidNodeIds: readonly string[];
    };

export function buildDbtExecutionIntentDraftSignature(args: {
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

export function resolveDbtExecutionScope(args: {
  readonly selectionIntent: CanvasExecutionSelectionIntent;
  readonly workspaceNodeIds: readonly string[];
  readonly executableNodeIds: readonly string[];
  readonly dependencyIdsByNodeId: ReadonlyMap<string, readonly string[]>;
}): DbtExecutionScopeResolution {
  const executableNodeIds = [...new Set(args.executableNodeIds)];
  const executableNodeIdSet = new Set(executableNodeIds);
  const hasExplicitSelection = args.selectionIntent.mode === 'explicit';

  if (hasExplicitSelection && args.selectionIntent.nodeIds.length === 0) {
    return {
      ok: false,
      cause: DBT_EXECUTION_SCOPE_REJECTION.explicitSelectionIsEmpty,
      invalidNodeIds: [],
    };
  }

  const requestedNodeIds = [
    ...new Set(hasExplicitSelection ? args.selectionIntent.nodeIds : args.workspaceNodeIds),
  ];
  const invalidNodeIds = hasExplicitSelection
    ? requestedNodeIds.filter((nodeId) => !executableNodeIdSet.has(nodeId))
    : [];

  if (invalidNodeIds.length > 0) {
    return {
      ok: false,
      cause: DBT_EXECUTION_SCOPE_REJECTION.explicitSelectionContainsUnavailableOrNonExecutableNodes,
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

export function applyDbtExecutionSelectionToggle(args: {
  readonly requestedNodeIds: readonly string[];
  readonly visibleNodeIds: readonly string[];
  readonly nodeId: string;
  readonly shouldSelect: boolean;
}): CanvasExecutionSelectionIntent {
  const requestedNodeIds = [...new Set(args.requestedNodeIds)];

  if (!args.shouldSelect) {
    return createCanvasExecutionSelectionIntent(
      requestedNodeIds.filter((nodeId) => nodeId !== args.nodeId),
      'explicit'
    );
  }

  if (requestedNodeIds.includes(args.nodeId)) {
    return createCanvasExecutionSelectionIntent(requestedNodeIds, 'explicit');
  }

  const visibleNodeIdSet = new Set(args.visibleNodeIds);
  const hasVisibleRequestedNode = requestedNodeIds.some((nodeId) => visibleNodeIdSet.has(nodeId));
  if (
    requestedNodeIds.length > 0 &&
    !hasVisibleRequestedNode &&
    visibleNodeIdSet.has(args.nodeId)
  ) {
    return createCanvasExecutionSelectionIntent([args.nodeId], 'explicit');
  }

  return createCanvasExecutionSelectionIntent([...requestedNodeIds, args.nodeId], 'explicit');
}
