/** Owned concern: render the contextual editor body for the selected relational operation. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalCrossNotice } from './CanvasRelationalCrossNotice';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { SourceOccurrenceAppendForm } from './relational-source-occurrence/SourceOccurrenceAppendForm';

export type CanvasRelationalTreeOperationEditorProps = Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  draft: SubstraitDocument;
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onChangeJoinDraft: (draft: SubstraitDocument) => void;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId: string | null;
  transformNode: CanonicalNode;
  cross: boolean;
  set?: boolean;
}>;

export function CanvasRelationalTreeOperationEditor({
  appendInput,
  copy,
  onAppendJoinInput,
  onChangeJoinDraft,
  onPendingConditionChange,
  selectedRelationId,
  cross,
  set = false,
}: CanvasRelationalTreeOperationEditorProps): JSX.Element {
  return (
    <div className="space-y-4">
      {appendInput == null ? null : (
        <SourceOccurrenceAppendForm
          appendInput={appendInput}
          copy={copy}
          onAppend={onAppendJoinInput}
        />
      )}
      {cross && appendInput == null ? <CanvasRelationalCrossNotice /> : null}
      <CanvasRelationalTreeJoinEditor
        copy={copy}
        onChange={onChangeJoinDraft}
        onPendingConditionChange={onPendingConditionChange}
        selectedRelationId={appendInput != null || cross || set ? null : selectedRelationId}
      />
    </div>
  );
}
