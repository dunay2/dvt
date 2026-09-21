/** Owned concern: bind a selected Read or unary operation to its existing editor owner. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { CanvasRelationalTreeExpressionOperatorEditor } from './CanvasRelationalTreeExpressionOperatorEditor';
import { SourceOccurrenceProperties } from './relational-source-occurrence/SourceOccurrenceProperties';
import {
  CanvasRelationalTreeSortFetchEditor,
  selectedCanvasDvtSortFetchOperation,
} from './CanvasRelationalTreeSortFetchEditor';

export function CanvasRelationalTreeSelectedOperatorEditor({
  draft,
  operation,
  relationId,
  transformNode,
  onChange,
  onClose,
  onPendingConditionChange,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  operation: CanvasRelationalOperation;
  relationId: string | null;
  transformNode: CanonicalNode;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
  onPendingConditionChange?: (pending: boolean) => void;
}>): JSX.Element | null {
  const read = draft.sidecar.relations.find(
    (binding) => binding.relationId === relationId && binding.sourceRef != null
  );
  if (read != null)
    return (
      <SourceOccurrenceProperties
        key={read.relationId}
        draft={draft}
        relationId={read.relationId}
        onChange={onChange}
        onClose={onClose}
        onPendingChange={onPendingConditionChange}
      />
    );
  const sortFetchOperation = selectedCanvasDvtSortFetchOperation(draft, relationId);
  if (sortFetchOperation != null && relationId != null) {
    return (
      <CanvasRelationalTreeSortFetchEditor
        draft={draft}
        operation={sortFetchOperation}
        relationId={relationId}
        onChange={onChange}
        onClose={onClose}
      />
    );
  }
  return (
    <CanvasRelationalTreeExpressionOperatorEditor
      draft={draft}
      operation={operation}
      relationId={relationId}
      transformNode={transformNode}
      onChange={onChange}
      onClose={onClose}
    />
  );
}
