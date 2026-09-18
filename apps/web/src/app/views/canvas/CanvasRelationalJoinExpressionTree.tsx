/** Owned concern: show the existing scalar projection of the selected JOIN, not another AST. */
import { useMemo } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';

export function CanvasRelationalJoinExpressionTree({
  transformNode,
  draft,
  relationId,
}: Readonly<{
  transformNode: CanonicalNode;
  draft?: DvtSubstraitInnerJoinDraft;
  relationId: string | null;
}>): JSX.Element | null {
  const graph = useMemo(() => {
    if (relationId == null) return null;
    const node =
      draft == null
        ? transformNode
        : applyCanvasInspectorNodeDraft(
            transformNode,
            createCanvasRelationalTreeNodeDraft(transformNode, 'inner_join', draft)
          );
    return projectSemanticWorkbenchGraph(node, {
      view: 'join-expression',
      joinRelationId: relationId,
    });
  }, [transformNode, draft, relationId]);
  if (graph == null) return null;
  return <CanvasRelationalScalarTree graph={graph} />;
}
