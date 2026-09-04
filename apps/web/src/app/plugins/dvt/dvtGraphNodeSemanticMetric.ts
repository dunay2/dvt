/** Owns compact card summaries derived from canonical DVT relation semantics. */
import type { CanonicalNode } from '../../types/canonical';
import { decodeDvtSubstraitProjectionDocument } from '../../views/canvas/canvasDvtSubstraitProjection';
import { inspectDvtSubstraitFilter } from '../../views/canvas/canvasDvtSubstraitFilter';
import { readDvtTransformAuthoringAuthority } from '../../views/canvas/canvasDvtTransformAuthoringAuthority';
import { resolveGraphNodeCardCopy } from '../graph/graphNodeCardCopyTokens';
import type { GraphNodeCardMetric } from '../graph/graphNodeCardStrategyContracts';

export function buildDvtGraphNodeSemanticMetric(
  node: CanonicalNode,
  locale?: string
): GraphNodeCardMetric | null {
  if (node.kind !== 'dvt:source' && node.kind !== 'dvt:transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    const filter =
      authority == null
        ? null
        : inspectDvtSubstraitFilter(
            decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
          );
    return filter == null
      ? null
      : {
          id: 'filter',
          label: resolveGraphNodeCardCopy(locale).filterLabel,
          value: `${filter.fieldName} = ${JSON.stringify(filter.value)}`,
        };
  } catch {
    return null;
  }
}
