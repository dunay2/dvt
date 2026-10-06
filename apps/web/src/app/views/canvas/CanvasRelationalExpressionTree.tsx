/**
 * Owned concern: display a selected relation's canonical scalar projection.
 * @baseline ADR-0064: Substrait remains the only semantic authority.
 * @decision Delegate geometry and port direction to the shared expression layout.
 * @consequence Grouped expressions reuse the existing renderer without a second Canvas dependency.
 * @version 1.0.0
 */
import { useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CanvasOperationExpressionHost } from './CanvasRelationalTreeEditorFrame';
import type { CanvasRelationalSemanticContext } from './canvasRelationalTreeDetails';
import { indexSubstraitRelations, readSubstraitAuthoringGroup } from '@dvt/substrait-analysis';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';
import { relationalExpressionSlices } from './canvasRelationalExpressionSlice';
import { layoutSemanticExpressionGraph } from './semanticExpressionGraphLayout';

export function CanvasRelationalExpressionTree({
  transformNode,
  draft,
  relationId,
  onSelectCondition,
  operation = 'inner_join',
  showSummary = false,
}: Readonly<
  CanvasRelationalSemanticContext & {
    relationId: string | null;
    onSelectCondition?: (index: number, operand?: 'left' | 'right') => void;
    operation?: CanvasRelationalOperation;
    showSummary?: boolean;
  }
>): JSX.Element | null {
  const dock = useContext(CanvasOperationExpressionHost);
  const graph = useMemo(() => {
    if (relationId == null) return null;
    const node =
      draft == null
        ? transformNode
        : applyCanvasInspectorNodeDraft(
            transformNode,
            createCanvasRelationalTreeNodeDraft(transformNode, operation, draft)
          );
    const document =
      draft ??
      decodeDvtSubstraitSemanticDocument(
        readDvtTransformAuthoringAuthority(node)!.semanticDocument
      );
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const group = readSubstraitAuthoringGroup(indexed.index, relationId);
    if (group != null) {
      const model = readCanvasTransformDependencyModel(group.root, (id) =>
        indexed.index.relations.get(id)!
      );
      const projection = projectSemanticWorkbenchGraph(node, { view: 'unlaid' });
      const slice = relationalExpressionSlices(projection, new Set())(relationId, model);
      return layoutSemanticExpressionGraph({
        nodes: slice.nodes,
        edges: slice.edges,
        relationId,
        relationCount: 0,
        expressionCount: slice.nodes.length,
      });
    }
    return projectSemanticWorkbenchGraph(node, {
      view: 'relation-expressions',
      expressionRelationId: relationId,
    });
  }, [transformNode, draft, relationId, operation]);
  if (graph == null) return null;
  const tree = (
    <CanvasRelationalScalarTree
      graph={graph}
      onSelectCondition={
        onSelectCondition == null
          ? undefined
          : (index, operand) => {
              dock?.openProperties();
              onSelectCondition(index, operand);
            }
      }
    />
  );
  if (dock == null) return tree;
  return (
    <>
      {showSummary ? <CanvasRelationalScalarTree graph={graph} compact /> : null}
      {dock.host == null ? null : createPortal(tree, dock.host)}
    </>
  );
}
