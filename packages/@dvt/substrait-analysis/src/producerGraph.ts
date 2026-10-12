/** Resolve dependency ownership once for presentation, authoring and execution adapters. */
import type { ConnectedSourceRef, ConnectionRef, DvtInputBindingsV1 } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import { SubstraitAnalysisError, type SubstraitDocument } from './document.js';
import { resolveProducerDocuments } from './producerDocuments.js';
import { resolveProducerInput } from './producerInput.js';
import { requireProducerPublication } from './producerPublication.js';
import { indexSubstraitRelations, type SubstraitRelationIndex } from './relationIndex.js';

export type ProducerGraph = Readonly<{
  targetId: string;
  documents: ReadonlyMap<string, SubstraitDocument>;
  sources: ReadonlyMap<string, ConnectedSourceRef>;
  edges: readonly Readonly<{
    sourceId: string;
    targetId: string;
    inputBindings?: DvtInputBindingsV1;
  }>[];
  sourcePublications?: ReadonlyMap<string, ReadonlySet<string>>;
}>;
export type ResolvedProducer = Readonly<{
  document: SubstraitDocument;
  index: SubstraitRelationIndex;
  connection: ConnectionRef;
}>;

export function resolveProducerGraph(graph: ProducerGraph): ReadonlyMap<string, ResolvedProducer> {
  const documents = resolveProducerDocuments(graph.targetId, graph.documents);
  const incoming = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    const ids = incoming.get(edge.targetId) ?? new Set<string>();
    ids.add(edge.sourceId);
    incoming.set(edge.targetId, ids);
  }
  const resolved = new Map<string, ResolvedProducer>();
  const visiting = new Set<string>();
  const stack = [{ id: graph.targetId, ready: false }];
  const reject = (message: string): never => {
    throw new SubstraitAnalysisError('invalid_binding', message);
  };
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (resolved.has(item.id)) continue;
    const document = documents.get(item.id);
    if (document == null) reject('Producer authority is outside the authorized closure.');
    const indexed = indexSubstraitRelations(document!);
    if (!indexed.ok) throw indexed.error;
    const reads = [...indexed.index.relations.values()].filter(
      (entry) => entry.relation.relType.case === 'read'
    );
    if (!item.ready) {
      if (visiting.has(item.id)) reject('Producer dependencies contain a cycle.');
      visiting.add(item.id);
      stack.push({ ...item, ready: true });
      for (const entry of reads) {
        const producer = entry.binding.producerRef;
        if (producer == null) continue;
        if (!incoming.get(item.id)?.has(producer.nodeId))
          reject('Producer reference has no authorized direct dependency.');
        stack.push({ id: producer.nodeId, ready: false });
      }
      continue;
    }
    const connections: ConnectionRef[] = [];
    for (const entry of reads) {
      const producer = entry.binding.producerRef;
      if (producer != null) {
        const upstream = resolved.get(producer.nodeId)!;
        resolveProducerInput(entry, upstream.document);
        connections.push(upstream.connection);
      } else {
        const source = entry.binding.sourceRef;
        const matches = [...(incoming.get(item.id) ?? [])].flatMap((id) => {
          const ref = graph.sources.get(id);
          return ref != null && source != null && jcsCanonicalize(ref) === jcsCanonicalize(source)
            ? [ref]
            : [];
        });
        if (matches.length !== 1)
          reject('Physical input has no unique authorized direct dependency.');
        connections.push(matches[0]!.connectionRef);
      }
    }
    const connection = connections[0];
    if (
      connection == null ||
      connections.some((ref) => jcsCanonicalize(ref) !== jcsCanonicalize(connection))
    )
      reject('Producer inputs must share one execution connection.');
    const current = { document: document!, index: indexed.index, connection: connection! };
    requireProducerPublication(graph, item.id, current);
    resolved.set(item.id, current);
    visiting.delete(item.id);
  }
  return resolved;
}
