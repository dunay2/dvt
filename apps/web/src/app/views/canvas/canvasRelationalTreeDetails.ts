/** Owned concern: project canonical card details for explicit or zoom-driven disclosure. */
import type { CanonicalNode } from '../../types/canonical';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import {
  projectSemanticWorkbenchGraph,
  type SemanticWorkbenchGraph,
} from './semanticWorkbenchProjection';
import type { CanvasRelationalTreeNodeSize } from './canvasRelationalTreeGeometryMetrics';
import { projectCanvasRelationalStructureGraph } from './canvasRelationalStructureGraph';

export const CANVAS_RELATIONAL_DETAIL_ZOOM = 1.2;

export type CanvasRelationalSemanticContext = Readonly<{
  transformNode: CanonicalNode;
  draft?: SubstraitDocument;
}>;

export function projectCanvasRelationalTreeDetails(
  root: CanvasRelationalTreeNode,
  context?: CanvasRelationalSemanticContext,
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>
): Readonly<{
  graphs: ReadonlyMap<string, SemanticWorkbenchGraph>;
  sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize>;
}> {
  const graphs = new Map<string, SemanticWorkbenchGraph>();
  const sizes = new Map<string, CanvasRelationalTreeNodeSize>();
  if (context == null) return { graphs, sizes };
  const node =
    context.draft == null
      ? context.transformNode
      : applyCanvasInspectorNodeDraft(
          context.transformNode,
          createCanvasRelationalTreeNodeDraft(context.transformNode, 'inner_join', context.draft)
        );
  const projection = projectSemanticWorkbenchGraph(node, { view: 'unlaid' });
  const nodes = new Map(projection.nodes.map((item) => [item.id, item]));
  const inputs = new Map<string, SemanticWorkbenchGraph['edges']>();
  for (const edge of projection.edges) {
    if (edge.data?.semanticEdgeKind !== 'expression') continue;
    inputs.set(edge.target, [...(inputs.get(edge.target) ?? []), edge]);
  }
  const visit = (relation: CanvasRelationalTreeNode): void => {
    if (relation.operator !== 'unsupported' && relation.relationId != null) {
      const ids = new Set<string>();
      const edges: SemanticWorkbenchGraph['edges'] = [];
      const pending = (inputs.get(relation.relationId) ?? []).map((edge) => edge.source).reverse();
      while (pending.length > 0) {
        const id = pending.pop()!;
        if (ids.has(id)) continue;
        ids.add(id);
        for (const edge of inputs.get(id) ?? []) {
          edges.push(edge);
          pending.push(edge.source);
        }
      }
      const structure = projectCanvasRelationalStructureGraph(
        relation,
        sourceOutputFieldsByRelationId
      );
      const graph: SemanticWorkbenchGraph = {
        ...structure,
        nodes: [...structure.nodes, ...[...ids].map((id) => nodes.get(id)!)],
        edges: [...structure.edges, ...edges],
        expressionCount: ids.size,
      };
      graphs.set(relation.locator, graph);
      sizes.set(relation.locator, {
        width: 420,
        height: 76 + Math.min(352, 16 + graph.nodes.length * 32),
      });
    }
    relation.children.forEach((child) => visit(child.node));
  };
  visit(root);
  return { graphs, sizes };
}
