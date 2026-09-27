/** Commands for a freely connected producer/consumer draft graph. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createSourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { useCanvasStagedOperationSession } from './useCanvasStagedOperationSession';

type DraftState = ReturnType<typeof useCanvasRelationalTreeDraftState>;

export function useCanvasRelationalGraphAuthoring(
  args: Readonly<{
    editable: boolean;
    inputs: readonly CanvasDvtCompositionInput[];
    analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    state: DraftState;
    start: () => boolean;
    outputRelationId: string | null;
  }>
) {
  const { analysis, editable, inputs, outputRelationId, start, state } = args;
  const staged = useCanvasStagedOperationSession({
    editable,
    start,
    pendingSources: state.pendingSources,
    analysis,
    state,
  });
  const occurrences = createSourceOccurrenceActions({
    editable,
    session: analysis?.document == null ? null : analysis.session,
    revision: analysis?.revision ?? 0,
    inputs,
    start,
    pending: state.pendingSources,
    setPending: state.setPendingSources,
    selectedId: state.pendingSourceId,
    setSelectedId: state.setPendingSourceId,
  });
  const producerIds = new Set([
    ...(analysis?.document?.sidecar.relations.map((relation) => relation.relationId) ?? []),
    ...state.pendingSources.map((source) => source.read.binding.relationId),
    ...state.stagedOperations.map((operation) => operation.id),
  ]);
  return {
    occurrences: {
      ...occurrences,
      remove: (id: string) => {
        staged.disconnectProducer(id);
        if (outputRelationId === id) state.setOutputRelationId(null);
        occurrences.remove(id);
      },
    },
    staged: {
      ...staged,
      remove: (id: string) => {
        if (outputRelationId === id) state.setOutputRelationId(null);
        staged.remove(id);
      },
    },
    output: {
      relationId: outputRelationId,
      connect: (relationId: string) => {
        if (
          producerIds.has(relationId) &&
          (outputRelationId == null || outputRelationId === relationId) &&
          start()
        )
          state.setOutputRelationId(relationId);
      },
      disconnect: () => {
        if (start()) state.setOutputRelationId(null);
      },
    },
  } as const;
}
