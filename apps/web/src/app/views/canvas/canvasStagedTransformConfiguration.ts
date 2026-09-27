/** Materialize one staged Transform over the exact connected producer. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { insertSelectedRelationTransform } from './canvasSelectedRelationTransform';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { assignCanvasStagedRoot } from './canvasStagedOperationDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

export async function configureCanvasStagedTransform(
  operation: CanvasStagedOperation,
  producer: SubstraitDocument | null
): Promise<CanvasStagedOperation> {
  if (
    operation.operation !== 'field_transform' ||
    operation.semanticDocument != null ||
    operation.inputs[0] == null ||
    producer == null
  )
    return operation;
  const session = new CanvasRelationAnalysisSession(`${operation.id}:configuration`);
  try {
    session.receive(producer);
    if (session.rootId !== operation.inputs[0]) return operation;
    const result = await insertSelectedRelationTransform(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
    });
    return {
      ...operation,
      semanticDocument: encodeDvtSubstraitSemanticDocument(
        assignCanvasStagedRoot(result.document, operation.id)
      ),
    };
  } catch {
    return operation;
  } finally {
    session.dispose();
  }
}
