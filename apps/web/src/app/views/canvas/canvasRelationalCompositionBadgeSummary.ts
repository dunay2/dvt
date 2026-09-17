/** Owned concern: describe one verified canonical composition for accessible badge inspection. */
import type { CanonicalNode } from '../../types/canonical';
import { resolveGraphNodeCardCopy } from '../../plugins/graph/graphNodeCardCopyTokens';
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinAcceptedDraft,
} from './canvasDvtSubstraitJoinComposition';
import { countDvtSubstraitJoinConditionComparisons } from './canvasDvtSubstraitJoinCondition';
import {
  decodeDvtSubstraitUnionAllDocument,
  inspectDvtSubstraitUnionAllAcceptedDraft,
} from './canvasDvtSubstraitSetComposition';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import type { CanvasRelationalCompositionOperation } from '../../components/canvas/canvasNodePresentationTruth.contract';

export function resolveCanvasRelationalCompositionBadgeSummary(args: {
  node: CanonicalNode;
  operation: CanvasRelationalCompositionOperation;
  locale: string;
}): string | null {
  const authority = readDvtTransformAuthoringAuthority(args.node);
  if (authority?.mode !== 'substrait') return null;
  const copy = resolveGraphNodeCardCopy(args.locale);

  if (args.operation === 'inner_join') {
    const inspection = inspectDvtSubstraitInnerJoinAcceptedDraft(
      decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument)
    );
    if (!inspection.ok) return null;
    const projection = inspection.projection;
    const hasRecursiveJoinFacts = 'inputs' in projection && 'joins' in projection;
    const inputCount = hasRecursiveJoinFacts ? projection.inputs.length : 2;
    const predicateCount = hasRecursiveJoinFacts
      ? projection.joins.reduce(
          (count, join) => count + countDvtSubstraitJoinConditionComparisons(join.conditions),
          0
        )
      : 1;
    return copy.relationalCompositionJoinSummaryTemplate
      .replace('{inputCount}', String(inputCount))
      .replace('{predicateCount}', String(predicateCount));
  }

  const inspection = inspectDvtSubstraitUnionAllAcceptedDraft(
    decodeDvtSubstraitUnionAllDocument(authority.semanticDocument)
  );
  return inspection.ok
    ? copy.relationalCompositionUnionAllSummaryTemplate
        .replace('{inputCount}', String(inspection.projection.inputs.length))
        .replace('{outputCount}', String(inspection.projection.outputs.length))
    : null;
}
