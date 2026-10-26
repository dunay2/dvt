/** Own the JOIN/CROSS/SET inspector frame and its independent pending form channels. */
import { usePendingRelationEdits } from './usePendingRelationEdits';
import { useSelectedRelation } from './useSelectedRelation';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';
import { CanvasCalculatedRelationOutputs } from './CanvasCalculatedRelationOutputs';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import {
  CanvasRelationalTreeOperationEditor,
  type CanvasRelationalTreeOperationEditorProps,
} from './CanvasRelationalTreeOperationEditor';

export type CanvasRelationalTreeCompositionEditorProps = Omit<
  CanvasRelationalTreeOperationEditorProps,
  'cross' | 'set'
> &
  Readonly<{
    operation: CanvasRelationalOperation;
    expanded: boolean;
    onClose: () => void;
    onSelectRelation?: (relationId: string) => void;
  }>;

export function CanvasRelationalTreeCompositionEditor(
  props: CanvasRelationalTreeCompositionEditorProps
): JSX.Element {
  const [setPropertiesPending, setOutputsPending] = usePendingRelationEdits(
    props.onPendingConditionChange
  );
  const selected = useSelectedRelation(props.selectedRelationId)?.relation.relType;
  const join = selected?.case === 'join' ? selected.value : null;
  const unary = join == null && selected?.case !== 'cross' && selected?.case !== 'set';
  return (
    <CanvasRelationalTreeEditorFrame
      operation={join == null ? props.operation : canvasJoinOperationForType(join.type)}
      relationId={props.selectedRelationId}
      hasExpression={join != null}
      hidden={unary || !props.expanded}
      onClose={props.onClose}
      output={
        props.selectedRelationId == null ? null : (
          <CanvasCalculatedRelationOutputs
            key={props.selectedRelationId}
            relationId={props.selectedRelationId}
            onChange={props.onChangeJoinDraft}
            onPendingChange={setOutputsPending}
            onSaved={props.onSelectRelation}
            allowCalculatedFields={join != null}
          />
        )
      }
    >
      <CanvasRelationalTreeOperationEditor
        {...props}
        cross={selected?.case === 'cross'}
        set={selected?.case === 'set'}
        onPendingConditionChange={setPropertiesPending}
      />
    </CanvasRelationalTreeEditorFrame>
  );
}
