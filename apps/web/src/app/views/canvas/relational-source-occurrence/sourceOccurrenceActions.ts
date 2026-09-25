/** Owned concern: prepare an explicit occurrence intent in the existing discardable session. */
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';
import type { CanvasRelationalOperation } from '../canvasRelationalOperationChoices';
import { sourceOccurrenceAppendRejection } from './sourceOccurrencePolicy';

export function createSourceOccurrenceActions(
  args: Readonly<{
    editable: boolean;
    output: RelationAnalysisResult | null;
    session: CanvasRelationAnalysisSession | null;
    revision: number;
    operation: CanvasRelationalOperation | null;
    inputs: readonly CanvasDvtCompositionInput[];
    start: () => boolean;
    setAppendInputId: (id: string) => void;
  }>
) {
  const rejection = (id: string) =>
    sourceOccurrenceAppendRejection({
      editable: args.editable,
      output: args.output,
      session: args.session,
      revision: args.revision,
      operation: args.operation,
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
