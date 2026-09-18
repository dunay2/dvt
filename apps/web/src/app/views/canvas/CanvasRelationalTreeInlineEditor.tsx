/** Owned concern: edit the operation selected in the central relational draft canvas. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  inspectDvtSubstraitNInputJoinDraft,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { canvasRelationalOperationLabel } from './DvtRelationalOperationChooser';

export function CanvasRelationalTreeInlineEditor({
  appendInput,
  copy,
  joinDraft,
  operation,
  onAppendJoinInput,
  onChangeJoinDraft,
  onPendingConditionChange,
  selectedRelationId,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  joinDraft: DvtSubstraitInnerJoinDraft | null;
  operation: CanvasRelationalOperation | null;
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onChangeJoinDraft: (draft: DvtSubstraitInnerJoinDraft) => void;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId: string | null;
}>): JSX.Element | null {
  if (operation !== 'inner_join' || joinDraft == null) return null;
  const inspection = inspectDvtSubstraitNInputJoinDraft(joinDraft);
  const selectedJoin =
    inspection.ok &&
    inspection.projection.joinRelations.some(
      (relation) => relation.relationId === selectedRelationId
    );

  return (
    <CanvasRelationalTreeEditorFrame
      title={canvasRelationalOperationLabel(operation, copy)}
      forceExpanded={appendInput != null}
      hidden={!selectedJoin && appendInput == null}
    >
      <CanvasRelationalTreeJoinEditor
        appendInput={appendInput}
        copy={copy}
        draft={joinDraft}
        onAppend={onAppendJoinInput}
        onChange={onChangeJoinDraft}
        onPendingConditionChange={onPendingConditionChange}
        selectedRelationId={selectedRelationId}
      />
    </CanvasRelationalTreeEditorFrame>
  );
}
