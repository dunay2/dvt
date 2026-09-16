/** Owned concern: connect each relational truth state to its existing Transform action. */
import type { Edge, Node } from '@xyflow/react';

import { readCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';

export function projectCanvasRelationalCompositionEdgeInteractions(args: {
  edges: readonly Edge[];
  nodes: readonly Node[];
  canonicalTargetNodeIds: ReadonlySet<string>;
  onActivateCanonical: (targetNodeId: string) => void;
}): Edge[] {
  const nodesById = new Map(args.nodes.map((node) => [node.id, node]));

  return args.edges.map((edge) => {
    const dependency = readCanvasDependencyEdgeData(edge.data);
    if (dependency?.composition?.role !== 'trunk-owner') {
      return edge;
    }
    const targetNode = nodesById.get(dependency.targetId);
    const inspectNode = (
      targetNode?.data as {
        onInspectNode?: (nodeId: string, preferredTabId?: 'code') => void;
      }
    )?.onInspectNode;
    const onActivate =
      dependency.composition.state === 'canonical'
        ? args.canonicalTargetNodeIds.has(dependency.targetId)
          ? () => args.onActivateCanonical(dependency.targetId)
          : undefined
        : dependency.composition.state === 'pending' && typeof inspectNode === 'function'
          ? () => inspectNode(dependency.targetId, 'code')
          : undefined;
    if (onActivate == null) {
      return edge;
    }

    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        composition: {
          ...dependency.composition,
          onActivate,
        },
      },
    };
  });
}
