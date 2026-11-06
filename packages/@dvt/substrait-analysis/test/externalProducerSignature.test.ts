import {
  PlanSchema,
  PlanRelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create, toBinary } from '@bufbuild/protobuf';
import { sha256Hex } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import { createExternalProducerSignature } from '../src/externalProducerSignature.js';
import { resolveProducerGraph } from '../src/producerGraph.js';
import { createProducerInput } from '../src/producerInput.js';
import { deriveSubstraitSchemas } from '../src/relationSchema.js';

const type = create(TypeSchema, {
  kind: { case: 'string', value: { nullability: Type_Nullability.NULLABLE } },
});
const fields = [{ fieldId: 'assigned-field', name: 'client_id', type }];
describe('external producer output signature', () => {
  it('keeps explicit field identity and owns no executable SQL or physical-source reference', () => {
    const document = createExternalProducerSignature({
      relationId: 'assigned-relation',
      names: ['file-canvas', 'model.demo.clientes'],
      fields,
    });
    const { index, schemas } = deriveSubstraitSchemas(document);
    expect(index.relations.get(index.rootId)?.fields[0]?.fieldId).toBe('assigned-field');
    expect(schemas.get(index.rootId)?.[0]?.type).toEqual(type);
    expect(document.sidecar.relations[0]?.sourceRef).toBeUndefined();
    expect(
      createProducerInput({ nodeId: 'instance', name: 'Clientes', document }, 2).binding.producerRef
        ?.fields[0]?.producerFieldId
    ).toBe('assigned-field');
  });
  it('rejects duplicate field identity instead of rebinding it by ordinal', () => {
    expect(() =>
      createExternalProducerSignature({
        relationId: 'assigned-relation',
        names: ['file-canvas', 'model.demo.clientes'],
        fields: [...fields, { ...fields[0]!, name: 'other' }],
      })
    ).toThrow();
  });
  it('resolves an explicitly bound external producer without inventing a physical source', () => {
    const document = createExternalProducerSignature({
      relationId: 'assigned-relation',
      names: ['file-canvas', 'model.demo.clientes'],
      fields,
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
    const connection = {
      schemaVersion: 'connection-ref.v1',
      provider: 'postgres',
      connectionId: 'warehouse',
    } as const;
    const graph = {
      targetId: 'consumer',
      documents: new Map([['consumer', consumer]]),
      sources: new Map(),
      edges: [{ sourceId: 'instance', targetId: 'consumer' }],
    };
    expect(() => resolveProducerGraph(graph)).toThrow();
    expect(
      resolveProducerGraph({
        ...graph,
        externalProducers: new Map([['instance', { document, connection }]]),
      }).get('consumer')?.connection
    ).toEqual(connection);
    expect(() =>
      resolveProducerGraph({
        ...graph,
        edges: [],
        externalProducers: new Map([['instance', { document, connection }]]),
      })
    ).toThrow();
  });
});
