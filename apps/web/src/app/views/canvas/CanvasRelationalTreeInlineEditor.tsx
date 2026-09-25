/** Owned concern: edit the operation selected in the central relational draft canvas. */
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { usePendingRelationEdits } from './usePendingRelationEdits';
import { useSelectedRelation } from './useSelectedRelation';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';
import { CanvasRelationalTreeSelectedOperatorEditor } from './CanvasRelationalTreeSelectedOperatorEditor';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';
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
  const [setCompositionPending, setSelectionPending] = usePendingRelationEdits(
    props.onPendingConditionChange
  );
  const [setPropertiesPending, setOutputsPending] = usePendingRelationEdits(setCompositionPending);
  const selected = useSelectedRelation(selectedRelationId)?.relation.relType;
  if (operation == null || joinDraft == null) return null;
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
        output={
          selectedRelationId == null || appendInput != null ? null : (
            <CanvasRelationOutputs
              key={selectedRelationId}
              relationId={selectedRelationId}
              disabled={false}
              onChange={onChangeJoinDraft}
              onPendingChange={setOutputsPending}
            />
          )
        }
      >
        <CanvasRelationalTreeOperationEditor
          {...props}
          cross={selectedCross}
          set={selectedSet}
          draft={joinDraft}
          onPendingConditionChange={setPropertiesPending}
        />
      </CanvasRelationalTreeEditorFrame>
    </>
  );
}
