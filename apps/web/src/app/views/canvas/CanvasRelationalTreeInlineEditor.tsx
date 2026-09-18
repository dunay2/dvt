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
import type { CanonicalNode } from '../../types/canonical';

export function CanvasRelationalTreeInlineEditor({
  appendInput,
  copy,
  joinDraft,
  operation,
  onAppendJoinInput,
  onChangeJoinDraft,
  onPendingConditionChange,
  selectedRelationId,
  transformNode,
  expanded,
  onClose,
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
  transformNode: CanonicalNode;
  expanded: boolean;
  onClose: () => void;
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
      hidden={appendInput == null && (!selectedJoin || !expanded)}
      onClose={onClose}
    >
      <CanvasRelationalTreeJoinEditor
        appendInput={appendInput}
        copy={copy}
        draft={joinDraft}
        onAppend={onAppendJoinInput}
        onChange={onChangeJoinDraft}
        onPendingConditionChange={onPendingConditionChange}
        selectedRelationId={selectedRelationId}
        transformNode={transformNode}
      />
    </CanvasRelationalTreeEditorFrame>
  );
}
