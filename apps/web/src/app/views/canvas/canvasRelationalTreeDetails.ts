/** Owned concern: project local card details for explicit or zoom-driven disclosure. */
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
import { flattenCanvasRelationalTree } from './canvasRelationalTreeWorkbenchModel';
import { relationalExpressionSlices } from './canvasRelationalExpressionSlice';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { projectCanvasStagedOperation } from './canvasStagedOperationProjection';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import { projectCanvasRelationalDetailGraph } from './canvasRelationalDetailGraph';

export const CANVAS_RELATIONAL_DETAIL_ZOOM = 1.2;

export type CanvasRelationalSemanticContext = Readonly<{
  transformNode: CanonicalNode;
  draft?: SubstraitDocument;
}>;

export function projectCanvasRelationalTreeDetails(
  root: CanvasRelationalTreeNode | null,
  context?: CanvasRelationalSemanticContext,
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>,
  stagedOperations: readonly CanvasStagedOperation[] = []
): Readonly<{
  graphs: ReadonlyMap<string, SemanticWorkbenchGraph>;
  sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize>;
}> {
  const graphs = new Map<string, SemanticWorkbenchGraph>();
  const sizes = new Map<string, CanvasRelationalTreeNodeSize>();
  if (context == null) return { graphs, sizes };
  if (root != null) {
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
        const graph = projectCanvasRelationalDetailGraph(
          relation,
          slice(relation.relationId),
          sourceOutputFieldsByRelationId
        );
        graphs.set(relation.locator, graph);
        sizes.set(relation.locator, {
          width: 420,
          height: 76 + Math.min(352, 16 + graph.nodes.length * 32),
        });
      }
      relation.children.forEach((child) => visit(child.node));
    };
    visit(root);
  }
  for (const operation of stagedOperations) {
    const draft = decodeCanvasStagedOperation(operation);
    if (draft == null) continue;
    const staged = projectCanvasStagedOperation(operation);
    const local = projectCanvasRelationalTreeDetails(
      staged,
      { ...context, draft },
      sourceOutputFieldsByRelationId
    );
    const graph = local.graphs.get(staged.locator);
    const size = local.sizes.get(staged.locator);
    if (graph != null) graphs.set(staged.locator, graph);
    if (size != null) sizes.set(staged.locator, size);
  }
  return { graphs, sizes };
}
