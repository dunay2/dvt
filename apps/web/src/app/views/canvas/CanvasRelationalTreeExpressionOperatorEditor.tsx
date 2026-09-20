/** Owned concern: edit a selected Filter, Aggregate or Window expression operation. */
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';
import { CanvasRelationalJoinExpressionTree } from './CanvasRelationalJoinExpressionTree';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export function CanvasRelationalTreeExpressionOperatorEditor({
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
  const language = useApplicationLanguageStore((state) => state.language);
  const es = language === 'es';
  const node = applyCanvasInspectorNodeDraft(
    transformNode,
    createCanvasRelationalTreeNodeDraft(transformNode, operation, draft)
  );
  const graph = projectSemanticWorkbenchGraph(node);
  const kind = graph.nodes.find((item) => item.id === relationId)?.data.relationKind;
  const toolId =
    kind === 'aggregate' || kind === 'filter' ? kind : kind === 'project' ? 'window' : null;
  if (
    toolId == null ||
    !graph.edges.some(
      (edge) => edge.target === relationId && edge.data?.semanticEdgeKind === 'expression'
    )
  )
    return null;
  const title =
    resolveCanvasViewCopy(language)[resolveCanvasRelationalOperationPresentation(toolId).labelKey];
  const tool = resolveCanvasRelationalOperatorTools(draft).find((item) => item.id === toolId);
  return (
    <CanvasRelationalTreeEditorFrame operation={toolId} relationId={relationId} onClose={onClose}>
      <div className="canvas-operation-editors grid min-h-0 gap-3">
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
              title={title}
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
