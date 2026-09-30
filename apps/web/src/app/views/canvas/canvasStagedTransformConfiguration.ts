/** Materialize one staged Transform over the exact connected producer. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { insertSelectedRelationTransform } from './canvasSelectedRelationTransform';
import {
  readCanvasStagedCompositionSignature,
  type CanvasStagedOperation,
} from './canvasStagedOperation';
import { assignCanvasStagedRoot } from './canvasStagedOperationDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';

export async function configureCanvasStagedTransform(
  operation: CanvasStagedOperation,
  producer: SubstraitDocument | null,
  fieldId?: string
): Promise<CanvasStagedOperation> {
  if (
    readCanvasStagedCompositionSignature(operation.operation).configuration !== 'transform' ||
    operation.semanticDocument != null ||
    operation.inputs[0] == null ||
    producer == null
  )
    return operation;
  const session = new CanvasRelationAnalysisSession(`${operation.id}:configuration`);
  try {
    session.receive(producer);
    if (session.rootId !== operation.inputs[0]) return operation;
    const selected =
      fieldId == null
        ? null
        : (await session.query(session.rootId)).bindings.find(
            (field) => field.fieldId === fieldId && field.parentFieldId == null
          );
    if (fieldId != null && selected == null) return operation;
    const result = await insertSelectedRelationTransform(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
    });
    const document =
      selected == null
        ? result.document
        : await changeSelectedRelationOutputs(session, {
            relationId: result.relationId,
            expectedRevision: session.revision,
            outputs: [{ slot: selected.outputOrdinal, alias: selected.displayName ?? '' }],
          });
    return {
      ...operation,
      semanticDocument: encodeDvtSubstraitSemanticDocument(
        assignCanvasStagedRoot(document, operation.id)
      ),
    };
  } catch {
    return operation;
  } finally {
    session.dispose();
  }
}
