/** Owned concern: select or append connected inputs within the local authoring session. */
import { useCallback } from 'react';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeAuthoringCandidate } from './canvasRelationalTreeAuthoringModel';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';

export function useCanvasRelationalTreeInputSelection(
  args: Readonly<{
    enabled: boolean;
    editable: boolean;
    active: boolean;
    operation: CanvasRelationalOperation | null;
    candidates: readonly CanvasRelationalTreeAuthoringCandidate[];
    joinDraft: DvtSubstraitInnerJoinDraft | null;
    setActive: (active: boolean) => void;
    hydrateExistingJoin: (nodeId: string) => boolean;
    selectInitialInput: (nodeId: string) => void;
    setJoinDraft: (draft: DvtSubstraitInnerJoinDraft | null) => void;
    setAppendInputId: (nodeId: string | null) => void;
    appendOperand: (nodeId: string) => void;
    inputs: readonly Readonly<{ nodeId: string }>[];
    placeOperand: (nodeId: string, position: 'primary' | 'secondary') => void;
    setOperation: (operation: CanvasRelationalOperation | null) => void;
  }>
) {
  const selectInput = useCallback(
    (nodeId: string) => {
      if (!args.enabled || !args.editable) return;
      args.setActive(true);
      if (!args.active && args.hydrateExistingJoin(nodeId)) return;
      if (args.operation == null) {
        args.selectInitialInput(nodeId);
        args.setJoinDraft(null);
        args.setAppendInputId(null);
        return;
      }
      if (!args.candidates.some((item) => item.nodeId === nodeId && item.selectable)) return;
      if (args.operation === 'union_all') args.appendOperand(nodeId);
      else if (args.joinDraft != null) args.setAppendInputId(nodeId);
    },
    [args]
  );
  const placeInput = useCallback(
    (nodeId: string, position: 'primary' | 'secondary') => {
      if (!args.enabled || !args.editable || !args.inputs.some((input) => input.nodeId === nodeId))
        return;
      args.setActive(true);
      args.placeOperand(nodeId, position);
      args.setOperation(null);
      args.setJoinDraft(null);
      args.setAppendInputId(null);
    },
    [args]
  );
  return { selectInput, placeInput };
}
