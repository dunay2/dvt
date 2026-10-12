/** Resolve input schemas for inspection without requiring an executable graph. */
import { resolveProducerDocuments, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

export function resolveCanvasProducerDocument(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[]
): SubstraitDocument | undefined {
  const catalog = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  catalog.set(node.id, node);
  const documents = new Map<string, SubstraitDocument>();
  const pending = [node.id];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const candidate = catalog.get(id);
    if (candidate == null) continue;
    const authority = readDvtTransformAuthoringAuthority(candidate);
    if (authority == null) continue;
    const document = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
    documents.set(id, document);
    pending.push(
      ...document.sidecar.relations.flatMap((binding) =>
        binding.producerRef == null ? [] : [binding.producerRef.nodeId]
      )
    );
  }
  return resolveProducerDocuments(node.id, documents).get(node.id);
}
