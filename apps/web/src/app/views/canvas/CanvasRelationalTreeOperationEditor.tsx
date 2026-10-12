/** Owned concern: render the contextual editor body for the selected relational operation. */
import type { CanonicalNode } from '../../types/canonical';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalCrossNotice } from './CanvasRelationalCrossNotice';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';

export type CanvasRelationalTreeOperationEditorProps = Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  draft: SubstraitDocument;
  onChangeJoinDraft: (draft: SubstraitDocument) => void;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId: string | null;
  transformNode: CanonicalNode;
  cross: boolean;
  set?: boolean;
}>;

export function CanvasRelationalTreeOperationEditor({
  copy,
  onChangeJoinDraft,
  onPendingConditionChange,
  selectedRelationId,
  cross,
  set = false,
}: CanvasRelationalTreeOperationEditorProps): JSX.Element {
  return (
    <div className="space-y-4">
      {cross ? <CanvasRelationalCrossNotice /> : null}
      <CanvasRelationalTreeJoinEditor
        copy={copy}
        onChange={onChangeJoinDraft}
        onPendingConditionChange={onPendingConditionChange}
        selectedRelationId={cross || set ? null : selectedRelationId}
      />
    </div>
  );
}
