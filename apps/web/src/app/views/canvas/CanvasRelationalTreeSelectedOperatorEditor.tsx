/** Owned concern: bind a selected unary operation to its existing expression and mutation owners. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalJoinExpressionTree } from './CanvasRelationalJoinExpressionTree';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

export function CanvasRelationalTreeSelectedOperatorEditor({
  draft,
  operation,
  relationId,
  transformNode,
  onChange,
  onClose,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  operation: CanvasRelationalOperation;
  relationId: string | null;
  transformNode: CanonicalNode;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
}>): JSX.Element | null {
  const es = useApplicationLanguageStore((state) => state.language) === 'es';
  const node = applyCanvasInspectorNodeDraft(
    transformNode,
    createCanvasRelationalTreeNodeDraft(transformNode, operation, draft)
  );
  const graph = projectSemanticWorkbenchGraph(node);
  const selected = graph.nodes.find((item) => item.id === relationId);
  const kind = selected?.data.relationKind;
  const toolId =
    kind === 'aggregate' || kind === 'filter' ? kind : kind === 'project' ? 'window' : null;
  if (
    toolId == null ||
    !graph.edges.some(
      (edge) => edge.target === relationId && edge.data?.semanticEdgeKind === 'expression'
    )
  )
    return null;
  const tool = resolveCanvasRelationalOperatorTools(draft).find((item) => item.id === toolId);
  return (
    <CanvasRelationalTreeEditorFrame title={toolId.toUpperCase()} onClose={onClose}>
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-2">
        <CanvasRelationalJoinExpressionTree
          transformNode={transformNode}
          draft={draft}
          operation={operation}
          relationId={relationId}
        />
        {tool?.enabled && tool.active ? (
          <div className="min-h-0 overflow-auto">
            <CanvasRelationalTreeOperatorForm
              key={`${relationId}:${tool.alias ?? ''}`}
              inline
              tool={tool}
              draft={draft}
              title={toolId.toUpperCase()}
              onChange={onChange}
              onClose={onClose}
            />
          </div>
        ) : toolId === 'aggregate' ? (
          <p className="text-sm text-(--text-muted)">
            {es
              ? 'Esta operación tiene dependencias posteriores. Retira primero la ventana para modificar la agrupación.'
              : 'This operation has downstream dependencies. Remove the window before changing the grouping.'}
          </p>
        ) : null}
      </div>
    </CanvasRelationalTreeEditorFrame>
  );
}
