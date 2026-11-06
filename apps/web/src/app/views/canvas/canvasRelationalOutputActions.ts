/**
 * Owned concern: admit and disconnect the graph's single terminal Output.
 * @baseline GH-3271-COMPOSITION-CONCERNS: terminal publication is separate from operation inputs.
 * @decision Reuse the existing authoring session and producer-consumer constraints.
 * @consequence Output actions do not configure operations or duplicate input-connection commands.
 * @version 1.0.0
 */
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';

export function createCanvasRelationalOutputActions(
  args: Readonly<{
    editable: boolean;
    start: () => boolean;
    outputRelationId: string | null;
    producerIds: readonly string[];
    canonicalConsumers: readonly string[];
    state: Pick<
      ReturnType<typeof useCanvasRelationalTreeDraftState>,
      'stagedOperations' | 'setOutputRelationId'
    >;
  }>
) {
  const { editable, start, outputRelationId, producerIds, canonicalConsumers, state } = args;
  return {
    relationId: outputRelationId,
    connect: (relationId: string) => {
      if (
        editable &&
        producerIds.includes(relationId) &&
        !canonicalConsumers.includes(relationId) &&
        !state.stagedOperations.some((operation) => operation.inputs.includes(relationId)) &&
        (outputRelationId == null || outputRelationId === relationId) &&
        start()
      )
        state.setOutputRelationId(relationId);
    },
    disconnect: () => {
      if (editable && start()) state.setOutputRelationId(null);
    },
  };
}
