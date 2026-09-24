/** Owned concern: edit the selected canonical SortRel or FetchRel in the contextual tree surface. */
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';

export function CanvasRelationalTreeSortFetchEditor({
  draft,
  operation,
  relationId,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  operation: 'sort' | 'fetch';
  relationId: string;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const selected = useSelectedRelationTool(relationId, operation, 'edit');
  if (selected == null || !selected.tool.enabled) return null;
  const title =
    resolveCanvasViewCopy(language)[
      resolveCanvasRelationalOperationPresentation(operation).labelKey
    ];
  return (
    <CanvasRelationalTreeEditorFrame
      hasExpression={false}
      operation={operation}
      relationId={relationId}
      onClose={onClose}
    >
      <div className="min-h-0 overflow-auto p-3">
        <CanvasRelationalTreeOperatorForm
          key={`${relationId}:${selected.analysis.revision}`}
          inline
          tool={selected.tool}
          draft={draft}
          targetRelationId={relationId}
          title={title}
          onChange={onChange}
          onClose={onClose}
          onPendingChange={onPendingChange}
        />
      </div>
    </CanvasRelationalTreeEditorFrame>
  );
}
