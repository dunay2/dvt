/** Owned concern: describe one verified canonical composition for accessible badge inspection. */
import type { CanonicalNode } from '../../types/canonical';
import { resolveGraphNodeCardCopy } from '../../plugins/graph/graphNodeCardCopyTokens';
import {
  decodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinAcceptedDraft,
} from './canvasDvtSubstraitJoinComposition';
import { countDvtSubstraitJoinConditionComparisons } from './canvasDvtSubstraitJoinCondition';
import {
  decodeDvtSubstraitUnionAllDocument,
  inspectDvtSubstraitUnionAllAcceptedDraft,
} from './canvasDvtSubstraitSetComposition';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import type { CanvasRelationalCompositionOperation } from '../../components/canvas/canvasNodePresentationTruth.contract';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';

export function resolveCanvasRelationalCompositionBadgeSummary(args: {
  node: CanonicalNode;
  operation: CanvasRelationalCompositionOperation;
  locale: string;
}): string | null {
  const authority = readDvtTransformAuthoringAuthority(args.node);
  if (authority?.mode !== 'substrait') return null;
  const copy = resolveGraphNodeCardCopy(args.locale);

  if (isCanvasJoinOperation(args.operation)) {
    const inspection = inspectDvtSubstraitJoinAcceptedDraft(
      decodeDvtSubstraitJoinDocument(authority.semanticDocument)
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
    const summary = copy.relationalCompositionJoinSummaryTemplate
      .replace('{inputCount}', String(inputCount))
      .replace('{predicateCount}', String(predicateCount));
    const label =
      args.operation === 'left_join'
        ? 'LEFT JOIN'
        : args.operation === 'right_join'
          ? 'RIGHT JOIN'
          : args.operation === 'full_outer_join'
            ? 'FULL OUTER JOIN'
            : 'INNER JOIN';
    return summary.replace(/^INNER JOIN/, label);
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
