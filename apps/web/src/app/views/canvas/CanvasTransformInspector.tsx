/** The fixed inspector for dataset field transformations, scalar and Window alike. */
import { useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalExpressionTree } from './CanvasRelationalExpressionTree';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';
import { CanvasRelationFields } from './CanvasRelationFields';
import { CanvasDerivedOutputSection } from './CanvasDerivedOutputSection';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useSelectedRelation } from './useSelectedRelation';
import { relationExpressionRefs } from './canvasRelationalTreeRelationProjection';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

export function CanvasTransformInspector({
  relationId,
  transformNode,
  draft,
  onChange,
  onClose,
}: Readonly<{
  relationId: string;
  transformNode: CanonicalNode;
  draft?: SubstraitDocument;
  onChange?: (document: SubstraitDocument) => void | boolean;
  onClose: () => void;
}>): JSX.Element {
  const [editingWindow, setEditingWindow] = useState(false);
  const selected = useSelectedRelation(relationId);
  const hasExpression = selected != null && relationExpressionRefs(selected.relation).length > 0;
  const window = useSelectedRelationTool(relationId, 'window', 'edit');
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const windowTitle = resolveCanvasViewCopy(language).operationWindowLabel;
  return (
    <CanvasRelationalTreeEditorFrame
      operation="field_transform"
      relationId={relationId}
      onClose={onClose}
      dataSlot="canvas-transform-inspector"
      hasExpression={hasExpression}
      output={
        onChange == null ? (
          <CanvasRelationFields relationId={relationId} />
        ) : (
          <CanvasRelationOutputs relationId={relationId} disabled={false} onChange={onChange} />
        )
      }
    >
      {hasExpression ? (
        <CanvasRelationalExpressionTree
          transformNode={transformNode}
          draft={draft}
          relationId={relationId}
          showSummary
        />
      ) : null}
      {onChange == null ? null : (
        <CanvasDerivedOutputSection key={relationId} relationId={relationId} onChange={onChange} />
      )}
      {onChange == null || window?.tool.enabled !== true ? null : editingWindow ? (
        <CanvasRelationalTreeOperatorForm
          tool={window.tool}
          draft={window.analysis.document!}
          targetRelationId={relationId}
          title={windowTitle}
          inline
          onChange={onChange}
          onClose={() => setEditingWindow(false)}
        />
      ) : (
        <button
          type="button"
          className="mt-3 rounded px-2 py-1.5 text-xs text-(--status-info)"
          onClick={() => setEditingWindow(true)}
        >
          {copy.edit} · {windowTitle}
        </button>
      )}
    </CanvasRelationalTreeEditorFrame>
  );
}
