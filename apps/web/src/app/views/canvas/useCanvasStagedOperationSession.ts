/** Own staged graph editing; semantic materialization is a separate explicit command. */
import { createCanvasStagedOperationActions } from './canvasStagedOperationActions';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';

type DraftState = Pick<
  ReturnType<typeof useCanvasRelationalTreeDraftState>,
  | 'stagedOperations'
  | 'setStagedOperations'
  | 'selectedStagedOperationId'
  | 'setSelectedStagedOperationId'
>;

export function useCanvasStagedOperationSession(
  args: Readonly<{
    editable: boolean;
    start: () => boolean;
    pendingSources: readonly PendingSourceOccurrence[];
    analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    state: DraftState;
  }>
) {
  return createCanvasStagedOperationActions({
    editable: args.editable,
    start: args.start,
    operations: args.state.stagedOperations,
    setOperations: args.state.setStagedOperations,
    selectedId: args.state.selectedStagedOperationId,
    setSelectedId: args.state.setSelectedStagedOperationId,
    producerIds: [
      ...(args.analysis?.document?.sidecar.relations.map((relation) => relation.relationId) ?? []),
      ...args.pendingSources.map((source) => source.read.binding.relationId),
      ...args.state.stagedOperations.map((operation) => operation.id),
    ],
  });
}
