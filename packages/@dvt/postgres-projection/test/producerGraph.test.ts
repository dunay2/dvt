import {
  RelSchema,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create } from '@bufbuild/protobuf';
import { encodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import {
  createProducerInput,
  selectDvtSubstraitRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DvtSubstraitPostgresProjectionError } from '../src/dvtProjection.js';
import { projectSubstraitProducerGraph } from '../src/relationalSql/producerGraph.js';
import { projectSubstraitToPostgresSql } from '../src/relationalSql/project.js';
import * as renderer from '../src/renderPostgresAst.js';
import {
  createDvtSubstraitFetchDraft,
  createDvtSubstraitSortDraft,
} from '../src/substraitSortFetch.js';

import { compositionalFixture } from './relationalSqlFixture.js';

function consumer(producer: SubstraitDocument, nodeId: string): SubstraitDocument {
  const input = createProducerInput({ nodeId, name: 'Producer', document: producer }, 1);
  const plan = create(PlanSchema, {
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
  });
  return {
    plan,
    sidecar: {
      ...producer.sidecar,
      semanticPlanSha256: encodeDvtSubstraitPlanV1(plan).sha256,
      relations: [input.binding],
      fields: input.fields,
    },
  };
}

function orderedProducer(): SubstraitDocument {
  const document = compositionalFixture('cross');
  const sorted = createDvtSubstraitSortDraft(document, {
    relationId: 'sorted',
    outputFieldIds: ['sorted-value', 'sorted-other'],
    keys: [{ fieldId: 'f7', direction: SortField_SortDirection.DESC_NULLS_LAST }],
  });
  return createDvtSubstraitFetchDraft(sorted, {
    relationId: 'limited',
    outputFieldIds: ['limited-value', 'limited-other'],
    offset: 9_007_199_254_740_993n,
    count: 7n,
  });
}

function repeatedConsumer(producer: SubstraitDocument): SubstraitDocument {
  const document = consumer(producer, 'producer');
  const other = createProducerInput(
    { nodeId: 'producer', name: 'Producer', document: producer },
    2
  );
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root') throw new Error('Expected consumer root');
  root.value.input = create(RelSchema, {
    relType: {
      case: 'cross',
      value: { common: { relAnchor: 3 }, left: root.value.input, right: other.relation },
    },
  });
  const outputs = [...document.sidecar.fields, ...other.fields].map((field, outputOrdinal) => ({
    ...field,
    fieldId: `combined-${outputOrdinal}`,
    relationId: 'combined',
    outputOrdinal,
    displayName: `value_${outputOrdinal}`,
  }));
  root.value.names = outputs.map((field) => field.displayName);
  return {
    plan: document.plan,
    sidecar: {
      ...document.sidecar,
      semanticPlanSha256: encodeDvtSubstraitPlanV1(document.plan).sha256,
      relations: [
        ...document.sidecar.relations,
        other.binding,
        { relationId: 'combined', relAnchor: 3 },
      ],
      fields: [...document.sidecar.fields, ...other.fields, ...outputs],
    },
  };
}

describe('explicit producer/consumer SQL projection', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['plain', 'ordered'] as const)(
    'renders the %s chain only at the target boundary',
    async (kind) => {
      const producer = kind === 'ordered' ? orderedProducer() : compositionalFixture('cross');
      const first = consumer(producer, 'producer');
      const second = consumer(first, 'consumer');
      const before = globalThis.structuredClone(second);
      const producerProjection = await projectSubstraitToPostgresSql(producer);
      const firstProjection = await projectSubstraitToPostgresSql(
        first,
        new Map([
          [
            first.sidecar.relations[0]!.relationId,
            { document: producer, projection: producerProjection },
          ],
        ])
      );
      const expected = await projectSubstraitToPostgresSql(
        second,
        new Map([
          [
            second.sidecar.relations[0]!.relationId,
            { document: first, projection: firstProjection },
          ],
        ])
      );
      const render = vi.spyOn(renderer, 'renderPostgresAst');
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
      expect(result).toEqual(expected);
      expect(render).toHaveBeenCalledTimes(1);
      expect(render).toHaveBeenCalledWith(result.ast);
      if (kind === 'ordered') {
        expect(result.orderBy).toEqual([{ name: 'value', direction: 'DESC', nulls: 'LAST' }]);
        expect(result.sql).toContain('OFFSET CAST(9007199254740993 AS bigint)');
        expect(result.sql).toContain('LIMIT CAST(7 AS bigint)');
      }
    }
  );

  it('renders a shared producer once inside the final target without losing either occurrence', async () => {
    const producer = compositionalFixture('cross');
    const target = repeatedConsumer(producer);
    const before = globalThis.structuredClone([producer, target]);
    const projection = await projectSubstraitToPostgresSql(producer);
    const expected = await projectSubstraitToPostgresSql(
      target,
      new Map(
        target.sidecar.relations
          .filter((entry) => entry.producerRef != null)
          .map((entry) => [entry.relationId, { document: producer, projection }])
      )
    );
    const render = vi.spyOn(renderer, 'renderPostgresAst');
    const result = await projectSubstraitProducerGraph({
      targetId: 'consumer',
      sources: new Map([['physical', producer.sidecar.relations[0]!.sourceRef!]]),
      documents: new Map([
        ['producer', producer],
        ['consumer', target],
      ]),
      edges: [
        { sourceId: 'physical', targetId: 'producer' },
        { sourceId: 'producer', targetId: 'consumer' },
      ],
    });
    expect(result).toEqual(expected);
    expect(result.projection.outputs).toHaveLength(4);
    expect(result.projection.inputs).toHaveLength(4);
    expect([producer, target]).toEqual(before);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(result.ast);
  });

  it('renders the selected relation rather than the full producer output', async () => {
    const producer = compositionalFixture('cross');
    const relationId = producer.sidecar.relations[0]!.relationId;
    const expected = await projectSubstraitToPostgresSql(
      selectDvtSubstraitRelation(producer, relationId)
    );
    const render = vi.spyOn(renderer, 'renderPostgresAst');
    const result = await projectSubstraitProducerGraph({
      targetId: 'producer',
      relationId,
      sources: new Map([['physical', producer.sidecar.relations[0]!.sourceRef!]]),
      documents: new Map([['producer', producer]]),
      edges: [{ sourceId: 'physical', targetId: 'producer' }],
    });
    expect(result).toEqual(expected);
    expect(result.projection.outputs).toHaveLength(1);
    expect(result.sql).not.toContain('CROSS JOIN');
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(result.ast);
  });

  it('preserves a final rendering failure without returning a partial projection', async () => {
    const producer = compositionalFixture('cross');
    const failure = new DvtSubstraitPostgresProjectionError('deparse_failed', 'Renderer failed');
    const render = vi.spyOn(renderer, 'renderPostgresAst').mockRejectedValueOnce(failure);
    await expect(
      projectSubstraitProducerGraph({
        targetId: 'producer',
        sources: new Map([['physical', producer.sidecar.relations[0]!.sourceRef!]]),
        documents: new Map([['producer', producer]]),
        edges: [{ sourceId: 'physical', targetId: 'producer' }],
      })
    ).rejects.toBe(failure);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('rejects a producer reference without an authorized direct edge', async () => {
    const producer = compositionalFixture('cross');
    const render = vi.spyOn(renderer, 'renderPostgresAst');
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
    expect(render).not.toHaveBeenCalled();
  });

  it('rejects producer cycles instead of expanding copied trees', async () => {
    const source = compositionalFixture('cross');
    const render = vi.spyOn(renderer, 'renderPostgresAst');
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
    expect(render).not.toHaveBeenCalled();
  });
});
