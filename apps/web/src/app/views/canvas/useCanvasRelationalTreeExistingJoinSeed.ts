/** Owned concern: hydrate a discardable authoring session from one existing canonical JOIN. */
import { useCallback, useMemo } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasRelationalTreeAuthoringCandidates } from './canvasRelationalTreeAuthoringModel';
import { resolveCanvasRelationalTreeExistingJoinDraft } from './canvasRelationalTreeExistingJoinDraft';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';

export type CanvasRelationalTreeJoinSeedHydration = Readonly<{
  draft: DvtSubstraitInnerJoinDraft;
  inputIds: readonly string[];
  appendInputId: string | null;
}>;

export function useCanvasRelationalTreeExistingJoinSeed(
  args: Readonly<{
    edges: readonly CanonicalEdge[];
    inputs: readonly CanvasDvtCompositionInput[];
    nodes: readonly CanonicalNode[];
    targetNodeId: string;
    transformNode: CanonicalNode;
    onHydrate: (seed: CanvasRelationalTreeJoinSeedHydration) => void;
  }>
) {
  const { edges, inputs, nodes, onHydrate, targetNodeId, transformNode } = args;
  const seed = useMemo(
    () =>
      resolveCanvasRelationalTreeExistingJoinDraft({
        transformNode,
        nodes,
        edges,
      }),
    [edges, nodes, transformNode]
  );

  return useCallback(
    (requestedInputId?: string): boolean => {
      if (seed == null) return false;
      const appendInputId =
        requestedInputId == null
          ? null
          : (resolveCanvasRelationalTreeAuthoringCandidates({
              operation: 'inner_join',
              inputs,
              selectedInputIds: seed.inputIds,
              joinDraft: seed.draft,
              targetNodeId,
              nodes,
              edges,
            }).find((item) => item.nodeId === requestedInputId && item.selectable)?.nodeId ?? null);
      onHydrate({ ...seed, appendInputId });
      return true;
    },
    [edges, inputs, nodes, onHydrate, seed, targetNodeId]
  );
}
