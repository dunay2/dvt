/** Owned concern: edit the operation selected in the central relational draft canvas. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
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
}>): JSX.Element | null {
  if (operation !== 'inner_join' || joinDraft == null) return null;

  return (
    <CanvasRelationalTreeEditorFrame
      title={canvasRelationalOperationLabel(operation, copy)}
      forceExpanded={appendInput != null}
    >
      <CanvasRelationalTreeJoinEditor
        key={appendInput?.nodeId ?? 'base'}
        appendInput={appendInput}
        copy={copy}
        draft={joinDraft}
        onAppend={onAppendJoinInput}
        onChange={onChangeJoinDraft}
        onPendingConditionChange={onPendingConditionChange}
      />
    </CanvasRelationalTreeEditorFrame>
  );
}
