import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create } from '@bufbuild/protobuf';
import { createProducerInput, type SubstraitDocument } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import { projectSubstraitProducerGraph } from '../src/relationalSql/producerGraph.js';

import { compositionalFixture } from './relationalSqlFixture.js';

function consumer(producer: SubstraitDocument, nodeId: string): SubstraitDocument {
  const input = createProducerInput({ nodeId, name: 'Producer', document: producer }, 1);
  return {
    plan: create(PlanSchema, {
      version: producer.plan.version,
      relations: [
        {
          relType: {
            case: 'root',
            value: {
              input: input.relation,
              names: input.fields.map((field) => field.displayName!),
            },
          },
        },
      ],
    }),
    sidecar: { ...producer.sidecar, relations: [input.binding], fields: input.fields },
  };
}

describe('explicit producer/consumer SQL projection', () => {
  it('projects a chain without copying producer operations into either consumer', async () => {
    const producer = compositionalFixture('cross');
    const first = consumer(producer, 'producer');
    const second = consumer(first, 'consumer');
    const before = globalThis.structuredClone(second);
    const result = await projectSubstraitProducerGraph({
      sources: new Map([['physical', producer.sidecar.relations[0]!.sourceRef!]]),
      targetId: 'downstream',
      documents: new Map([
        ['producer', producer],
        ['consumer', first],
        ['downstream', second],
      ]),
      edges: [
        { sourceId: 'physical', targetId: 'producer' },
        { sourceId: 'producer', targetId: 'consumer' },
        { sourceId: 'consumer', targetId: 'downstream' },
      ],
    });
    expect(result.projection.outputs.map((field) => field.name)).toEqual(['value', 'value_1']);
    expect(result.sql).toContain('CROSS JOIN');
    expect(result.projection.inputs).toHaveLength(2);
    expect(first.sidecar.relations).toHaveLength(1);
    expect(second).toEqual(before);
  });

  it('rejects a producer reference without an authorized direct edge', async () => {
    const producer = compositionalFixture('cross');
    await expect(
      projectSubstraitProducerGraph({
        targetId: 'consumer',
        sources: new Map(),
        documents: new Map([
          ['producer', producer],
          ['consumer', consumer(producer, 'producer')],
        ]),
        edges: [],
      })
    ).rejects.toThrow('authorized direct dependency');
  });

  it('rejects producer cycles instead of expanding copied trees', async () => {
    const source = compositionalFixture('cross');
    await expect(
      projectSubstraitProducerGraph({
        targetId: 'a',
        sources: new Map(),
        documents: new Map([
          ['a', consumer(source, 'b')],
          ['b', consumer(source, 'a')],
        ]),
        edges: [
          { sourceId: 'a', targetId: 'b' },
          { sourceId: 'b', targetId: 'a' },
        ],
      })
    ).rejects.toThrow('cycle');
  });
});
