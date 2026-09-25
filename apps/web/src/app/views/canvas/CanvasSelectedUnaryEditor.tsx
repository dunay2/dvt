/** Present one selected unary operation through the shared command form. */
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import type { CanvasRelationalOperatorTool } from './relational-operator-form/OperatorTool';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { CanvasRelationalExpressionTree } from './CanvasRelationalExpressionTree';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';
import { usePendingRelationEdits } from './usePendingRelationEdits';
import { relationExpressionRefs } from './canvasRelationalTreeRelationProjection';

export function CanvasSelectedUnaryEditor({
  draft,
  operation,
  relationId,
  onChange,
  onClose,
  onPendingChange,
  transformNode,
  modelOperation,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  operation: CanvasRelationalOperatorTool['id'];
  transformNode?: CanonicalNode;
  modelOperation?: CanvasRelationalOperation;
  relationId: string;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const selected = useSelectedRelationTool(relationId, operation, 'edit');
  const [setPropertiesPending, setOutputsPending] = usePendingRelationEdits(onPendingChange);
  if (selected == null) return null;
  const hasExpression =
    transformNode != null &&
    relationExpressionRefs(selected.target.relation).some((ref) => ref.slot !== 'sort-key');
  const presentation = operation === 'window' && !selected.tool.enabled ? 'projection' : operation;
  const title =
    resolveCanvasViewCopy(language)[
      resolveCanvasRelationalOperationPresentation(presentation).labelKey
    ];
  return (
    <CanvasRelationalTreeEditorFrame
      hasExpression={hasExpression}
      readOnly={false}
      operation={presentation}
      relationId={relationId}
      onClose={onClose}
      output={
        <CanvasRelationOutputs
          relationId={relationId}
          disabled={false}
          onChange={onChange}
          onPendingChange={setOutputsPending}
        />
      }
    >
      {!hasExpression ? null : (
        <CanvasRelationalExpressionTree
          transformNode={transformNode}
          draft={draft}
          operation={modelOperation}
          relationId={relationId}
        />
      )}
      <div className="min-h-0 overflow-auto p-3">
        {selected.tool.enabled ? (
          <CanvasRelationalTreeOperatorForm
            key={`${relationId}:${selected.analysis.revision}`}
            inline
            tool={selected.tool}
            draft={draft}
            targetRelationId={relationId}
            title={title}
            onChange={onChange}
            onClose={onClose}
            onPendingChange={setPropertiesPending}
          />
        ) : (
          <p role="status">{resolveCanvasSemanticEditorCopy(language).inspectionOnly}</p>
        )}
      </div>
    </CanvasRelationalTreeEditorFrame>
  );
}
