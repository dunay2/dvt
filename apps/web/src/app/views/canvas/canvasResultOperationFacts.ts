/** Derive menu facts from the selected result and the candidate source, without allocating relations. */
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasOperationFacts } from './canvasRelationalOperationChoices';
import { sourceOccurrenceAppendRejection } from './relational-source-occurrence/sourceOccurrencePolicy';

export function resultOperationFacts(
  args: Readonly<{
    editable: boolean;
    output: RelationAnalysisResult | null;
    session: CanvasRelationAnalysisSession | null;
    revision: number;
    input: CanvasDvtCompositionInput | undefined;
  }>
): CanvasOperationFacts {
  const cross = sourceOccurrenceAppendRejection({
    ...args,
    editable: true,
    operation: 'cross_join',
  });
  const aligned =
    sourceOccurrenceAppendRejection({ ...args, editable: true, operation: 'union_all' }) == null;
  return {
    readOnly: !args.editable,
    inputCount: args.input == null || args.output == null ? 1 : 2,
    sameConnection: cross !== 'unavailable',
    completeSchema: cross == null,
    comparableFields:
      sourceOccurrenceAppendRejection({ ...args, editable: true, operation: 'inner_join' }) == null,
    predicateAvailable: false,
    sets: {
      union_all: aligned,
      union_distinct: aligned,
      intersect_distinct: aligned,
      except_distinct: aligned,
      intersect_all: aligned,
      except_all: aligned,
    },
  };
}
