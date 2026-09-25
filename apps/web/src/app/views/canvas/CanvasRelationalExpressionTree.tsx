/** Owned concern: display a selected relation's existing scalar projection, not another AST. */
import { useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CanvasOperationExpressionHost } from './CanvasRelationalTreeEditorFrame';
import type { CanonicalNode } from '../../types/canonical';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';

export function CanvasRelationalExpressionTree({
  transformNode,
  draft,
  relationId,
  onSelectCondition,
  operation = 'inner_join',
}: Readonly<{
  transformNode: CanonicalNode;
  draft?: SubstraitDocument;
  relationId: string | null;
  onSelectCondition?: (index: number, operand?: 'left' | 'right') => void;
  operation?: CanvasRelationalOperation;
}>): JSX.Element | null {
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
  return dock == null ? tree : dock.host == null ? null : createPortal(tree, dock.host);
}
