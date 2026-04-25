/** Owned concern: derive semantic duplicate-node commands from a source node and current graph state. */

import type { Node } from '@xyflow/react';

import type { CanonicalNode } from '../../types/canonical';

type BuildDuplicateNodeCommandArgs = Readonly<{
  sourceNode: Node;
  sourceCanonicalNode: CanonicalNode;
  existingNodes: readonly Node[];
}>;

type CanvasDuplicateNodeCommand = Readonly<{
  canonicalNode: CanonicalNode;
  position: { x: number; y: number };
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
      metadata:
        sourceCanonicalNode.metadata == null ? undefined : { ...sourceCanonicalNode.metadata },
    },
    position: {
      x: sourceNode.position.x + 48 * nextIndex,
      y: sourceNode.position.y + 48 * nextIndex,
    },
  };
}
