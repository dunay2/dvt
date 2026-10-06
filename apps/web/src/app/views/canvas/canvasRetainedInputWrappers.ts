/**
 * Owned concern: restore a retained JOIN by replaying admitted input wrappers atomically.
 * @baseline ADR-0064: canonical selected-relation transactions own semantic rebinding.
 * @decision Keep exact-input restoration intact and reuse its document in a disposable session.
 * @consequence No replacement JOIN, partial publication or parallel composition kernel is created.
 * @version 1.0.0
 */
import {
  cloneLocalRelation,
  indexSubstraitRelations,
  readRelationStructure,
  SubstraitAnalysisError,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { commitSelectedRelation } from './canvasCommitSelectedRelation';
import { admitCanvasRetainedInputWrappers } from './canvasRetainedInputWrapperAdmission';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';

async function replayWrapper(session: CanvasRelationAnalysisSession, wrapper: IndexedRelation) {
  const input = session.locate(wrapper.inputs[0]!, session.revision);
  const relation = cloneLocalRelation(wrapper.relation, [input.relation]);
  readRelationStructure(relation).common!.relAnchor = input.nextAnchor;
  return commitSelectedRelation(session, {
    relationId: input.binding.relationId,
    expectedRevision: session.revision,
    intent: 'insert',
    replacement: {
      relation,
      binding: { ...wrapper.binding, relAnchor: input.nextAnchor },
      fields: wrapper.fields,
    },
    createdInputs: new Map([[wrapper.binding.relationId, wrapper.inputs]]),
  });
}

export async function restoreCanvasRetainedInputWrappers(
  operation: CanvasStagedOperation,
  producers: readonly (SubstraitDocument | null)[]
): Promise<CanvasStagedOperation> {
  if (
    operation.configurationDocument == null ||
    operation.semanticDocument != null ||
    operation.inputs.some((input) => input == null)
  )
    return operation;
  const document = decodeDvtSubstraitSemanticDocument(operation.configurationDocument);
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok || indexed.index.rootId !== operation.id) return operation;
  const root = indexed.index.relations.get(operation.id)!;
  if (
    root.relation.relType.case !== 'join' ||
    root.inputs.length !== producers.length ||
    root.inputs.length !== operation.inputs.length
  )
    return operation;
  if (canvasJoinOperationForType(root.relation.relType.value.type) !== operation.operation)
    return operation;
  const session = new CanvasRelationAnalysisSession(operation.id);
  try {
    const chains = producers.map((producer, port) =>
      producer == null
        ? null
        : admitCanvasRetainedInputWrappers(
            document,
            root.inputs[port]!,
            producer,
            operation.inputs[port]!
          )
    );
    if (chains.some((chain) => chain == null) || chains.every((chain) => chain!.length === 0))
      return operation;
    session.receive(document);
    let result = document;
    for (const chain of chains) {
      for (const wrapper of chain!) result = await replayWrapper(session, wrapper);
    }
    const { configurationDocument: _, ...restored } = operation;
    return { ...restored, semanticDocument: encodeDvtSubstraitSemanticDocument(result) };
  } catch (error) {
    if (error instanceof SubstraitAnalysisError) return operation;
    throw error;
  } finally {
    session.dispose();
  }
}
