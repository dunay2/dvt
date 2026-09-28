import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import type { SubstraitDocument } from '../src/document.js';
import { createProducerInput } from '../src/producerInput.js';
import { refreshProducerInputs } from '../src/refreshProducerInputs.js';

import { relationsFixture } from './relationsFixture.js';

function scenario(): {
  producer: SubstraitDocument;
  consumer: SubstraitDocument;
  input: ReturnType<typeof createProducerInput>;
} {
  const grammar = relationsFixture();
  const producer = grammar.document(
    grammar.combine('cross', [grammar.read(), grammar.read()], [0, 1])
  );
  const input = createProducerInput(
    { nodeId: 'producer', name: 'Producer', document: producer },
    1
  );
  const selected = input.fields[1]!;
  const consumer: SubstraitDocument = {
    plan: create(PlanSchema, {
      version: producer.plan.version,
      relations: [
        {
          relType: {
            case: 'root',
            value: {
              names: ['kept_alias'],
              input: create(RelSchema, {
                relType: {
                  case: 'project',
                  value: {
                    common: {
                      relAnchor: 2,
                      emitKind: { case: 'emit', value: { outputMapping: [1] } },
                    },
                    input: input.relation,
                  },
                },
              }),
            },
          },
        },
      ],
    }),
    sidecar: {
      ...producer.sidecar,
      relations: [input.binding, { relationId: 'consumer-project', relAnchor: 2 }],
      fields: [
        ...input.fields,
        {
          fieldId: 'consumer-output',
          relationId: 'consumer-project',
          outputOrdinal: 0,
          displayName: 'kept_alias',
          sourceFieldId: selected.fieldId,
        },
      ],
    },
  };
  return { producer, consumer, input };
}

describe('producer input schema refresh', () => {
  it('removes an unpublished input without restoring outputs or changing a consumer alias', () => {
    const { producer, consumer, input } = scenario();
    const snapshot = globalThis.structuredClone(consumer);
    const root = producer.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'cross')
      throw new Error('Expected cross');
    root.value.input.relType.value.common!.emitKind = {
      case: 'emit',
      value: { $typeName: 'substrait.RelCommon.Emit', outputMapping: [1] },
    };
    root.value.names = ['renamed_published'];
    producer.sidecar.fields = producer.sidecar.fields.filter((field) => field.fieldId !== 'f3');
    const published = producer.sidecar.fields.find((field) => field.fieldId === 'f3_1')!;
    published.outputOrdinal = 0;
    published.displayName = 'renamed_published';
    const next = refreshProducerInputs(consumer, new Map([['producer', producer]]));
    const received = next.sidecar.fields.filter(
      (field) => field.relationId === input.binding.relationId
    );
    expect(received.map((field) => field.displayName)).toEqual(['renamed_published']);
    expect(received[0]!.fieldId).toBe(input.fields[1]!.fieldId);
    expect(next.sidecar.fields.find((field) => field.fieldId === 'consumer-output')).toMatchObject({
      displayName: 'kept_alias',
      outputOrdinal: 0,
    });
    const nextRoot = next.plan.relations[0]!.relType;
    expect(
      nextRoot.case === 'root' &&
        nextRoot.value.input?.relType.case === 'project' &&
        nextRoot.value.input.relType.value.common?.emitKind
    ).toMatchObject({ value: { outputMapping: [0] } });
    expect(consumer).toEqual(snapshot);
    expect(refreshProducerInputs(next, new Map([['producer', producer]]))).toBe(next);
  });
});
