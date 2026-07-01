/** Owned concern: project governed Canvas edge admission into passive port compatibility hints. */
import type { Edge } from '@xyflow/react';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import { buildGraphNodeTitlePresentation } from '../../plugins/graph/graphNodeTitlePresentation';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import type { CanonicalNode } from '../../types/canonical';
import { proposeConnection } from './canvasConnectionAggregate';

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

function toValidationEdges(
  visibleEdges: readonly { sourceId: string; targetId: string }[]
): Edge[] {
  return visibleEdges.map((edge) => ({
    id: `${edge.sourceId}->${edge.targetId}`,
    source: edge.sourceId,
    target: edge.targetId,
  }));
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
  const validationEdges = toValidationEdges(visibleEdges);
  const compatibilityByNodeId = new Map<string, MutableCompatibility>(
    visibleNodes.map((node) => [node.id, createEmptyCompatibility()])
  );

  for (const sourceNode of visibleNodes) {
    for (const targetNode of visibleNodes) {
      if (sourceNode.id === targetNode.id) {
        continue;
      }
      const sourceKindRegistration = resolveNodeKindRegistration(sourceNode.kind);
      const targetKindRegistration = resolveNodeKindRegistration(targetNode.kind);
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

      const proposedConnection = proposeConnection({
        connection: {
          source: sourceNode.id,
          sourceHandle: 'source',
          target: targetNode.id,
          targetHandle: 'target',
        },
        canonicalNodesById: new Map(visibleNodes.map((node) => [node.id, node])),
        edges: validationEdges,
        pluginPortMap,
      });

      if (proposedConnection.outcome !== 'allowed') {
        continue;
      }

      sourceCompatibility.sourceCompatibleNodeNames.push(resolveCompatibleNodeLabel(targetNode));
      targetCompatibility.targetCompatibleNodeNames.push(resolveCompatibleNodeLabel(sourceNode));
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
