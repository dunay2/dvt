/** Owned concern: materialize an admitted composition once at the explicit user command. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  isCanvasSetOperation,
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';
import { createCanvasRelationalTreeInitialJoinDraft } from './canvasRelationalTreeAuthoringModel';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { createSourceSet } from './canvasSourceSet';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import { createSourceCross } from './canvasSourceCross';

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
  if (isCanvasJoinOperation(args.operation))
    return createCanvasRelationalTreeInitialJoinDraft({
      ...args,
      leftInputId: input.nodeId,
      rightInputId,
      operation: args.operation,
    });
  if (args.operation === 'cross_join') {
    const inputs = args.selectedInputIds.map((id) =>
      args.inputs.find((candidate) => candidate.nodeId === id)
    );
    if (inputs.some((source) => source == null)) return null;
    try {
      return createSourceCross(inputs.filter((source) => source != null));
    } catch {
      return null;
    }
  }
  if (!isCanvasSetOperation(args.operation)) return null;
  const inputs = args.selectedInputIds.map((id) =>
    args.inputs.find((candidate) => candidate.nodeId === id)
  );
  if (
    inputs.some(
      (source) => source == null || source.fields.some((field) => field.joinDataType == null)
    )
  )
    return null;
  return createSourceSet({
    targetNodeId: args.targetNodeId,
    operation: args.operation,
    inputs: inputs.map((source) => ({
      ...source!,
      fields: source!.fields.map((field) => ({
        name: field.name,
        type: field.joinDataType!,
        nullable: field.nullable,
      })),
    })),
  });
}
