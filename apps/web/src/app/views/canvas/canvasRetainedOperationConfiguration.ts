/** Retain non-executable configuration and restore only against exact original Inputs. */
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { projectCanvasStagedDocument } from './canvasStagedOperationDocument';
import { canvasCanonicalProducerIdentity } from './canvasCanonicalProducerIdentity';

export function invalidateCanvasOperationConfiguration(
  operation: CanvasStagedOperation
): CanvasStagedOperation {
  if (operation.semanticDocument == null) return operation;
  const { semanticDocument, ...pending } = operation;
  return { ...pending, configurationDocument: semanticDocument };
}

export function invalidateCanvasOperationConsumers(
  operations: readonly CanvasStagedOperation[],
  changedProducers: ReadonlySet<string>
): readonly CanvasStagedOperation[] {
  const invalidated = new Set(changedProducers);
  for (let size = -1; size !== invalidated.size;) {
    size = invalidated.size;
    for (const operation of operations) {
      if (operation.inputs.some((input) => input != null && invalidated.has(input))) {
        invalidated.add(operation.id);
      }
    }
  }
  return operations.map((operation) =>
    !changedProducers.has(operation.id) && invalidated.has(operation.id)
      ? invalidateCanvasOperationConfiguration(operation)
      : operation
  );
}

export function restoreCanvasOperationConfiguration(
  operation: CanvasStagedOperation,
  producers: readonly (SubstraitDocument | null)[]
): CanvasStagedOperation {
  if (
    operation.configurationDocument == null ||
    operation.semanticDocument != null ||
    operation.inputs.some((input) => input == null)
  )
    return operation;
  const document = decodeDvtSubstraitSemanticDocument(operation.configurationDocument);
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok || indexed.index.rootId !== operation.id) return operation;
  const previous = indexed.index.relations.get(operation.id)!.inputs;
  if (
    previous.length !== producers.length ||
    previous.some((id, port) => id !== operation.inputs[port])
  )
    return operation;
  if (
    producers.some((producer, port) => {
      const saved = projectCanvasStagedDocument(document, previous[port]!);
      if (producer == null || saved == null) return true;
      const identity = canvasCanonicalProducerIdentity(producer);
      return identity == null || identity !== canvasCanonicalProducerIdentity(saved);
    })
  )
    return operation;
  const { configurationDocument, ...restored } = operation;
  return { ...restored, semanticDocument: configurationDocument };
}
