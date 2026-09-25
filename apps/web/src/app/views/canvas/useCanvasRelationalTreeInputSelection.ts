/** Source selection prepares intent; the composition command owns all relation mutations. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalTreeAuthoringCandidate } from './canvasRelationalTreeAuthoringCandidates';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';

export function useCanvasRelationalTreeInputSelection(
  args: Readonly<{
    enabled: boolean;
    editable: boolean;
    active: boolean;
    hasDraft: boolean;
    operation: CanvasRelationalOperation | null;
    candidates: readonly CanvasRelationalTreeAuthoringCandidate[];
    inputs: readonly CanvasDvtCompositionInput[];
    start: () => boolean;
    selectInitialInput: (nodeId: string) => void;
    requestAppend: (nodeId: string) => void;
    placeOperand: (nodeId: string, position: 'primary' | 'secondary') => void;
  }>
) {
  const admitted = (nodeId: string) =>
    args.enabled && args.editable && args.inputs.some((input) => input.nodeId === nodeId);
  return {
    selectInput: (nodeId: string) => {
      if (!admitted(nodeId)) return;
      if (args.hasDraft) {
        if (
          args.candidates.some(
            (candidate) => candidate.nodeId === nodeId && candidate.selectable
          ) &&
          args.start()
        )
          args.requestAppend(nodeId);
      } else if (args.start()) args.selectInitialInput(nodeId);
    },
    placeInput: (nodeId: string, position: 'primary' | 'secondary') => {
      if (!admitted(nodeId) || !args.start()) return;
      if (args.hasDraft) args.requestAppend(nodeId);
      else args.placeOperand(nodeId, position);
    },
  };
}
