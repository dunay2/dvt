/** Own staged graph editing; semantic materialization is a separate explicit command. */
import { createCanvasStagedOperationActions } from './canvasStagedOperationActions';
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
    producerIds: readonly string[];
    consumedProducerIds: readonly string[];
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
    producerIds: args.producerIds,
    consumedProducerIds: args.consumedProducerIds,
  });
}
