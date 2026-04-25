/** Owned concern: derive semantic duplicate-node commands from a source node and current graph state. */

import type { Node } from '@xyflow/react';

import type { CanonicalNode } from '../../types/canonical';
import { toCanvasAuthoringMetadata } from './canvasAuthoringMetadata';
import { dropCanonicalNode } from './canvasNodeDropAggregate';

type BuildDuplicateNodeCommandArgs = Readonly<{
  sourceNode: Node;
  sourceCanonicalNode: CanonicalNode;
  existingNodes: readonly Node[];
}>;

type CanvasDuplicateNodeCommand = Readonly<{
  canonicalNode: CanonicalNode;
  position: { x: number; y: number };
}>;

type ResolveCanvasNodeDuplicateTransactionArgs = Readonly<{
  nodeId: string;
  sourceCanonicalNode: CanonicalNode | null;
  existingNodes: readonly Node[];
  columnLevelLineageEnabled: boolean;
}>;

export type CanvasNodeDuplicateTransaction =
  | Readonly<{
      outcome: 'added';
      canonicalNode: CanonicalNode;
      nextNodes: Node[];
    }>
  | Readonly<{
      outcome: 'noop';
      reason: string;
    }>
  | Readonly<{
      outcome: 'missing_source_node';
    }>;

function resolveNextDuplicateIndex(sourceNodeId: string, existingNodes: readonly Node[]): number {
  const existingIds = new Set(existingNodes.map((node) => node.id));
  let nextIndex = 1;

  while (existingIds.has(`${sourceNodeId}-copy-${nextIndex}`)) {
    nextIndex += 1;
  }

  return nextIndex;
}

export function buildDuplicateNodeCommand({
  sourceNode,
  sourceCanonicalNode,
  existingNodes,
}: BuildDuplicateNodeCommandArgs): CanvasDuplicateNodeCommand {
  const nextIndex = resolveNextDuplicateIndex(sourceNode.id, existingNodes);

  return {
    canonicalNode: {
      id: `${sourceNode.id}-copy-${nextIndex}`,
      name: `${sourceCanonicalNode.name} (copy ${nextIndex})`,
      pluginId: sourceCanonicalNode.pluginId,
      kind: sourceCanonicalNode.kind,
      role: sourceCanonicalNode.role,
      status: 'idle',
      tags: [...sourceCanonicalNode.tags],
      path: sourceCanonicalNode.path,
      description: sourceCanonicalNode.description,
      metadata: toCanvasAuthoringMetadata(sourceCanonicalNode.metadata),
    },
    position: {
      x: sourceNode.position.x + 48 * nextIndex,
      y: sourceNode.position.y + 48 * nextIndex,
    },
  };
}

export function resolveCanvasNodeDuplicateTransaction({
  nodeId,
  sourceCanonicalNode,
  existingNodes,
  columnLevelLineageEnabled,
}: ResolveCanvasNodeDuplicateTransactionArgs): CanvasNodeDuplicateTransaction {
  const sourceNode = existingNodes.find((candidate) => candidate.id === nodeId);
  if (sourceCanonicalNode == null || sourceNode == null) {
    return { outcome: 'missing_source_node' };
  }

  const { canonicalNode, position } = buildDuplicateNodeCommand({
    sourceNode,
    sourceCanonicalNode,
    existingNodes,
  });
  const dropResult = dropCanonicalNode({
    canonicalNode,
    position,
    nodes: [...existingNodes],
    columnLevelLineageEnabled,
  });

  switch (dropResult.outcome) {
    case 'added':
      return {
        outcome: 'added',
        canonicalNode,
        nextNodes: dropResult.nextNodes,
      };
    case 'noop':
      return {
        outcome: 'noop',
        reason: dropResult.reason,
      };
  }
}
