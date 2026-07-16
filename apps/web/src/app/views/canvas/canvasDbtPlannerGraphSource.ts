/** Owned concern: project authored dbt canvas state into planner-generic-v1 graph source. */
import type { ExecutionSelection, GenericGraphSourceV1, GenericGraphNodeV1 } from '@dvt/contracts';
import { parseExecutionSelection } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveDbtExecutableStepKind, resolveDbtExecutionScope } from './dbtExecutionScopePolicy';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';

export type DbtPlannerGraphSourceResult =
  | Readonly<{
      ok: true;
      graphSource: GenericGraphSourceV1;
      selection: ExecutionSelection;
    }>
  | Readonly<{
      ok: false;
      message: string;
    }>;

function resolveScopedNodeIds(
  nodes: readonly CanonicalNode[],
  scopedNodeIds: readonly string[]
): Set<string> {
  return scopedNodeIds.length > 0 ? new Set(scopedNodeIds) : new Set(nodes.map((node) => node.id));
}

export function resolveDbtExecutionScopeNodeIds(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectedNodeIds: readonly string[];
  workspaceNodeIds: readonly string[];
}) {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  const executableNodeIds = args.workspaceNodeIds.filter((nodeId) => {
    const node = nodeById.get(nodeId);
    return node != null && resolveDbtExecutableStepKind(node) !== null;
  });
  const executableNodeIdSet = new Set(executableNodeIds);
  const dependencyIdsByNodeId = new Map<string, string[]>();

  for (const edge of args.edges) {
    if (!executableNodeIdSet.has(edge.sourceId) || !executableNodeIdSet.has(edge.targetId))
      continue;
    const dependencyIds = dependencyIdsByNodeId.get(edge.targetId) ?? [];
    dependencyIds.push(edge.sourceId);
    dependencyIdsByNodeId.set(edge.targetId, dependencyIds);
  }

  return resolveDbtExecutionScope({
    selectedNodeIds: args.selectedNodeIds,
    workspaceNodeIds: args.workspaceNodeIds,
    executableNodeIds,
    dependencyIdsByNodeId,
  });
}

function resolveExecutableDbtNodes(args: {
  nodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): CanonicalNode[] {
  const scopedNodeIdSet = resolveScopedNodeIds(args.nodes, args.scopedNodeIds);
  return args.nodes.filter(
    (node) => scopedNodeIdSet.has(node.id) && resolveDbtExecutableStepKind(node) !== null
  );
}

function resolveExecutableDependencies(args: {
  node: CanonicalNode;
  edges: readonly CanonicalEdge[];
  executableNodeIdSet: ReadonlySet<string>;
}): string[] {
  return args.edges
    .filter(
      (edge) =>
        edge.targetId === args.node.id &&
        args.executableNodeIdSet.has(edge.sourceId) &&
        args.executableNodeIdSet.has(edge.targetId)
    )
    .map((edge) => edge.sourceId)
    .sort();
}

function buildGenericGraphNode(args: {
  node: CanonicalNode;
  edges: readonly CanonicalEdge[];
  executableNodeIdSet: ReadonlySet<string>;
}): GenericGraphNodeV1 {
  const stepKind = resolveDbtExecutableStepKind(args.node);
  if (stepKind == null) {
    throw new Error(`Node ${args.node.id} is not an executable dbt node.`);
  }

  const nodeMetadata = createDbtNodeAuthoringMetadata(args.node);
  return {
    nodeId: args.node.id,
    stepKind,
    dependsOn: resolveExecutableDependencies(args),
    metadata: {
      displayName: args.node.name,
      ...(nodeMetadata.selectedSourceId
        ? {
            sourceRef: nodeMetadata.selectedSourceId,
          }
        : {}),
      tags: {
        kind: args.node.kind,
        pluginId: args.node.pluginId,
        role: args.node.role,
      },
    },
  };
}

export function buildDbtPlannerGraphSource(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
}): DbtPlannerGraphSourceResult {
  const executableNodes = resolveExecutableDbtNodes({
    nodes: args.nodes,
    scopedNodeIds: args.scopedNodeIds,
  });

  if (executableNodes.length === 0) {
    return {
      ok: false,
      message: 'DBT plan requires at least one model, test, or snapshot node.',
    };
  }

  const executableNodeIdSet = new Set(executableNodes.map((node) => node.id));
  const graphNodes = executableNodes.map((node) =>
    buildGenericGraphNode({
      node,
      edges: args.edges,
      executableNodeIdSet,
    })
  );
  const selection = parseExecutionSelection({
    mode: 'explicit',
    nodeIds: graphNodes.map((node) => node.nodeId),
  });
  const graphSource: GenericGraphSourceV1 = {
    kind: 'generic-graph-v1',
    sourceFamily: 'dbt',
    sourceVersion: '1.0',
    nodes: graphNodes,
  };

  return {
    ok: true,
    graphSource,
    selection,
  };
}
