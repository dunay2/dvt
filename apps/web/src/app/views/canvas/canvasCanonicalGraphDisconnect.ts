/** Project a complete tree into the existing authoring graph before disconnecting one port. */
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { projectCanvasStagedDocument } from './canvasStagedOperationDocument';
import { canvasPresentationOperationForRel } from './canvasRelationalOperationSelector';
import {
  disconnectCanvasStagedOperation,
  isCanvasStagedOperationKind,
  canvasStagedOperationArity,
  type CanvasStagedOperation,
} from './canvasStagedOperation';
import { invalidateCanvasOperationConsumers } from './canvasRetainedOperationConfiguration';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';

export function disconnectCanvasCanonicalGraph(
  document: SubstraitDocument,
  consumerId: string,
  port: number,
  sourceNodeIds: readonly string[]
): Readonly<{
  sources: readonly PendingSourceOccurrence[];
  operations: readonly CanvasStagedOperation[];
}> | null {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) return null;
  const entries = [...indexed.index.relations.values()];
  const consumer = indexed.index.relations.get(consumerId);
  if (consumer == null || !Number.isInteger(port) || port < 0 || port >= consumer.inputs.length)
    return null;
  const reads = entries
    .filter((entry) => entry.relation.relType.case === 'read')
    .sort((a, b) => a.binding.relAnchor - b.binding.relAnchor);
  if (
    reads.length !== sourceNodeIds.length ||
    reads.some((read) => read.binding.displayName == null)
  )
    return null;
  const sources: PendingSourceOccurrence[] = reads.map((read, ordinal) => ({
    sourceNodeId: sourceNodeIds[ordinal]!,
    read: {
      relation: read.relation,
      binding: { ...read.binding, displayName: read.binding.displayName! },
      fields: read.fields,
    },
  }));
  const operations: CanvasStagedOperation[] = [];
  for (const entry of entries) {
    if (entry.relation.relType.case === 'read') continue;
    const operation = canvasPresentationOperationForRel(entry.relation);
    const subtree = projectCanvasStagedDocument(document, entry.binding.relationId);
    if (
      !isCanvasStagedOperationKind(operation) ||
      subtree == null ||
      canvasStagedOperationArity(operation) !== entry.inputs.length
    )
      return null;
    operations.push({
      id: entry.binding.relationId,
      operation,
      inputs: entry.inputs,
      semanticDocument: encodeDvtSubstraitSemanticDocument(subtree),
    });
  }
  return {
    sources,
    operations: invalidateCanvasOperationConsumers(
      operations.map((operation) =>
        operation.id === consumerId ? disconnectCanvasStagedOperation(operation, port) : operation
      ),
      new Set([consumerId])
    ),
  };
}
