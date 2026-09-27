/** Resolve and normalize semantic documents owned by staged graph operations. */
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { createSourceDocument } from './canvasSourceDocument';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';

export function decodeCanvasStagedOperation(
  operation: CanvasStagedOperation | undefined
): SubstraitDocument | null {
  if (operation?.semanticDocument == null) return null;
  try {
    return decodeDvtSubstraitSemanticDocument(operation.semanticDocument);
  } catch {
    return null;
  }
}

export function resolveCanvasStagedProducerDocument(args: {
  relationId: string | null;
  canonical: SubstraitDocument | null;
  operations: readonly CanvasStagedOperation[];
  sources: readonly PendingSourceOccurrence[];
}): SubstraitDocument | null {
  const { relationId } = args;
  if (relationId == null) return null;
  const operation = args.operations.find((candidate) => candidate.id === relationId);
  const staged = decodeCanvasStagedOperation(operation);
  if (staged != null) return staged;
  const source = args.sources.find((candidate) => candidate.read.binding.relationId === relationId);
  if (source != null) return createSourceDocument([source.read], source.read);
  if (args.canonical == null) return null;
  const indexed = indexSubstraitRelations(args.canonical);
  return indexed.ok && indexed.index.relations.has(relationId) ? args.canonical : null;
}

export function assignCanvasStagedRoot(
  document: SubstraitDocument,
  relationId: string
): SubstraitDocument {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok || indexed.index.rootId === relationId) return document;
  const rootId = indexed.index.rootId;
  return {
    ...document,
    sidecar: {
      ...document.sidecar,
      relations: document.sidecar.relations.map((binding) =>
        binding.relationId === rootId
          ? { ...binding, relationId, displayName: 'field_transform' }
          : binding
      ),
      fields: document.sidecar.fields.map((field) =>
        field.relationId === rootId ? { ...field, relationId } : field
      ),
    },
  };
}
