/** Owned concern: describe one verified canonical composition for accessible badge inspection. */
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanonicalNode } from '../../types/canonical';
import { decodeDvtSubstraitPlanV1 } from '@dvt/contracts';
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
import { inspectDvtSubstraitAcceptedCrossDraft } from '@dvt/postgres-projection';

export function resolveCanvasRelationalCompositionBadgeSummary(args: {
  node: CanonicalNode;
  operation: CanvasRelationalCompositionOperation;
  locale: string;
}): string | null {
  const authority = readDvtTransformAuthoringAuthority(args.node);
  if (authority?.mode !== 'substrait') return null;
  const copy = resolveGraphNodeCardCopy(args.locale);
  const label = resolveCanvasViewCopy(args.locale)[
    resolveCanvasRelationalOperationPresentation(args.operation).labelKey
  ];

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
    return summary.replace('{operation}', label);
  }

  if (args.operation === 'cross_join') {
    const inspection = inspectDvtSubstraitAcceptedCrossDraft({
      plan: decodeDvtSubstraitPlanV1(authority.semanticDocument),
      sidecar: authority.semanticDocument.sidecar,
    });
    return inspection.ok
      ? copy.relationalCompositionCrossSummaryTemplate
          .replace('{operation}', label)
          .replace('{inputCount}', String(inspection.projection.inputs.length))
          .replace('{outputCount}', String(inspection.projection.outputs.length))
      : null;
  }

  const inspection = inspectDvtSubstraitUnionAllAcceptedDraft(
    decodeDvtSubstraitUnionAllDocument(authority.semanticDocument)
  );
  return inspection.ok
    ? {
        union_all: copy.relationalCompositionUnionAllSummaryTemplate,
        union_distinct: copy.relationalCompositionUnionDistinctSummaryTemplate,
        intersect_distinct: copy.relationalCompositionIntersectDistinctSummaryTemplate,
        except_distinct: copy.relationalCompositionExceptDistinctSummaryTemplate,
        intersect_all: copy.relationalCompositionIntersectAllSummaryTemplate,
        except_all: copy.relationalCompositionExceptAllSummaryTemplate,
      }[inspection.projection.operation]
        .replace('{operation}', label)
        .replace('{inputCount}', String(inspection.projection.inputs.length))
        .replace('{outputCount}', String(inspection.projection.outputs.length))
    : null;
}
