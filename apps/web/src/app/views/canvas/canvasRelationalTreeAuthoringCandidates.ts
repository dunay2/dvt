/** Candidate availability uses typed output facts, independent of relation shape. */
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationAvailability,
} from './canvasRelationalOperationChoices';
import { sourceOccurrenceAppendRejection } from './relational-source-occurrence/sourceOccurrencePolicy';

export type CanvasRelationalTreeAuthoringCandidate = Readonly<{
  nodeId: string;
  selectable: boolean;
  selected: boolean;
  reason: CanvasRelationalOperationAvailability | null;
}>;

export function resolveCanvasRelationalTreeAuthoringCandidates(
  args: Readonly<{
    operation: CanvasRelationalOperation;
    inputs: readonly CanvasDvtCompositionInput[];
    selectedInputIds: readonly string[];
    output: RelationAnalysisResult | null;
    session: CanvasRelationAnalysisSession | null;
    revision: number;
  }>
): readonly CanvasRelationalTreeAuthoringCandidate[] {
  const selected = new Set(args.selectedInputIds);
  return args.inputs.map((input) => {
    const included = selected.has(input.nodeId);
    const rejection = sourceOccurrenceAppendRejection({ ...args, editable: true, input });
    return {
      nodeId: input.nodeId,
      selected: included,
      selectable: !included && rejection == null,
      reason: included || rejection == null ? null : 'semantically-unavailable',
    };
  });
}
