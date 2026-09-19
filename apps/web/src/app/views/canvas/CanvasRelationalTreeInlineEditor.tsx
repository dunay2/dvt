/** Owned concern: edit the operation selected in the central relational draft canvas. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  inspectDvtSubstraitJoinPredicateContext,
  type DvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { canvasRelationalOperationLabel } from './DvtRelationalOperationChooser';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasRelationalTreeSelectedOperatorEditor } from './CanvasRelationalTreeSelectedOperatorEditor';
export function CanvasRelationalTreeInlineEditor({
  appendInput,
  copy,
  joinDraft,
  operation,
  onAppendJoinInput,
  onChangeJoinDraft,
  onPendingConditionChange,
  selectedRelationId,
  transformNode,
  expanded,
  onClose,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  joinDraft: DvtSubstraitJoinDraft | null;
  operation: CanvasRelationalOperation | null;
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onChangeJoinDraft: (draft: DvtSubstraitJoinDraft) => void;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId: string | null;
  transformNode: CanonicalNode;
  expanded: boolean;
  onClose: () => void;
}>): JSX.Element | null {
  if (operation == null || joinDraft == null) return null;
  const inspection = inspectDvtSubstraitJoinPredicateContext(joinDraft)?.inspection;
  const selectedJoin = inspection?.projection.joinRelations.some(
    ({ relationId }) => relationId === selectedRelationId
  );
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
        title={canvasRelationalOperationLabel(operation, copy)}
        relationId={selectedRelationId}
        hidden={appendInput == null && (!selectedJoin || !expanded)}
        onClose={onClose}
      >
        <CanvasRelationalTreeJoinEditor
          appendInput={appendInput}
          copy={copy}
          draft={joinDraft}
          onAppend={onAppendJoinInput}
          onChange={onChangeJoinDraft}
          onPendingConditionChange={onPendingConditionChange}
          selectedRelationId={selectedRelationId}
          transformNode={transformNode}
        />
      </CanvasRelationalTreeEditorFrame>
    </>
  );
}
