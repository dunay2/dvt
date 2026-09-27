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
  reservedAliases?: readonly string[];
};
export function CanvasRelationalTreeInlineEditor(
  props: Readonly<InlineEditorProps>
): JSX.Element | null {
  const { joinDraft, operation, selectedRelationId } = props;
  const [setCompositionPending, setSelectionPending] = usePendingRelationEdits(
    props.onPendingConditionChange
  );
  const [setPropertiesPending, setOutputsPending] = usePendingRelationEdits(setCompositionPending);
  const selected = useSelectedRelation(selectedRelationId)?.relation.relType;
  if (operation == null || joinDraft == null) return null;
  const selectedJoin = selected?.case === 'join' ? selected.value : null;
  const selectedCross = selected?.case === 'cross';
  const selectedSet = selected?.case === 'set';
  const selectedUnary = !selectedJoin && !selectedCross && !selectedSet;
  return (
    <>
      {selectedUnary && props.expanded ? (
        <CanvasRelationalTreeSelectedOperatorEditor
          draft={joinDraft}
          operation={operation}
          relationId={selectedRelationId}
          transformNode={props.transformNode}
          onChange={props.onChangeJoinDraft}
          onClose={props.onClose}
          onPendingConditionChange={setSelectionPending}
          reservedAliases={props.reservedAliases}
        />
      ) : null}
      <CanvasRelationalTreeEditorFrame
        operation={selectedJoin == null ? operation : canvasJoinOperationForType(selectedJoin.type)}
        relationId={selectedRelationId}
        hasExpression={selectedJoin != null}
        hidden={selectedUnary || !props.expanded}
        onClose={props.onClose}
        output={
          selectedRelationId == null ? null : (
            <CanvasRelationOutputs
              key={selectedRelationId}
              relationId={selectedRelationId}
              disabled={false}
              onChange={props.onChangeJoinDraft}
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
