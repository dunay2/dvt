/** Owns pure structural append transitions when reopening canonical relational drafts. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { appendDvtSubstraitCrossInput } from './canvasDvtSubstraitCrossComposition';
import { appendDvtSubstraitUnionAllInput } from './canvasDvtSubstraitSetComposition';
import {
  isCanvasSetOperation,
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';

export type CanvasRelationalTreeJoinSeedHydration = Readonly<{
  draft: DvtSubstraitJoinDraft;
  inputIds: readonly string[];
  appendInputId: string | null;
  operation: CanvasRelationalOperation;
}>;

export function appendCanvasRelationalCrossInputById(
  args: Readonly<{
    draft: DvtSubstraitJoinDraft;
    inputIds: readonly string[];
    appendInputId: string;
    inputs: readonly CanvasDvtCompositionInput[];
  }>
): Readonly<{ draft: DvtSubstraitJoinDraft; inputIds: readonly string[] }> | null {
  const selected = args.inputIds
    .map((nodeId) => args.inputs.find((candidate) => candidate.nodeId === nodeId))
    .filter((candidate): candidate is CanvasDvtCompositionInput => candidate != null);
  const appended = args.inputs.find((candidate) => candidate.nodeId === args.appendInputId);
  if (appended == null) return null;
  try {
    return {
      draft: appendDvtSubstraitCrossInput(args.draft, [...selected, appended]),
      inputIds: [...args.inputIds, appended.nodeId],
    };
  } catch {
    return null;
  }
}

export function resolveCanvasRelationalTreeSeedHydration(
  args: Readonly<{
    seed: CanvasRelationalTreeJoinSeedHydration;
    appendInputId: string | null;
    inputs: readonly CanvasDvtCompositionInput[];
  }>
): CanvasRelationalTreeJoinSeedHydration {
  const input = args.inputs.find((candidate) => candidate.nodeId === args.appendInputId);
  if (args.seed.operation === 'projection') {
    return {
      ...args.seed,
      appendInputId: null,
      inputIds: input == null ? args.seed.inputIds : [...args.seed.inputIds, input.nodeId],
    };
  }
  if (isCanvasSetOperation(args.seed.operation) && input != null) {
    const draft = appendDvtSubstraitUnionAllInput(args.seed.draft, {
      ...input,
      fields: input.fields.map((field) => ({ name: field.name, type: 'string' })),
    });
    return {
      ...args.seed,
      draft,
      inputIds:
        draft === args.seed.draft ? args.seed.inputIds : [...args.seed.inputIds, input.nodeId],
      appendInputId: null,
    };
  }
  if (args.seed.operation === 'cross_join' && args.appendInputId != null) {
    const appended = appendCanvasRelationalCrossInputById({
      draft: args.seed.draft,
      inputIds: args.seed.inputIds,
      appendInputId: args.appendInputId,
      inputs: args.inputs,
    });
    return appended == null
      ? { ...args.seed, appendInputId: null }
      : { ...args.seed, ...appended, appendInputId: null };
  }
  return { ...args.seed, appendInputId: args.appendInputId };
}
