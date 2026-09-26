/** Resolve only explicit producer references inside an already authorized graph closure. */
import {
  resolveProducerGraph,
  selectDvtSubstraitRelation,
  type ProducerGraph,
} from '@dvt/substrait-analysis';

import type { ProducerSqlBinding } from './producerRead.js';
import { projectSubstraitToPostgresSql, type SubstraitPostgresProjection } from './project.js';

export async function projectSubstraitProducerGraph(
  args: ProducerGraph &
    Readonly<{
      relationId?: string;
    }>
): Promise<SubstraitPostgresProjection> {
  const documents = new Map(args.documents);
  if (args.relationId != null) {
    const target = documents.get(args.targetId);
    if (target == null) throw new Error('Selected producer is outside the authorized closure.');
    documents.set(args.targetId, selectDvtSubstraitRelation(target, args.relationId));
  }
  const graph = resolveProducerGraph({ ...args, documents });
  const results = new Map<string, SubstraitPostgresProjection>();
  const project = async (nodeId: string): Promise<SubstraitPostgresProjection> => {
    const previous = results.get(nodeId);
    if (previous != null) return previous;
    const { document, index } = graph.get(nodeId)!;
    const producers = new Map<string, ProducerSqlBinding>();
    for (const entry of index.relations.values()) {
      const reference = entry.binding.producerRef;
      if (reference == null) continue;
      const projection = await project(reference.nodeId);
      producers.set(entry.binding.relationId, {
        document: graph.get(reference.nodeId)!.document,
        projection,
      });
    }
    const result = await projectSubstraitToPostgresSql(document, producers);
    results.set(nodeId, result);
    return result;
  };
  return project(args.targetId);
}
