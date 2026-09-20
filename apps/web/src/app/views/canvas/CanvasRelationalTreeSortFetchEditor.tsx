/** Owned concern: edit the selected canonical SortRel or FetchRel in the contextual tree surface. */
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import {
  inspectCanvasDvtSubstraitSortFetch,
  selectCanvasDvtSubstraitSortFetch,
} from './canvasDvtSubstraitSortFetch';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';

export function CanvasRelationalTreeSortFetchEditor({
  draft,
  operation,
  relationId,
  onChange,
  onClose,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  operation: 'sort' | 'fetch';
  relationId: string;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
}>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const selectedDraft = selectCanvasDvtSubstraitSortFetch(draft, relationId);
  const tool = resolveCanvasRelationalOperatorTools(selectedDraft ?? draft).find(
    (item) => item.id === operation
  );
  if (tool == null) return null;
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
          inline
          tool={tool}
          draft={draft}
          targetRelationId={relationId}
          title={title}
          onChange={onChange}
          onClose={onClose}
        />
      </div>
    </CanvasRelationalTreeEditorFrame>
  );
}

export function selectedCanvasDvtSortFetchOperation(
  draft: DvtSubstraitProjectionDraft,
  relationId: string | null
): 'sort' | 'fetch' | null {
  if (relationId == null) return null;
  const selected = selectCanvasDvtSubstraitSortFetch(draft, relationId);
  const inspection = inspectCanvasDvtSubstraitSortFetch(selected ?? draft);
  return inspection.ok && inspection.relationId === relationId ? inspection.operation : null;
}
