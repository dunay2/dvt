/** Owns the pure draft transition for one selected relational operation. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { createCanvasRelationalTreeOperationDraft } from './canvasRelationalTreeOperationDraft';
import { isCanvasJoinOperation, setFinalCanvasJoinType } from './canvasRelationalTreeJoinType';
import { appendCanvasRelationalCrossInputById } from './canvasRelationalTreeSeedHydration';

export function resolveCanvasRelationalTreeOperationTransition(
  args: Readonly<{
    operation: CanvasRelationalOperation;
    inputs: readonly CanvasDvtCompositionInput[];
    selectedInputIds: readonly string[];
    targetNodeId: string;
    draft: DvtSubstraitJoinDraft | null;
    appendInputId: string | null;
  }>
): Readonly<{ draft: DvtSubstraitJoinDraft; appendedInputId?: string }> | null {
  if (isCanvasJoinOperation(args.operation) && args.draft != null) {
    const draft = setFinalCanvasJoinType(args.draft, args.operation);
    return draft == null ? null : { draft };
  }
  if (args.operation === 'cross_join' && args.draft != null && args.appendInputId != null) {
    const appended = appendCanvasRelationalCrossInputById({
      draft: args.draft,
      inputIds: args.selectedInputIds,
      appendInputId: args.appendInputId,
      inputs: args.inputs,
    });
    return appended == null ? null : { draft: appended.draft, appendedInputId: args.appendInputId };
  }
  const draft = createCanvasRelationalTreeOperationDraft({
    operation: args.operation,
    inputs: args.inputs,
    targetNodeId: args.targetNodeId,
    selectedInputIds: args.selectedInputIds,
  });
  return draft == null ? null : { draft };
}
