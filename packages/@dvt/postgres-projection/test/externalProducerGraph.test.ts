import {
  PlanRelSchema,
  PlanSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create, toBinary } from '@bufbuild/protobuf';
import { sha256Hex } from '@dvt/crypto';
import { createExternalProducerSignature, createProducerInput } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import { pgStringLiteral } from '../src/postgresAst.js';
import { projectSubstraitProducerGraph } from '../src/relationalSql/producerGraph.js';
import type { SubstraitPostgresAstProjection } from '../src/relationalSql/project.js';

function fixture(): Parameters<typeof projectSubstraitProducerGraph>[0] & {
  externalProjections: Map<string, SubstraitPostgresAstProjection>;
} {
  const document = createExternalProducerSignature({
    relationId: 'assigned-publication',
    names: ['file-owner', 'model.demo.clientes'],
    fields: [
      {
        fieldId: 'assigned-client',
        name: 'client_id',
        type: create(TypeSchema, {
          kind: { case: 'string', value: { nullability: Type_Nullability.NULLABLE } },
        }),
      },
    ],
  });
  const read = createProducerInput({ nodeId: 'instance', name: 'Clientes', document }, 1);
  const plan = {
    ...document.plan,
    relations: [
      create(PlanRelSchema, {
        relType: { case: 'root', value: { input: read.relation, names: ['client_id'] } },
      }),
    ],
  };
  const consumer = {
    plan,
    sidecar: {
      ...document.sidecar,
      semanticPlanSha256: sha256Hex(toBinary(PlanSchema, plan)),
      relations: [read.binding],
      fields: read.fields,
    },
  };
  const projection: SubstraitPostgresAstProjection = {
    ast: {
      SelectStmt: {
        targetList: [{ ResTarget: { name: 'client_id', val: pgStringLiteral('C-001') } }],
      },
    },
    orderBy: null,
    projection: {
      inputs: [],
      resultRelationId: 'assigned-publication',
      outputs: [{ name: 'client_id', outputOrdinal: 0, dataType: 'string', nullable: true }],
    },
  };
  return {
    targetId: 'consumer',
    documents: new Map([['consumer', consumer]]),
    sources: new Map(),
    edges: [{ sourceId: 'instance', targetId: 'consumer' }],
    externalProducers: new Map([
      [
        'instance',
        {
          document,
          connection: {
            schemaVersion: 'connection-ref.v1',
            provider: 'postgres',
            connectionId: 'warehouse',
          } as const,
        },
      ],
    ]),
    externalProjections: new Map([['instance', projection]]),
  };
}
describe('authorized external producer SQL binding', () => {
  it('lowers the actual producer SELECT through the existing consumer Read without a fabricated table', async () => {
    const result = await projectSubstraitProducerGraph(fixture());
    expect(result.sql).toContain("'C-001'");
    expect(result.sql).not.toContain('model.demo.clientes');
    expect(result.projection.inputs).toEqual([]);
    expect(result.projection.outputs).toMatchObject([{ name: 'client_id', dataType: 'string' }]);
  });
  it('refuses an unresolved signature instead of lowering its logical name as a warehouse table', async () => {
    await expect(
      projectSubstraitProducerGraph({ ...fixture(), externalProjections: new Map() })
    ).rejects.toThrow('authorized SQL result');
  });
  it('refuses a different output contract or missing dependency', async () => {
    const graph = fixture();
    const projection = graph.externalProjections.get('instance')!;
    graph.externalProjections.set('instance', {
      ...projection,
      projection: { ...projection.projection, outputs: [] },
    });
    await expect(projectSubstraitProducerGraph(graph)).rejects.toThrow('output contract');
    await expect(projectSubstraitProducerGraph({ ...fixture(), edges: [] })).rejects.toThrow(
      'dependency'
    );
  });
});
