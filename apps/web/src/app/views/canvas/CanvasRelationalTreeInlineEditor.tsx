/** Owned concern: edit the operation selected in the central relational draft canvas. */
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import {
  inspectDvtSubstraitJoinPredicateContext,
  type DvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';
import { CanvasRelationalTreeSelectedOperatorEditor } from './CanvasRelationalTreeSelectedOperatorEditor';
import { SourceOccurrenceProperties } from './relational-source-occurrence/SourceOccurrenceProperties';
import {
  CanvasRelationalTreeOperationEditor,
  type CanvasRelationalTreeOperationEditorProps,
} from './CanvasRelationalTreeOperationEditor';

type InlineEditorProps = Omit<CanvasRelationalTreeOperationEditorProps, 'cross' | 'draft'> & {
  joinDraft: DvtSubstraitJoinDraft | null;
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
  if (operation == null || joinDraft == null) return null;
  const read = joinDraft.sidecar.relations.find(
    (binding) => binding.relationId === selectedRelationId && binding.sourceRef != null
  );
  if (read != null && appendInput == null && expanded)
    return (
      <SourceOccurrenceProperties
        key={read.relationId}
        draft={joinDraft}
        relationId={read.relationId}
        onChange={onChangeJoinDraft}
        onClose={onClose}
        onPendingChange={props.onPendingConditionChange}
      />
    );
  const inspection = inspectDvtSubstraitJoinPredicateContext(joinDraft)?.inspection;
  const selectedJoin = inspection?.projection.joinRelations.find(
    ({ relationId }) => relationId === selectedRelationId
  );
  const selectedCross = operation === 'cross_join' && selectedRelationId != null;
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
        />
      ) : null}
      <CanvasRelationalTreeEditorFrame
        operation={
          selectedJoin == null ? operation : canvasJoinOperationForType(selectedJoin.joinType)
        }
        relationId={selectedRelationId}
        hasExpression={selectedJoin != null && appendInput == null}
        hidden={appendInput == null && ((!selectedJoin && !selectedCross) || !expanded)}
        onClose={onClose}
      >
        <CanvasRelationalTreeOperationEditor {...props} cross={selectedCross} draft={joinDraft} />
      </CanvasRelationalTreeEditorFrame>
    </>
  );
}
