/**
 * Owned concern: present Transform properties and calculated SELECT outputs in their owning tabs.
 * @baseline ADR-0064: one visible Transform may own multiple canonical projection layers.
 * @decision Reuse the derived-output editor in Output; retain Window configuration in Properties.
 * @consequence Formula authoring has one entry point and shares the existing pending-edit guard.
 * @version 1.1.0
 */
import { useContext, useMemo, useState } from 'react';
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
import { usePendingRelationEdits } from './usePendingRelationEdits';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';

export function CanvasTransformInspector({
  relationId,
  transformNode,
  draft,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  relationId: string;
  transformNode: CanonicalNode;
  draft?: SubstraitDocument;
  onChange?: (document: SubstraitDocument) => void | boolean;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element {
  const [editingWindow, setEditingWindow] = useState(false);
  const [setWindowPending, setOutputsPending] = usePendingRelationEdits(onPendingChange);
  const [setFormulaPending, setOutputListPending] = usePendingRelationEdits(setOutputsPending);
  const selected = useSelectedRelation(relationId);
  const analysis = useContext(CanvasRelationAnalysisContext);
  const hasExpression = useMemo(() => {
    if (selected == null) return false;
    if (relationExpressionRefs(selected.relation).length > 0) return true;
    return (
      selected.relation.relType.case === 'project' &&
      analysis != null &&
      readCanvasTransformDependencyModel(selected, (id) =>
        analysis.session.locate(id, analysis.revision)
      ).definitions.length > 0
    );
  }, [analysis, selected]);
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
      initialTab="output"
      hasExpression={hasExpression}
      output={
        onChange == null ? (
          <CanvasRelationFields relationId={relationId} />
        ) : (
          <>
            <CanvasRelationOutputs
              relationId={relationId}
              disabled={false}
              onChange={onChange}
              onPendingChange={setOutputListPending}
            />
            <CanvasDerivedOutputSection
              key={relationId}
              relationId={relationId}
              onChange={onChange}
              onPendingChange={setFormulaPending}
            />
          </>
        )
      }
    >
      {hasExpression ? (
        <CanvasRelationalExpressionTree
          transformNode={transformNode}
          draft={draft}
          relationId={relationId}
        />
      ) : null}
      {onChange == null || window?.tool.enabled !== true ? null : editingWindow ? (
        <CanvasRelationalTreeOperatorForm
          tool={window.tool}
          draft={window.analysis.document!}
          targetRelationId={relationId}
          title={windowTitle}
          inline
          onChange={onChange}
          onClose={() => setEditingWindow(false)}
          onPendingChange={setWindowPending}
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
