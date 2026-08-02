/** Owned concern: project governed Canvas edge admission into passive port compatibility hints. */
import {
  evaluateConnectionPolicy,
  type PluginPortMap,
} from '../../plugins/contracts/ConnectionRules';
import { buildGraphNodeTitlePresentation } from '../../plugins/graph/graphNodeTitlePresentation';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import type { CanonicalNode } from '../../types/canonical';

export type CanvasNodePortCompatibilityState = 'available' | 'blocked' | 'unavailable';

export type CanvasNodePortCompatibility = Readonly<{
  state: CanvasNodePortCompatibilityState;
  compatibleNodeNames: readonly string[];
}>;

export type CanvasNodePortCompatibilityByDirection = Readonly<{
  source: CanvasNodePortCompatibility;
  target: CanvasNodePortCompatibility;
}>;

type BuildCanvasConnectionCompatibilityArgs = Readonly<{
  visibleNodeIds: readonly string[];
  visibleEdges: readonly { sourceId: string; targetId: string }[];
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  pluginPortMap: PluginPortMap;
}>;

type MutableCompatibility = {
  sourceCompatibleNodeNames: string[];
  targetCompatibleNodeNames: string[];
  sourceCandidateCount: number;
  targetCandidateCount: number;
};

type GraphAdjacency = ReadonlyMap<string, readonly string[]>;

function buildForwardAdjacency(
  visibleEdges: readonly { sourceId: string; targetId: string }[]
): GraphAdjacency {
  const adjacency = new Map<string, string[]>();
  for (const edge of visibleEdges) {
    const targets = adjacency.get(edge.sourceId);
    if (targets) {
      targets.push(edge.targetId);
    } else {
      adjacency.set(edge.sourceId, [edge.targetId]);
    }
  }
  return adjacency;
}

function collectReachableNodeIds(startId: string, adjacency: GraphAdjacency): ReadonlySet<string> {
  const reachable = new Set<string>();
  const queue = [startId];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === undefined) {
      continue;
    }
    for (const targetId of adjacency.get(current) ?? []) {
      if (reachable.has(targetId)) {
        continue;
      }
      reachable.add(targetId);
      queue.push(targetId);
    }
  }

  return reachable;
}

function edgeSignature(sourceId: string, targetId: string): string {
  return `${sourceId}\u0000${targetId}`;
}

function resolveState(
  candidateCount: number,
  compatibleCount: number
): CanvasNodePortCompatibilityState {
  if (compatibleCount > 0) {
    return 'available';
  }
  return candidateCount > 0 ? 'blocked' : 'unavailable';
}

function toCompatibility(
  candidateCount: number,
  compatibleNodeNames: readonly string[]
): CanvasNodePortCompatibility {
  return {
    state: resolveState(candidateCount, compatibleNodeNames.length),
    compatibleNodeNames,
  };
}

function createEmptyCompatibility(): MutableCompatibility {
  return {
    sourceCompatibleNodeNames: [],
    targetCompatibleNodeNames: [],
    sourceCandidateCount: 0,
    targetCandidateCount: 0,
  };
}

function resolveCompatibleNodeLabel(node: CanonicalNode): string {
  return buildGraphNodeTitlePresentation({
    nodeName: node.name,
    pluginId: node.pluginId,
    kind: node.kind,
    metadata: node.metadata ?? {},
  }).title;
}

export function buildCanvasConnectionCompatibilityByNodeId({
  visibleNodeIds,
  visibleEdges,
  canonicalNodesById,
  pluginPortMap,
}: BuildCanvasConnectionCompatibilityArgs): ReadonlyMap<
  string,
  CanvasNodePortCompatibilityByDirection
> {
  const visibleNodes = visibleNodeIds
    .map((nodeId) => canonicalNodesById.get(nodeId))
    .filter((node): node is CanonicalNode => node != null);
  const nodeRegistrationById = new Map(
    visibleNodes.map((node) => [node.id, resolveNodeKindRegistration(node.kind)])
  );
  const nodeLabelById = new Map(
    visibleNodes.map((node) => [node.id, resolveCompatibleNodeLabel(node)])
  );
  const existingEdgeSignatures = new Set(
    visibleEdges.map((edge) => edgeSignature(edge.sourceId, edge.targetId))
  );
  const forwardAdjacency = buildForwardAdjacency(visibleEdges);
  const reachableByStartId = new Map<string, ReadonlySet<string>>();
  const compatibilityByNodeId = new Map<string, MutableCompatibility>(
    visibleNodes.map((node) => [node.id, createEmptyCompatibility()])
  );

  for (const sourceNode of visibleNodes) {
    for (const targetNode of visibleNodes) {
      if (sourceNode.id === targetNode.id) {
        continue;
      }
      const sourceKindRegistration = nodeRegistrationById.get(sourceNode.id);
      const targetKindRegistration = nodeRegistrationById.get(targetNode.id);
      if (sourceKindRegistration == null || targetKindRegistration == null) {
        continue;
      }
      if (!sourceKindRegistration.allowsOutgoing || !targetKindRegistration.allowsIncoming) {
        continue;
      }

      const sourceCompatibility = compatibilityByNodeId.get(sourceNode.id);
      const targetCompatibility = compatibilityByNodeId.get(targetNode.id);
      if (sourceCompatibility == null || targetCompatibility == null) {
        continue;
      }

      sourceCompatibility.sourceCandidateCount += 1;
      targetCompatibility.targetCandidateCount += 1;

      if (existingEdgeSignatures.has(edgeSignature(sourceNode.id, targetNode.id))) {
        continue;
      }
      let reachableFromTarget = reachableByStartId.get(targetNode.id);
      if (reachableFromTarget == null) {
        reachableFromTarget = collectReachableNodeIds(targetNode.id, forwardAdjacency);
        reachableByStartId.set(targetNode.id, reachableFromTarget);
      }
      if (reachableFromTarget.has(sourceNode.id)) {
        continue;
      }
      if (sourceNode.pluginId !== targetNode.pluginId && targetNode.role === 'input') {
        continue;
      }
      if (!evaluateConnectionPolicy(sourceNode, targetNode, pluginPortMap).allowed) {
        continue;
      }

      const targetLabel = nodeLabelById.get(targetNode.id);
      const sourceLabel = nodeLabelById.get(sourceNode.id);
      if (targetLabel != null) {
        sourceCompatibility.sourceCompatibleNodeNames.push(targetLabel);
      }
      if (sourceLabel != null) {
        targetCompatibility.targetCompatibleNodeNames.push(sourceLabel);
      }
    }
  }

  return new Map(
    Array.from(compatibilityByNodeId.entries()).map(([nodeId, compatibility]) => [
      nodeId,
      {
        source: toCompatibility(
          compatibility.sourceCandidateCount,
          compatibility.sourceCompatibleNodeNames
        ),
        target: toCompatibility(
          compatibility.targetCandidateCount,
          compatibility.targetCompatibleNodeNames
        ),
      },
    ])
  );
}
