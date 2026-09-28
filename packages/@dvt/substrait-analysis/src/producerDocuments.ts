/** Schema resolution does not grant execution: incomplete drafts retain their authored structure. */
import { SubstraitAnalysisError, type SubstraitDocument } from './document.js';
import { refreshProducerInputs } from './refreshProducerInputs.js';

export function resolveProducerDocuments(
  targetId: string,
  documents: ReadonlyMap<string, SubstraitDocument>
): ReadonlyMap<string, SubstraitDocument> {
  const result = new Map<string, SubstraitDocument>();
  const visiting = new Set<string>();
  const stack = [{ id: targetId, ready: false }];
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (result.has(item.id)) continue;
    const document = documents.get(item.id);
    if (document == null) continue;
    const inputs = document.sidecar.relations.flatMap((binding) =>
      binding.producerRef == null ? [] : [binding.producerRef.nodeId]
    );
    if (!item.ready) {
      if (visiting.has(item.id))
        throw new SubstraitAnalysisError(
          'invalid_binding',
          'Producer dependencies contain a cycle.'
        );
      visiting.add(item.id);
      stack.push({ ...item, ready: true });
      for (const id of inputs) stack.push({ id, ready: false });
      continue;
    }
    result.set(
      item.id,
      inputs.every((id) => result.has(id)) ? refreshProducerInputs(document, result) : document
    );
    visiting.delete(item.id);
  }
  return result;
}
