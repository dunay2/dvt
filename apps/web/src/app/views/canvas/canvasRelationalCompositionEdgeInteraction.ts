/** Owned concern: connect the converged relational badge to its existing Transform action. */
import type { Edge } from '@xyflow/react';

import { readCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';

export function projectCanvasRelationalCompositionEdgeInteractions(args: {
  edges: readonly Edge[];
  interactiveTargetNodeIds: ReadonlySet<string>;
  onActivate: (targetNodeId: string) => void;
}): Edge[] {
  return args.edges.map((edge) => {
    const dependency = readCanvasDependencyEdgeData(edge.data);
    if (
      dependency?.composition?.role !== 'trunk-owner' ||
      !args.interactiveTargetNodeIds.has(dependency.targetId)
    ) {
      return edge;
    }

    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        composition: {
          ...dependency.composition,
          onActivate: () => args.onActivate(dependency.targetId),
        },
      },
    };
  });
}
