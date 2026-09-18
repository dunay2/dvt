/** Owned concern: connect each relational truth state to its existing Transform action. */
import type { Edge } from '@xyflow/react';

import { readCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';

export function projectCanvasRelationalCompositionEdgeInteractions(args: {
  edges: readonly Edge[];
  relationalTreeTargetNodeIds: ReadonlySet<string>;
  onActivate: (targetNodeId: string) => void;
}): Edge[] {
  return args.edges.map((edge) => {
    const dependency = readCanvasDependencyEdgeData(edge.data);
    if (dependency?.composition?.role !== 'trunk-owner') {
      return edge;
    }
    const canInspect =
      (dependency.composition.state === 'pending' ||
        dependency.composition.state === 'canonical') &&
      args.relationalTreeTargetNodeIds.has(dependency.targetId);
    const onActivate = canInspect ? () => args.onActivate(dependency.targetId) : undefined;
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
