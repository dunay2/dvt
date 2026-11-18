/** Translate an accepted staged composition into its public operation and canonical document. */
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { canvasJoinOperationForType, isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import type { CanvasStagedOperation } from './canvasStagedOperation';

export function projectCanvasStagedCompositionUpdate(
  document: SubstraitDocument,
  staged: CanvasStagedOperation
) {
  const index = indexSubstraitRelations(document);
  const relation = index.ok ? index.index.relations.get(staged.id)?.relation.relType : undefined;
  const operation =
    relation?.case === 'cross' || relation?.case === 'set'
      ? staged.operation
      : relation?.case === 'join'
        ? canvasJoinOperationForType(relation.value.type)
        : null;
  if (
    operation == null ||
    (relation?.case === 'join' && !isCanvasJoinOperation(operation)) ||
    operation === 'unsupported'
  )
    return null;
  return { operation, semanticDocument: encodeDvtSubstraitSemanticDocument(document) };
}
