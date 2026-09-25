/** Localize the shared semantic presentation; cards never decode or analyze a plan. */
import type { CanonicalNode } from '../../types/canonical';
import { isCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import { resolveGraphNodeCardCopy } from '../graph/graphNodeCardCopyTokens';
import type { GraphNodeCardMetric } from '../graph/graphNodeCardStrategyContracts';

export function buildDvtGraphNodeSemanticMetric(
  node: CanonicalNode,
  presentation: unknown,
  locale?: string
): GraphNodeCardMetric | null {
  if (
    node.kind !== 'dvt:transform' ||
    !isCanvasNodePresentationTruth(presentation) ||
    presentation.columns.state !== 'ready' ||
    presentation.filterSummary == null
  )
    return null;
  return {
    id: 'filter',
    label: resolveGraphNodeCardCopy(locale).filterLabel,
    value: presentation.filterSummary,
  };
}
