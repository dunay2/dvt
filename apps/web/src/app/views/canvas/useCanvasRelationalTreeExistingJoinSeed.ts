/** Owned concern: hydrate a discardable authoring session from one existing canonical JOIN. */
import { useCallback, useMemo, useState } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasRelationalTreeAuthoringCandidates } from './canvasRelationalTreeAuthoringModel';
import { resolveCanvasRelationalTreeExistingJoinDraft } from './canvasRelationalTreeExistingJoinDraft';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { appendDvtSubstraitUnionAllInput } from './canvasDvtSubstraitSetComposition';

export type CanvasRelationalTreeJoinSeedHydration = Readonly<{
  draft: DvtSubstraitJoinDraft;
  inputIds: readonly string[];
  appendInputId: string | null;
  operation: CanvasRelationalOperation;
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
  const [baselineDraft, setBaselineDraft] = useState<DvtSubstraitJoinDraft | null>(null);
  const seed = useMemo(
    () => resolveCanvasRelationalTreeExistingJoinDraft({ transformNode, nodes, edges }),
    [edges, nodes, transformNode]
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
      const input = inputs.find((candidate) => candidate.nodeId === appendInputId);
      if (seed.operation === 'projection') {
        onHydrate({
          ...seed,
          appendInputId: null,
          inputIds: input == null ? seed.inputIds : [...seed.inputIds, input.nodeId],
        });
      } else if (seed.operation === 'union_all' && input != null) {
        const draft = appendDvtSubstraitUnionAllInput(seed.draft, {
          ...input,
          fields: input.fields.map((field) => ({ name: field.name, type: 'string' })),
        });
        onHydrate({
          ...seed,
          draft,
          inputIds: draft === seed.draft ? seed.inputIds : [...seed.inputIds, input.nodeId],
          appendInputId: null,
        });
      } else onHydrate({ ...seed, appendInputId });
      return true;
    },
    [edges, inputs, nodes, onHydrate, seed, targetNodeId]
  );
  return { hydrateExistingJoin, baselineDraft, seed };
}
