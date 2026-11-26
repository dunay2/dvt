/** Resolve dependency ownership once for presentation, authoring and execution adapters. */
import type { ConnectedSourceRef, ConnectionRef, DvtInputBindingsV1 } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import { SubstraitAnalysisError, type SubstraitDocument } from './document.js';
import { resolveProducerDocuments } from './producerDocuments.js';
import { resolveProducerInput } from './producerInput.js';
import { resolveProducerLeafConnection } from './producerLeafConnection.js';
import { requireProducerPublication } from './producerPublication.js';
import {
  indexSubstraitRelations,
  type IndexedRelation,
  type SubstraitRelationIndex,
} from './relationIndex.js';

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
  literalConnections?: ReadonlyMap<string, ConnectionRef>;
  externalProducers?: ReadonlyMap<
    string,
    Readonly<{ document: SubstraitDocument; connection: ConnectionRef }>
  >;
}>;
export type ResolvedProducer = Readonly<{
  document: SubstraitDocument;
  index: SubstraitRelationIndex;
  connection: ConnectionRef;
}>;

type Producer = Pick<ResolvedProducer, 'document' | 'index'>;

function reject(message: string): never {
  throw new SubstraitAnalysisError('invalid_binding', message);
}

function authorizedDocuments(graph: ProducerGraph): ReadonlyMap<string, SubstraitDocument> {
  const available = new Map(graph.documents);
  for (const [id, producer] of graph.externalProducers ?? []) {
    if (available.has(id) || graph.sources.has(id))
      reject('An external producer cannot replace another authority.');
    available.set(id, producer.document);
  }
  return resolveProducerDocuments(graph.targetId, available);
}

function directDependencies(graph: ProducerGraph): Map<string, Set<string>> {
  const incoming = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    const ids = incoming.get(edge.targetId) ?? new Set<string>();
    ids.add(edge.sourceId);
    incoming.set(edge.targetId, ids);
  }
  return incoming;
}

function indexProducer(document: SubstraitDocument): Producer {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  return { document, index: indexed.index };
}

function physicalConnection(
  sources: ProducerGraph['sources'],
  dependencies: ReadonlySet<string>,
  source: ConnectedSourceRef | undefined
): ConnectionRef {
  if (!source) return reject('Physical input has no unique authorized direct dependency.');
  const signature = jcsCanonicalize(source);
  const matches = Array.from(dependencies, (id) => sources.get(id)).filter(
    (candidate) => candidate != null && jcsCanonicalize(candidate) === signature
  );
  if (matches.length !== 1)
    return reject('Physical input has no unique authorized direct dependency.');
  return matches[0]!.connectionRef;
}

function commonConnection(connections: readonly ConnectionRef[]): ConnectionRef {
  const first = connections[0];
  if (!first || connections.some((ref) => jcsCanonicalize(ref) !== jcsCanonicalize(first)))
    return reject('Producer inputs must share one execution connection.');
  return first;
}

function inputConnection(
  entry: IndexedRelation,
  graph: ProducerGraph,
  dependencies: ReadonlySet<string>,
  resolved: ReadonlyMap<string, ResolvedProducer>
): ConnectionRef {
  const ref = entry.binding.producerRef;
  if (!ref) return physicalConnection(graph.sources, dependencies, entry.binding.sourceRef);
  if (!dependencies.has(ref.nodeId))
    return reject('Producer reference has no authorized direct dependency.');
  const parent = resolved.get(ref.nodeId);
  if (!parent) return reject('Producer authority is outside the authorized closure.');
  resolveProducerInput(entry, parent.document);
  return parent.connection;
}

export function resolveProducerGraph(graph: ProducerGraph): ReadonlyMap<string, ResolvedProducer> {
  // The document resolver has already checked cycles and ordered dependencies before consumers.
  const documents = authorizedDocuments(graph);
  if (!documents.has(graph.targetId))
    return reject('Producer authority is outside the authorized closure.');
  const incoming = directDependencies(graph);
  const resolved = new Map<string, ResolvedProducer>();
  for (const [id, document] of documents) {
    const producer = indexProducer(document);
    const dependencies = incoming.get(id) ?? new Set<string>();
    const leaf = resolveProducerLeafConnection(graph, id, producer, dependencies);
    if (leaf) {
      resolved.set(id, { ...producer, connection: leaf });
      continue;
    }
    const reads = [...producer.index.relations.values()].filter(
      (entry) => entry.relation.relType.case === 'read'
    );
    const connections = reads.map((entry) => inputConnection(entry, graph, dependencies, resolved));
    const current = { ...producer, connection: commonConnection(connections) };
    requireProducerPublication(graph, id, current);
    resolved.set(id, current);
  }
  return resolved;
}
