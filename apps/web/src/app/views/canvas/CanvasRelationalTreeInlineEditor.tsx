/** Owned concern: edit the operation selected in the central relational draft canvas. */
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { usePendingRelationEdits } from './usePendingRelationEdits';
import { useSelectedRelation } from './useSelectedRelation';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';
import { CanvasRelationalTreeSelectedOperatorEditor } from './CanvasRelationalTreeSelectedOperatorEditor';
import { CanvasCalculatedRelationOutputs } from './CanvasCalculatedRelationOutputs';
import { CanvasSourceOccurrenceOutputSelection } from './CanvasSourceOccurrenceOutputSelection';
import {
  CanvasRelationalTreeOperationEditor,
  type CanvasRelationalTreeOperationEditorProps,
} from './CanvasRelationalTreeOperationEditor';

type InlineEditorProps = Omit<CanvasRelationalTreeOperationEditorProps, 'cross' | 'draft'> & {
  joinDraft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
  expanded: boolean;
  onClose: () => void;
  onSelectRelation?: (relationId: string) => void;
  reservedAliases?: readonly string[];
  sourceOutputFieldsByRelationId: ReadonlyMap<string, readonly string[]>;
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
  const selectedUnary = !selectedJoin && selected?.case !== 'cross' && selected?.case !== 'set';
  return (
    <>
      {selectedUnary && props.expanded ? (
        <CanvasRelationalTreeSelectedOperatorEditor
          sourceOutput={
            selected?.case === 'read' && selectedRelationId != null ? (
              <CanvasSourceOccurrenceOutputSelection
                relationId={selectedRelationId}
                publishedFieldNames={
                  props.sourceOutputFieldsByRelationId.get(selectedRelationId) ?? []
                }
                onChange={props.onChangeJoinDraft}
              />
            ) : undefined
          }
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
            <CanvasCalculatedRelationOutputs
              key={selectedRelationId}
              relationId={selectedRelationId}
              onChange={props.onChangeJoinDraft}
              onPendingChange={setOutputsPending}
              onSaved={props.onSelectRelation}
              allowCalculatedFields={selectedJoin != null}
            />
          )
        }
      >
        <CanvasRelationalTreeOperationEditor
          {...props}
          cross={selected?.case === 'cross'}
          set={selected?.case === 'set'}
          draft={joinDraft}
          onPendingConditionChange={setPropertiesPending}
        />
      </CanvasRelationalTreeEditorFrame>
    </>
  );
}
