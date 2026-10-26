/** Coordinate selected-operation and composition editors without owning their forms. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { usePendingRelationEdits } from './usePendingRelationEdits';
import { CanvasRelationalTreeSelectedOperatorEditor } from './CanvasRelationalTreeSelectedOperatorEditor';
import {
  CanvasRelationalTreeCompositionEditor,
  type CanvasRelationalTreeCompositionEditorProps,
} from './CanvasRelationalTreeCompositionEditor';

type InlineEditorProps = Omit<CanvasRelationalTreeCompositionEditorProps, 'draft' | 'operation'> & {
  joinDraft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
  reservedAliases?: readonly string[];
  sourceOutputFieldsByRelationId: ReadonlyMap<string, readonly string[]>;
};

export function CanvasRelationalTreeInlineEditor(
  props: Readonly<InlineEditorProps>
): JSX.Element | null {
  const [setCompositionPending, setSelectionPending] = usePendingRelationEdits(
    props.onPendingConditionChange
  );
  if (props.operation == null || props.joinDraft == null) return null;
  return (
    <>
      {props.expanded ? (
        <CanvasRelationalTreeSelectedOperatorEditor
          sourceOutputFieldsByRelationId={props.sourceOutputFieldsByRelationId}
          draft={props.joinDraft}
          operation={props.operation}
          relationId={props.selectedRelationId}
          transformNode={props.transformNode}
          onChange={props.onChangeJoinDraft}
          onClose={props.onClose}
          onPendingConditionChange={setSelectionPending}
          reservedAliases={props.reservedAliases}
        />
      ) : null}
      <CanvasRelationalTreeCompositionEditor
        {...props}
        draft={props.joinDraft}
        operation={props.operation}
        onPendingConditionChange={setCompositionPending}
      />
    </>
  );
}
