/** Owned concern: bind a selected unary operation to its existing expression and mutation owners. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { CanvasRelationalTreeExpressionOperatorEditor } from './CanvasRelationalTreeExpressionOperatorEditor';
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
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  operation: CanvasRelationalOperation;
  relationId: string | null;
  transformNode: CanonicalNode;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
}>): JSX.Element | null {
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
