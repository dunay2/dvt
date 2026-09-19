/** Owned concern: materialize an admitted composition once at the explicit user command. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { createCanvasRelationalTreeInitialJoinDraft } from './canvasRelationalTreeAuthoringModel';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { createDvtSubstraitUnionAllDraft } from './canvasDvtSubstraitSetComposition';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';

export function createCanvasRelationalTreeOperationDraft(
  args: Readonly<{
    operation: CanvasRelationalOperation;
    inputs: readonly CanvasDvtCompositionInput[];
    selectedInputIds: readonly string[];
    targetNodeId: string;
  }>
): DvtSubstraitProjectionDraft | null {
  const [leftInputId, rightInputId] = args.selectedInputIds;
  const input = args.inputs.find((candidate) => candidate.nodeId === leftInputId);
  if (input == null) return null;
  if (args.operation === 'projection')
    return createCanvasRelationalTreeProjectionDraft({ input, targetNodeId: args.targetNodeId });
  if (rightInputId == null) return null;
  if (args.operation === 'inner_join')
    return createCanvasRelationalTreeInitialJoinDraft({
      ...args,
      leftInputId: input.nodeId,
      rightInputId,
    });
  const inputs = args.selectedInputIds.map((id) =>
    args.inputs.find((candidate) => candidate.nodeId === id)
  );
  if (
    inputs.some(
      (source) => source == null || source.fields.some((field) => field.joinDataType !== 'string')
    )
  )
    return null;
  return createDvtSubstraitUnionAllDraft({
    targetNodeId: args.targetNodeId,
    inputs: inputs.map((source) => ({
      ...source!,
      fields: source!.fields.map((field) => ({ name: field.name, type: 'string' })),
    })),
  });
}
