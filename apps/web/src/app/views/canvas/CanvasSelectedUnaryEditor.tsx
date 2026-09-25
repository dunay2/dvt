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
  const pending = usePendingRelationEdits(onPendingChange);
  if (selected == null) return null;
  const title =
    resolveCanvasViewCopy(language)[
      resolveCanvasRelationalOperationPresentation(operation).labelKey
    ];
  return (
    <CanvasRelationalTreeEditorFrame
      hasExpression={transformNode != null && operation !== 'sort' && operation !== 'fetch'}
      readOnly={false}
      operation={operation}
      relationId={relationId}
      onClose={onClose}
    >
      {transformNode == null ? null : (
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
            onPendingChange={pending.setProperties}
          />
        ) : (
          <p role="status">{resolveCanvasSemanticEditorCopy(language).inspectionOnly}</p>
        )}
        <CanvasRelationOutputs
          relationId={relationId}
          disabled={false}
          onChange={onChange}
          onPendingChange={pending.setOutputs}
        />
      </div>
    </CanvasRelationalTreeEditorFrame>
  );
}
