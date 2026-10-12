import { describe, expect, it } from 'vitest';

import { migrateEmbeddedProducerInput } from '../src/migrateEmbeddedProducerInput.js';
import { indexSubstraitRelations } from '../src/relationIndex.js';

import { relationsFixture } from './relationsFixture.js';

function legacyCopy(): {
  producer: Parameters<typeof migrateEmbeddedProducerInput>[1];
  consumer: Parameters<typeof migrateEmbeddedProducerInput>[0];
} {
  const grammar = relationsFixture();
  const producerRoot = grammar.unary('filter', grammar.unary('project', grammar.read()));
  const producer = {
    nodeId: 'producer',
    name: 'Published producer',
    document: globalThis.structuredClone(grammar.document(producerRoot)),
  };
  const consumer = grammar.document(grammar.unary('project', producerRoot));
  const output = consumer.sidecar.fields.find((field) => field.relationId === 'r4')!;
  output.displayName = 'consumer_alias';
  output.sourceFieldId = 'f3';
  const root = consumer.plan.relations[0]!.relType;
  if (root.case !== 'root') throw new Error('Expected fixture root');
  root.value.names = ['consumer_alias'];
  return { producer, consumer };
}

describe('embedded producer migration', () => {
  it('replaces only an exact producer copy with a Read reference and retains consumer identity', () => {
    const { producer, consumer } = legacyCopy();
    const snapshot = globalThis.structuredClone(consumer);
    const next = migrateEmbeddedProducerInput(consumer, producer);
    expect(next).not.toBe(consumer);
    const indexed = indexSubstraitRelations(next);
    if (!indexed.ok) throw indexed.error;
    expect(indexed.index.rootId).toBe('r4');
    expect(
      [...indexed.index.relations.values()].map((entry) => entry.relation.relType.case)
    ).toEqual(['project', 'read']);
    expect(indexed.index.relations.get('r3')!.binding).toMatchObject({
      relationId: 'r3',
      producerRef: {
        nodeId: producer.nodeId,
        fields: [{ fieldId: 'f3', producerFieldId: 'f3' }],
      },
    });
    expect(indexed.index.relations.get('r4')!.fields).toEqual([
      expect.objectContaining({
        fieldId: 'f4',
        sourceFieldId: 'f3',
        displayName: 'consumer_alias',
      }),
    ]);
    expect(consumer).toEqual(snapshot);
    expect(migrateEmbeddedProducerInput(next, producer)).toBe(next);
  });

  it('does not migrate a producer whose operations have changed since the copy', () => {
    const { producer, consumer } = legacyCopy();
    const root = producer.document.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'filter')
      throw new Error('Expected producer filter');
    const condition = root.value.input.relType.value.condition;
    if (condition?.rexType.case !== 'literal') throw new Error('Expected filter literal');
    condition.rexType.value.literalType = { case: 'boolean', value: false };
    expect(migrateEmbeddedProducerInput(consumer, producer)).toBe(consumer);
  });

  it('does not guess producer identity from matching structure with different bindings', () => {
    const { producer, consumer } = legacyCopy();
    producer.document.sidecar.fields.find((field) => field.fieldId === 'f3')!.displayName =
      'changed_published_name';
    expect(migrateEmbeddedProducerInput(consumer, producer)).toBe(consumer);
  });

  it('does not replace the entire consumer when it has no enclosing consumer operation', () => {
    const { producer } = legacyCopy();
    expect(migrateEmbeddedProducerInput(producer.document, producer)).toBe(producer.document);
  });
});
