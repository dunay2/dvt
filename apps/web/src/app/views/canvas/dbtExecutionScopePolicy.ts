import type { ExecutionSelection, GenericGraphSourceV1 } from '@dvt/contracts';
import {
  ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND,
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { isObjectFilePostgresNode } from './objectFilePostgresAuthoringModel';
import { isHttpJsonArtifactNode } from './httpJsonArtifactAuthoringModel';
import {
  createCanvasExecutionSelectionIntent,
  type CanvasExecutionSelectionIntent,
} from '../../types/canvasExecutionSelection';
import {
  buildExecutableScopeGraph,
  buildExecutionIntentDraftSignature,
  EXECUTION_SCOPE_REJECTION,
  resolveExecutableScope,
  type ExecutableScopeGraph,
  type ExecutableScopeResolution,
} from './canvasExecutionScopePolicy';

/** Owned concern: preserve DBT execution-selection intent while deriving executable scope. */
export const DBT_EXECUTION_SCOPE_REJECTION = EXECUTION_SCOPE_REJECTION;

export const DBT_EXECUTABLE_STEP_KIND_BY_NODE_KIND = {
  'dbt:model': 'DBT_MODEL',
  'dbt:test': 'DBT_TEST',
  'dbt:snapshot': 'DBT_SNAPSHOT',
} as const;

export function resolveDbtExecutableStepKind(node: Pick<CanonicalNode, 'pluginId' | 'kind'>) {
  if (isHttpJsonArtifactNode(node)) {
    return ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND;
  }
  if (isObjectFilePostgresNode(node)) {
    return LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND;
  }
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

export type DbtExecutionScopeResolution = ExecutableScopeResolution;
export type DbtExecutionScopeGraph = ExecutableScopeGraph;

export function buildDbtExecutionScopeGraph(args: {
  readonly nodes: readonly Pick<CanonicalNode, 'id' | 'pluginId' | 'kind'>[];
  readonly edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  readonly workspaceNodeIds: readonly string[];
}): DbtExecutionScopeGraph {
  return buildExecutableScopeGraph({
    ...args,
    isExecutableNode: isDbtExecutionSelectableNode,
  });
}

export function buildDbtExecutionIntentDraftSignature(args: {
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: ExecutionSelection;
  readonly selectionMode: CanvasExecutionSelectionIntent['mode'];
  readonly requestedRootNodeIds: readonly string[];
}): string {
  return buildExecutionIntentDraftSignature(args);
}

export function resolveDbtExecutionScope(args: {
  readonly selectionIntent: CanvasExecutionSelectionIntent;
  readonly workspaceNodeIds: readonly string[];
  readonly executableNodeIds: readonly string[];
  readonly dependencyIdsByNodeId: ReadonlyMap<string, readonly string[]>;
}): DbtExecutionScopeResolution {
  return resolveExecutableScope(args);
}

export function applyDbtExecutionSelectionToggle(args: {
  readonly requestedNodeIds: readonly string[];
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

  return createCanvasExecutionSelectionIntent([...requestedNodeIds, args.nodeId], 'explicit');
}

export function reconcileDbtExecutionSelectionVisibleSubset(args: {
  readonly requestedNodeIds: readonly string[];
  readonly visibleNodeIds: readonly string[];
  readonly nextSelectedNodeIds: readonly string[];
}): CanvasExecutionSelectionIntent {
  const visibleNodeIdSet = new Set(args.visibleNodeIds);
  const hiddenRequestedNodeIds = [...new Set(args.requestedNodeIds)].filter(
    (nodeId) => !visibleNodeIdSet.has(nodeId)
  );

  return createCanvasExecutionSelectionIntent(
    [...hiddenRequestedNodeIds, ...args.nextSelectedNodeIds],
    'explicit'
  );
}
