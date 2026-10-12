/** Read-only card projection for pending and configured staged operations. */
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import {
  readCanvasStagedCompositionSignature,
  type CanvasStagedOperation,
} from './canvasStagedOperation';

export function projectCanvasStagedOperation(
  staged: CanvasStagedOperation
): CanvasRelationalTreeNode {
  const document = decodeCanvasStagedOperation(staged);
  const indexed = document == null ? null : indexSubstraitRelations(document);
  if (indexed?.ok && indexed.index.rootId === staged.id) {
    const root = buildCanvasRelationalTreeRelation({ index: indexed.index, digest: staged.id });
    return { ...root, locator: staged.id, operation: staged.operation };
  }
  return {
    locator: staged.id,
    operator: readCanvasStagedCompositionSignature(staged.operation).operator,
    substraitKind: 'pending',
    operation: staged.operation,
    relationId: staged.id,
    displayName: null,
    sourceRef: null,
    output: { fields: [] },
    expressionRefs: [],
    decorations: [],
    children: [],
  };
}
