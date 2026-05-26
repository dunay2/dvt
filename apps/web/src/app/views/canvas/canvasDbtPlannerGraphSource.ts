/** Owned concern: project authored dbt canvas state into planner-generic-v1 graph source. */
import type { ExecutionSelection, GenericGraphSourceV1, GenericGraphNodeV1 } from '@dvt/contracts';
import { parseExecutionSelection } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';

export type DbtPlannerGraphSourceResult =
  | Readonly<{
      ok: true;
      graphSource: GenericGraphSourceV1;
      selection: ExecutionSelection;
      draftSignature: string;
    }>
  | Readonly<{
      ok: false;
      message: string;
    }>;

const EXECUTABLE_DBT_STEP_KIND_BY_NODE_KIND = {
  'dbt:model': 'DBT_MODEL',
  'dbt:test': 'DBT_TEST',
  'dbt:snapshot': 'DBT_SNAPSHOT',
} as const;

function resolveScopedNodeIds(
  nodes: readonly CanonicalNode[],
  scopedNodeIds: readonly string[]
): Set<string> {
  return scopedNodeIds.length > 0 ? new Set(scopedNodeIds) : new Set(nodes.map((node) => node.id));
}

function resolveDbtStepKind(node: CanonicalNode): string | null {
  if (node.pluginId !== 'dbt') {
    return null;
  }

  return (
    EXECUTABLE_DBT_STEP_KIND_BY_NODE_KIND[
      node.kind as keyof typeof EXECUTABLE_DBT_STEP_KIND_BY_NODE_KIND
    ] ?? null
  );
}

export function resolveDbtExecutionScopeNodeIds(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectedNodeIds: readonly string[];
  workspaceNodeIds: readonly string[];
}): string[] {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  const selectedExecutableNodeIds = args.selectedNodeIds.filter((nodeId) => {
    const node = nodeById.get(nodeId);
    return node != null && resolveDbtStepKind(node) !== null;
  });

  if (selectedExecutableNodeIds.length === 0) {
    return [...args.workspaceNodeIds];
  }

  const scopedNodeIdSet = new Set(args.selectedNodeIds);
  const visitExecutableUpstreamDependencies = (targetNodeId: string): void => {
    for (const edge of args.edges) {
      if (edge.targetId !== targetNodeId) {
        continue;
      }

      const sourceNode = nodeById.get(edge.sourceId);
      if (sourceNode == null || resolveDbtStepKind(sourceNode) === null) {
        continue;
      }

      if (!scopedNodeIdSet.has(edge.sourceId)) {
        scopedNodeIdSet.add(edge.sourceId);
        visitExecutableUpstreamDependencies(edge.sourceId);
      }
    }
  };

  for (const selectedNodeId of selectedExecutableNodeIds) {
    visitExecutableUpstreamDependencies(selectedNodeId);
  }

  return args.workspaceNodeIds.filter((nodeId) => scopedNodeIdSet.has(nodeId));
}

function resolveExecutableDbtNodes(args: {
  nodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): CanonicalNode[] {
  const scopedNodeIdSet = resolveScopedNodeIds(args.nodes, args.scopedNodeIds);
  return args.nodes.filter(
    (node) => scopedNodeIdSet.has(node.id) && resolveDbtStepKind(node) !== null
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
  const stepKind = resolveDbtStepKind(args.node);
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
    draftSignature: JSON.stringify({
      graphSource,
      selection,
    }),
  };
}
