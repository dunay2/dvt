/** Owned concern: edit the operation selected in the central relational draft canvas. */
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { useContext, useEffect, useRef, useState } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';
import { CanvasRelationalTreeSelectedOperatorEditor } from './CanvasRelationalTreeSelectedOperatorEditor';
import {
  CanvasRelationalTreeOperationEditor,
  type CanvasRelationalTreeOperationEditorProps,
} from './CanvasRelationalTreeOperationEditor';

type InlineEditorProps = Omit<CanvasRelationalTreeOperationEditorProps, 'cross' | 'draft'> & {
  joinDraft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
  expanded: boolean;
  onClose: () => void;
};

export function CanvasRelationalTreeInlineEditor(
  props: Readonly<InlineEditorProps>
): JSX.Element | null {
  const {
    appendInput,
    joinDraft,
    operation,
    selectedRelationId,
    transformNode,
    onChangeJoinDraft,
    expanded,
    onClose,
  } = props;
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [compositionPending, setCompositionPending] = useState(false);
  const [selectionPending, setSelectionPending] = useState(false);
  const pending = compositionPending || selectionPending;
  const pendingCallback = useRef(props.onPendingConditionChange);
  pendingCallback.current = props.onPendingConditionChange;
  useEffect(() => {
    pendingCallback.current?.(pending);
    return () => pendingCallback.current?.(false);
  }, [pending]);
  if (operation == null || joinDraft == null) return null;
  const selected =
    analysis?.error == null &&
    analysis?.revision === analysis?.session.revision &&
    selectedRelationId != null &&
    analysis?.document?.sidecar.relations.some(
      (binding) => binding.relationId === selectedRelationId
    )
      ? analysis.session.locate(selectedRelationId, analysis.revision).relation.relType
      : null;
  const selectedJoin = selected?.case === 'join' ? selected.value : null;
  const selectedCross = selected?.case === 'cross';
  const selectedSet = selected?.case === 'set';
  return (
    <>
      {!selectedJoin && appendInput == null && expanded ? (
        <CanvasRelationalTreeSelectedOperatorEditor
          draft={joinDraft}
          operation={operation}
          relationId={selectedRelationId}
          transformNode={transformNode}
          onChange={onChangeJoinDraft}
          onClose={onClose}
          onPendingConditionChange={setSelectionPending}
        />
      ) : null}
      <CanvasRelationalTreeEditorFrame
        operation={selectedJoin == null ? operation : canvasJoinOperationForType(selectedJoin.type)}
        relationId={selectedRelationId}
        hasExpression={selectedJoin != null && appendInput == null}
        hidden={
          appendInput == null && ((!selectedJoin && !selectedCross && !selectedSet) || !expanded)
        }
        onClose={onClose}
      >
        <CanvasRelationalTreeOperationEditor
          {...props}
          cross={selectedCross}
          set={selectedSet}
          draft={joinDraft}
          onPendingConditionChange={setCompositionPending}
        />
      </CanvasRelationalTreeEditorFrame>
    </>
  );
}
