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
import { flattenCanvasRelationalTree } from './canvasRelationalTreeWorkbenchModel';
import { relationalExpressionSlices } from './canvasRelationalExpressionSlice';

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
  const unavailable = new Set(
    flattenCanvasRelationalTree(root).flatMap((relation) =>
      (relation.unavailableFields ?? []).map((field) => field.fieldId)
    )
  );
  const slice = relationalExpressionSlices(projection, unavailable);
  const visit = (relation: CanvasRelationalTreeNode): void => {
    if (relation.operator !== 'unsupported' && relation.relationId != null) {
      const expressions = slice(relation.relationId);
      const structure = projectCanvasRelationalStructureGraph(
        relation,
        sourceOutputFieldsByRelationId,
        expressions.referencedFields
      );
      // Replace only a published output's duplicate token with its canonical root.
      // Walking the same edge preserves output order and never publishes a retained definition.
      const roots = new Map(
        expressions.nodes.flatMap((expression) =>
          expression.data.projectExpressionOrdinal != null && expression.data.fieldReference != null
            ? [[expression.data.fieldReference.fieldId, expression.id] as const]
            : []
        )
      );
      const replacements = new Map(
        structure.nodes.flatMap((field) => {
          const rootId =
            field.data.fieldSelection === 'output'
              ? roots.get(field.data.fieldReference?.fieldId ?? '')
              : undefined;
          return rootId == null ? [] : [[field.id, rootId] as const];
        })
      );
      const outputNames = new Map(
        relation.output.fields.map((field) => [field.fieldId, field.displayName])
      );
      const graph: SemanticWorkbenchGraph = {
        ...structure,
        nodes: [
          ...structure.nodes.filter((field) => !replacements.has(field.id)),
          ...expressions.nodes.map((expression) => {
            const name = outputNames.get(expression.data.fieldReference?.fieldId ?? '');
            return expression.data.projectExpressionOrdinal == null || name == null
              ? expression
              : {
                  ...expression,
                  data: {
                    ...expression.data,
                    label: `${expression.data.label.split('\n')[0]}\n${name}`,
                    detail: `${name} = ${expression.data.expression ?? expression.data.detail}`,
                  },
                };
          }),
        ],
        edges: [
          ...structure.edges.map((edge) => ({
            ...edge,
            source: replacements.get(edge.source) ?? edge.source,
          })),
          ...expressions.edges,
        ],
        expressionCount: expressions.nodes.length,
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
