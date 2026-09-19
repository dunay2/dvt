/** Owned concern: render the contextual editor body for the selected relational operation. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalCrossNotice } from './CanvasRelationalCrossNotice';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';

export type CanvasRelationalTreeOperationEditorProps = Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  draft: DvtSubstraitJoinDraft;
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onChangeJoinDraft: (draft: DvtSubstraitJoinDraft) => void;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId: string | null;
  transformNode: CanonicalNode;
  cross: boolean;
}>;

export function CanvasRelationalTreeOperationEditor({
  appendInput,
  copy,
  draft,
  onAppendJoinInput,
  onChangeJoinDraft,
  onPendingConditionChange,
  selectedRelationId,
  transformNode,
  cross,
}: CanvasRelationalTreeOperationEditorProps): JSX.Element {
  if (cross && appendInput == null) return <CanvasRelationalCrossNotice />;
  return (
    <CanvasRelationalTreeJoinEditor
      appendInput={appendInput}
      copy={copy}
      draft={draft}
      onAppend={onAppendJoinInput}
      onChange={onChangeJoinDraft}
      onPendingConditionChange={onPendingConditionChange}
      selectedRelationId={selectedRelationId}
      transformNode={transformNode}
    />
  );
}
