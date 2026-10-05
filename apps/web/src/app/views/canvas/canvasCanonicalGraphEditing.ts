/**
 * Owned concern: project canonical relations into the existing editable operation graph.
 * @baseline ADR-0064: relation and field identities survive topology changes.
 * @decision Reuse one lossless projection for connect and disconnect commands.
 * @consequence Unsupported or incomplete projections reject atomically instead of guessing inputs.
 * @version 1.0.0
 */
import { acceptsDvtRelationalOperationInputCount } from '@dvt/contracts';
import {
  indexSubstraitRelations,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { projectCanvasStagedDocument } from './canvasStagedOperationDocument';
import { canvasPresentationOperationForRel } from './canvasRelationalOperationSelector';
import {
  disconnectCanvasStagedOperation,
  isCanvasStagedOperationKind,
  type CanvasStagedOperation,
} from './canvasStagedOperation';
import { invalidateCanvasOperationConsumers } from './canvasRetainedOperationConfiguration';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';

export function projectCanvasCanonicalGraphEditing(
  document: SubstraitDocument,
  sourceNodeIds: readonly string[]
): Readonly<{
  sources: readonly PendingSourceOccurrence[];
  operations: readonly CanvasStagedOperation[];
}> | null {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) return null;
  const entries = [...indexed.index.relations.values()];
  const sources = projectSources(entries, sourceNodeIds);
  if (sources == null) return null;
  const operations = entries
    .filter((entry) => entry.relation.relType.case !== 'read')
    .map((entry) => projectOperation(document, entry));
  if (operations.some((operation) => operation == null)) return null;
  return { sources, operations: operations.filter((operation) => operation != null) };
}

function projectSources(
  entries: readonly IndexedRelation[],
  sourceNodeIds: readonly string[]
): readonly PendingSourceOccurrence[] | null {
  const reads = entries
    .filter((entry) => entry.relation.relType.case === 'read')
    .sort((a, b) => a.binding.relAnchor - b.binding.relAnchor);
  if (
    reads.length !== sourceNodeIds.length ||
    reads.some((read) => read.binding.displayName == null)
  )
    return null;
  return reads.map((read, ordinal) => ({
    sourceNodeId: sourceNodeIds[ordinal]!,
    read: {
      relation: read.relation,
      binding: { ...read.binding, displayName: read.binding.displayName! },
      fields: read.fields,
    },
  }));
}

function projectOperation(
  document: SubstraitDocument,
  entry: IndexedRelation
): CanvasStagedOperation | null {
  const operation = canvasPresentationOperationForRel(entry.relation);
  const subtree = projectCanvasStagedDocument(document, entry.binding.relationId);
  if (
    !isCanvasStagedOperationKind(operation) ||
    subtree == null ||
    !acceptsDvtRelationalOperationInputCount(operation, entry.inputs.length)
  )
    return null;
  return {
    id: entry.binding.relationId,
    operation,
    inputs: entry.inputs,
    semanticDocument: encodeDvtSubstraitSemanticDocument(subtree),
  };
}

export function disconnectCanvasCanonicalGraph(
  document: SubstraitDocument,
  consumerId: string,
  port: number,
  sourceNodeIds: readonly string[]
) {
  const graph = projectCanvasCanonicalGraphEditing(document, sourceNodeIds);
  const target = graph?.operations.find((operation) => operation.id === consumerId);
  if (graph == null || target == null) return null;
  const detached = disconnectCanvasStagedOperation(target, port);
  if (detached === target) return null;
  return {
    sources: graph.sources,
    operations: invalidateCanvasOperationConsumers(
      graph.operations.map((operation) => (operation === target ? detached : operation)),
      new Set([consumerId])
    ),
  };
}
