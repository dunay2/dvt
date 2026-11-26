/** Resolve direct execution authority for literal models and externally supplied SQL publications. */
import {
  ConnectionRefSchema,
  isDvtSubstraitLiteralRowPlanV1,
  type ConnectionRef,
} from '@dvt/contracts';

import { SubstraitAnalysisError } from './document.js';
import type { ProducerGraph, ResolvedProducer } from './producerGraph.js';
import type { SubstraitRelationIndex } from './relationIndex.js';

type Producer = Pick<ResolvedProducer, 'document' | 'index'>;

function isExternalSignature(index: SubstraitRelationIndex): boolean {
  const { relation, binding } = index.relations.get(index.rootId)!;
  if (index.relations.size !== 1 || relation.relType.case !== 'read') return false;
  return (
    relation.relType.value.readType.case !== 'virtualTable' &&
    !binding.sourceRef &&
    !binding.producerRef
  );
}

function literalExecutionConnection(
  producer: Producer,
  ref: ConnectionRef,
  dependencies: ReadonlySet<string>
): ConnectionRef {
  const connection = ConnectionRefSchema.parse(ref);
  if (connection.provider !== 'postgres' || dependencies.size > 0)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'A literal model requires one PostgreSQL execution authority and no dependencies.'
    );
  if (!isDvtSubstraitLiteralRowPlanV1(producer.document.plan, producer.document.sidecar))
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'A connection alone cannot authorize a model with inputs.'
    );
  return connection;
}

export function resolveProducerLeafConnection(
  graph: ProducerGraph,
  id: string,
  producer: Producer,
  dependencies: ReadonlySet<string>
): ConnectionRef | undefined {
  const external = graph.externalProducers?.get(id);
  const literal = graph.literalConnections?.get(id);
  if (literal) {
    if (external || graph.sources.has(id))
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'A literal model cannot replace another authority.'
      );
    return literalExecutionConnection(producer, literal, dependencies);
  }
  if (!external) return undefined;
  return externalExecutionConnection(producer.index, external.connection, dependencies);
}

function externalExecutionConnection(
  index: SubstraitRelationIndex,
  ref: ConnectionRef,
  dependencies: ReadonlySet<string>
): ConnectionRef {
  if (dependencies.size || !isExternalSignature(index))
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'An external publication must be a resolved leaf Read signature.'
    );
  return ConnectionRefSchema.parse(ref);
}
