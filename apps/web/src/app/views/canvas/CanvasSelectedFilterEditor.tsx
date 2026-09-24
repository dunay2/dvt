/** Compose the shared selected-relation command with the existing property form. */
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';

export function CanvasSelectedFilterEditor({
  draft,
  relationId,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  relationId: string;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element | null {
  const filter = useSelectedRelationTool(relationId, 'filter', 'edit');
  if (filter == null) return null;
  return (
    <CanvasRelationalTreeEditorFrame operation="filter" relationId={relationId} onClose={onClose}>
      {filter.tool.enabled ? (
        <CanvasRelationalTreeOperatorForm
          key={`${relationId}:${filter.analysis?.revision}`}
          inline
          tool={filter.tool}
          draft={draft}
          targetRelationId={relationId}
          title="Filter"
          onChange={onChange}
          onClose={onClose}
          onPendingChange={onPendingChange}
        />
      ) : null}
    </CanvasRelationalTreeEditorFrame>
  );
}
