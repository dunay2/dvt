/** Resolve only explicit producer references inside an already authorized graph closure. */
import {
  resolveProducerGraph,
  selectDvtSubstraitRelation,
  type ProducerGraph,
} from '@dvt/substrait-analysis';

import { renderPostgresAst } from '../renderPostgresAst.js';

import type { ProducerSqlBinding } from './producerRead.js';
import {
  projectSubstraitToPostgresAst,
  type SubstraitPostgresAstProjection,
  type SubstraitPostgresProjection,
} from './project.js';

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
  const results = new Map<string, SubstraitPostgresAstProjection>();
  const project = (nodeId: string): SubstraitPostgresAstProjection => {
    const previous = results.get(nodeId);
    if (previous != null) return previous;
    const { document, index } = graph.get(nodeId)!;
    const producers = new Map<string, ProducerSqlBinding>();
    for (const entry of index.relations.values()) {
      const reference = entry.binding.producerRef;
      if (reference == null) continue;
      const projection = project(reference.nodeId);
      producers.set(entry.binding.relationId, {
        document: graph.get(reference.nodeId)!.document,
        projection,
      });
    }
    const result = projectSubstraitToPostgresAst(document, producers);
    results.set(nodeId, result);
    return result;
  };
  const result = project(args.targetId);
  return { ...result, sql: await renderPostgresAst(result.ast) };
}
