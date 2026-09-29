/** Own staged graph editing; semantic materialization is a separate explicit command. */
import { createCanvasStagedOperationActions } from './canvasStagedOperationActions';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { useCanvasStagedFieldConnection } from './useCanvasStagedFieldConnection';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

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
    configure?: (operation: CanvasStagedOperation) => CanvasStagedOperation;
    analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    state: DraftState;
  }>
) {
  const commands = {
    editable: args.editable,
    start: args.start,
    operations: args.state.stagedOperations,
    setOperations: args.state.setStagedOperations,
    selectedId: args.state.selectedStagedOperationId,
    setSelectedId: args.state.setSelectedStagedOperationId,
    producerIds: args.producerIds,
    consumedProducerIds: args.consumedProducerIds,
    configure: args.configure,
  };
  const connectField = useCanvasStagedFieldConnection(commands, args.analysis);
  return { ...createCanvasStagedOperationActions(commands), connectField };
}
