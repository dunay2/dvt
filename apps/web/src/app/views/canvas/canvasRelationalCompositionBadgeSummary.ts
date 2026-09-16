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

function fill(template: string, values: Readonly<Record<string, number>>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template
  );
}

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
    return fill(copy.relationalCompositionJoinSummaryTemplate, {
      inputCount,
      predicateCount,
    });
  }

  const inspection = inspectDvtSubstraitUnionAllAcceptedDraft(
    decodeDvtSubstraitUnionAllDocument(authority.semanticDocument)
  );
  return inspection.ok
    ? fill(copy.relationalCompositionUnionAllSummaryTemplate, {
        inputCount: inspection.projection.inputs.length,
        outputCount: inspection.projection.outputs.length,
      })
    : null;
}
