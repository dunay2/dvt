/** Real canonical Source -> Model -> Model -> consumer dependency fixture. */
import type { CanonicalNode, CanonicalEdge } from '../../types/canonical';
import {
  SOURCE,
  TRANSFORM,
  EDGE,
  buildCanonicalTransform,
} from './canvasOutputProjection.test-support';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { setDvtSourceOutputIncluded } from './canvasDvtSourceSemanticAuthoring';

export function analysisChain(): {
  node: CanonicalNode;
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
} {
  const nodes = [SOURCE, buildCanonicalTransform()];
  const edges = [EDGE];
  for (const id of ['middle', 'consumer']) {
    const upstream = nodes.at(-1)!;
    edges.push({
      id: `${upstream.id}-${id}`,
      sourceId: upstream.id,
      targetId: id,
      relation: 'lineage',
    });
    const input = resolveCanvasDvtCompositionInputs({ nodes, edges, targetNodeId: id })[0]!;
    nodes.push(
      applyDvtSubstraitSemanticDocument(
        { ...TRANSFORM, id, name: id },
        encodeDvtSubstraitSemanticDocument(
          createCanvasRelationalTreeProjectionDraft({ input, targetNodeId: id })
        )
      )
    );
  }
  return { node: nodes.at(-1)!, nodes, edges };
}

export function withdrawChainSource(nodes: readonly CanonicalNode[]): CanonicalNode[] {
  const changed = setDvtSourceOutputIncluded(nodes[0]!, 'customer', false);
  if (changed.outcome !== 'applied') throw new Error('Expected valid Source publication change');
  return [changed.node, ...nodes.slice(1)];
}
