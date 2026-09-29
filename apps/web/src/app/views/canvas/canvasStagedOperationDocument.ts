/** Resolve and normalize semantic documents owned by staged graph operations. */
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { createSourceDocument } from './canvasSourceDocument';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { CanvasRelationalFieldReference } from './canvasRelationalTreeDrag';

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

/** Edit an ancestor in its complete configured tree so the canonical command rebinds consumers. */
export function resolveCanvasStagedEditingDocument(
  operation: CanvasStagedOperation,
  operations: readonly CanvasStagedOperation[]
): SubstraitDocument | null {
  let document = decodeCanvasStagedOperation(operation);
  let id = operation.id;
  const visited = new Set<string>();
  while (!visited.has(id)) {
    visited.add(id);
    const consumer = operations.find((candidate) => candidate.inputs.includes(id));
    const next = decodeCanvasStagedOperation(consumer);
    if (consumer == null || next == null) break;
    const indexed = indexSubstraitRelations(next);
    if (!indexed.ok || !indexed.index.relations.has(operation.id)) break;
    document = next;
    id = consumer.id;
  }
  return document;
}

/** Project one owned subtree without changing expressions, aliases or stable field identities. */
export function projectCanvasStagedDocument(
  document: SubstraitDocument,
  relationId: string
): SubstraitDocument | null {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) return null;
  const root = indexed.index.relations.get(relationId);
  if (root == null) return null;
  const reachable = new Set([relationId]);
  for (const id of reachable)
    for (const input of indexed.index.relations.get(id)!.inputs) reachable.add(input);
  return createSourceDocument(
    indexed.index.postorder
      .filter((id) => reachable.has(id))
      .map((id) => indexed.index.relations.get(id)!),
    root,
    document.plan
  );
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
  return projectCanvasStagedDocument(args.canonical, relationId);
}

/** Open the exact authority behind a field drag; staged plans carry their own revision scope. */
export function openCanvasStagedFieldProducer(args: {
  reference: CanvasRelationalFieldReference;
  operations: readonly CanvasStagedOperation[];
  canonical: SubstraitDocument | null;
  canonicalSession: CanvasRelationAnalysisSession | null;
}): Readonly<{
  document: SubstraitDocument;
  session: CanvasRelationAnalysisSession;
  dispose: () => void;
}> | null {
  const staged = args.operations.find((operation) => operation.id === args.reference.relationId);
  if (staged != null) {
    if (
      args.reference.rootId !== staged.id ||
      args.reference.producerPlanSha256 == null ||
      args.reference.producerPlanSha256 !== staged.semanticDocument?.semanticPlan.sha256
    )
      return null;
    const document = decodeCanvasStagedOperation(staged);
    if (document == null) return null;
    const session = new CanvasRelationAnalysisSession(`${staged.id}:field-producer`);
    try {
      session.receive(document);
      if (session.rootId !== staged.id) {
        session.dispose();
        return null;
      }
      return { document, session, dispose: () => session.dispose() };
    } catch {
      session.dispose();
      return null;
    }
  }
  if (
    args.reference.producerPlanSha256 != null ||
    args.canonical == null ||
    args.canonicalSession == null
  )
    return null;
  return {
    document: args.canonical,
    session: args.canonicalSession,
    dispose: () => undefined,
  };
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
