/** Owned concern: prepare an explicit occurrence intent in the existing discardable session. */
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import type { DvtSubstraitJoinDraft } from '../canvasDvtSubstraitJoinComposition';
import { sourceOccurrenceAppendRejection } from './sourceOccurrencePolicy';

export function createSourceOccurrenceActions(
  args: Readonly<{
    editable: boolean;
    draft: DvtSubstraitJoinDraft | null;
    inputs: readonly CanvasDvtCompositionInput[];
    start: () => boolean;
    setAppendInputId: (id: string) => void;
  }>
) {
  const rejection = (id: string) =>
    sourceOccurrenceAppendRejection({
      editable: args.editable,
      draft: args.draft,
      input: args.inputs.find((input) => input.nodeId === id),
    });
  return {
    rejection,
    add: (id: string) => {
      if (rejection(id) != null || !args.start()) return;
      args.setAppendInputId(id);
    },
  };
}
