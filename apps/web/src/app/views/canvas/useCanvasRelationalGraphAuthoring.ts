/** Commands for a freely connected producer/consumer draft graph. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createSourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { useCanvasStagedOperationSession } from './useCanvasStagedOperationSession';
import { useCanvasStagedOperationConfiguration } from './useCanvasStagedOperationConfiguration';

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
  const configure = useCanvasStagedOperationConfiguration({ analysis, inputs, state });
  const canonicalIds =
    analysis?.document?.sidecar.relations.map((relation) => relation.relationId) ?? [];
  // Every non-root relation in the canonical tree already has a consumer.
  const canonicalConsumers = canonicalIds.filter((id) => id !== analysis?.session.rootId);
  const producerIds = [
    ...canonicalIds,
    ...state.pendingSources.map((source) => source.read.binding.relationId),
    ...state.stagedOperations.map((operation) => operation.id),
  ];
  const staged = useCanvasStagedOperationSession({
    editable,
    start,
    producerIds,
    consumedProducerIds:
      outputRelationId == null ? canonicalConsumers : [...canonicalConsumers, outputRelationId],
    state,
    configure,
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
  return {
    occurrences: {
      ...occurrences,
      drop: (id: string) => {
        staged.clearSelection();
        return occurrences.drop(id);
      },
      add: (id: string) => {
        staged.clearSelection();
        occurrences.add(id);
      },
      select: (id: string) => {
        staged.clearSelection();
        occurrences.select(id);
      },
      remove: (id: string) => {
        staged.disconnectProducer(id);
        if (outputRelationId === id) state.setOutputRelationId(null);
        occurrences.remove(id);
      },
    },
    staged: {
      ...staged,
      stage: (operation: Parameters<typeof staged.stage>[0]) => {
        occurrences.clearSelection();
        return staged.stage(operation);
      },
      select: (id: string) => {
        occurrences.clearSelection();
        staged.select(id);
      },
      connect: (id: string, port: number, relationId: string) => {
        occurrences.clearSelection();
        staged.connect(id, port, relationId);
      },
      remove: (id: string) => {
        if (outputRelationId === id) state.setOutputRelationId(null);
        staged.remove(id);
      },
    },
    output: {
      relationId: outputRelationId,
      connect: (relationId: string) => {
        const isOperation =
          state.stagedOperations.some((operation) => operation.id === relationId) ||
          (analysis?.document != null &&
            relationId === analysis.session.rootId &&
            analysis.session.locate(relationId, analysis.revision).relation.relType.case !==
              'read');
        if (
          editable &&
          isOperation &&
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
    },
  } as const;
}
