/** Owned concern: hydrate a discardable authoring session from one existing canonical JOIN. */
import { useCallback, useMemo, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasRelationalTreeAuthoringCandidates } from './canvasRelationalTreeAuthoringCandidates';
import { resolveCanvasRelationalTreeExistingJoinDraft } from './canvasRelationalTreeExistingJoinDraft';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import {
  resolveCanvasRelationalTreeSeedHydration,
  type CanvasRelationalTreeJoinSeedHydration,
} from './canvasRelationalTreeSeedHydration';
export type { CanvasRelationalTreeJoinSeedHydration } from './canvasRelationalTreeSeedHydration';

export function useCanvasRelationalTreeExistingJoinSeed(
  args: Readonly<{
    edges: readonly CanonicalEdge[];
    inputs: readonly CanvasDvtCompositionInput[];
    nodes: readonly CanonicalNode[];
    targetNodeId: string;
    document: SubstraitDocument | null;
    projection: CanvasRelationalTreeProjection | null;
    onHydrate: (seed: CanvasRelationalTreeJoinSeedHydration) => void;
  }>
) {
  const { edges, inputs, nodes, onHydrate, targetNodeId, document, projection } = args;
  const [baselineDraft, setBaselineDraft] = useState<DvtSubstraitJoinDraft | null>(null);
  const seed = useMemo(
    () => resolveCanvasRelationalTreeExistingJoinDraft({ document, projection }),
    [projection, document]
  );

  const hydrateExistingJoin = useCallback(
    (requestedInputId?: string): boolean => {
      if (seed == null) return false;
      setBaselineDraft(seed.draft);
      const appendInputId =
        requestedInputId == null
          ? null
          : (resolveCanvasRelationalTreeAuthoringCandidates({
              operation: seed.operation,
              inputs,
              selectedInputIds: seed.inputIds,
              joinDraft: seed.draft,
              targetNodeId,
              nodes,
              edges,
            }).find((item) => item.nodeId === requestedInputId && item.selectable)?.nodeId ?? null);
      onHydrate(
        resolveCanvasRelationalTreeSeedHydration({
          seed: { ...seed, appendInputId: null },
          appendInputId,
          inputs,
        })
      );
      return true;
    },
    [edges, inputs, nodes, onHydrate, seed, targetNodeId]
  );
  return { hydrateExistingJoin, baselineDraft, seed };
}
