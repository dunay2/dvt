/** Preserve direct publication identity, including the local/external producer boundary. */
import { ExpressionSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { clone, create, toBinary } from '@bufbuild/protobuf';
import { allocateDvtFieldId, allocateDvtRelationId } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import {
  createExternalProducerSignature,
  resolveProducerInput,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import { sourceFieldType } from '../src/postgresInputType.js';
import { compileModelSqlSource } from '../src/sqlSource/compile.js';
import { sourceFieldExpression } from '../src/sqlSource/references.js';

import {
  firstRead,
  rootFields,
  modelSqlContext,
  sqlField,
  sqlSelect,
  sqlStar,
  sqlTarget,
} from './modelSqlSource.fixture.js';

function readRoot(document: SubstraitDocument): SubstraitDocument {
  const read = firstRead(document);
  const plan = clone(PlanSchema, document.plan);
  plan.relations[0]!.relType = {
    case: 'root',
    value: {
      $typeName: 'substrait.RelRoot',
      input: read.relation,
      names: read.fields.map((field) => field.displayName!),
    },
  };
  return {
    plan,
    sidecar: {
      ...document.sidecar,
      semanticPlanSha256: sha256Hex(toBinary(PlanSchema, plan)),
      relations: [read.binding],
      fields: [...read.fields],
    },
  };
}

describe('Model SQL source identity', () => {
  it('preserves only unique direct provenance and leaves original authority immutable', () => {
    const context = modelSqlContext();
    const first = compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())]), context).document;
    const before = globalThis.structuredClone(first.sidecar);
    const next = compileModelSqlSource(sqlSelect([sqlTarget(sqlField('country'), 'market')]), {
      ...context,
      currentDocument: first,
      inputs: [{ ...context.inputs[0]!, retainedRead: firstRead(first) }],
    }).document;
    expect(rootFields(next)[0]!.fieldId).toBe(rootFields(first)[1]!.fieldId);
    expect(first.sidecar).toEqual(before);
  });

  it('does not choose one of two current outputs with the same direct provenance', () => {
    const context = modelSqlContext();
    const current = compileModelSqlSource(
      sqlSelect([sqlTarget(sqlField('country'), 'a'), sqlTarget(sqlField('country'), 'b')]),
      context
    ).document;
    const next = compileModelSqlSource(sqlSelect([sqlTarget(sqlField('country'))]), {
      ...context,
      currentDocument: current,
      inputs: [{ ...context.inputs[0]!, retainedRead: firstRead(current) }],
    }).document;
    expect(rootFields(current).map((field) => field.fieldId)).not.toContain(
      rootFields(next)[0]!.fieldId
    );
  });

  it('rejects foreign, changed and stale retained Read authority', () => {
    const context = modelSqlContext();
    const current = compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())]), context).document;
    const foreign = compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())]), context).document;
    const read = firstRead(current);
    for (const retainedRead of [
      firstRead(foreign),
      { ...read, fields: read.fields.map((field) => ({ ...field, displayName: 'renamed' })) },
    ])
      expect(() =>
        compileModelSqlSource(sqlSelect([sqlTarget(sqlField('country'))]), {
          ...context,
          currentDocument: current,
          inputs: [{ ...context.inputs[0]!, retainedRead }],
        })
      ).toThrow(expect.objectContaining({ code: 'input_unavailable' }));
    expect(() =>
      compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())]), {
        ...context,
        currentDocument: {
          ...current,
          sidecar: { ...current.sidecar, semanticPlanSha256: '0'.repeat(64) },
        },
      })
    ).toThrow(expect.objectContaining({ code: 'invalid_model' }));
  });

  it('transfers a published physical Read field without creating a self reference', () => {
    const context = modelSqlContext();
    const current = readRoot(
      compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())]), context).document
    );
    const read = firstRead(current);
    const next = compileModelSqlSource(sqlSelect([sqlTarget(sqlField('country'))]), {
      ...context,
      currentDocument: current,
      inputs: [{ ...context.inputs[0]!, retainedRead: read }],
    }).document;
    const output = rootFields(next)[0]!;
    const internal = firstRead(next).fields[1]!;
    expect(output.fieldId).toBe(read.fields[1]!.fieldId);
    expect(output.sourceFieldId).toBe(internal.fieldId);
    expect(internal.fieldId).not.toBe(output.fieldId);
    expect(new Set(next.sidecar.fields.map((field) => field.fieldId)).size).toBe(
      next.sidecar.fields.length
    );
  });

  it('renames only local producer bindings and preserves the external publication identity', () => {
    const publishedId = allocateDvtFieldId();
    const type = sourceFieldType('string', true);
    const publication = createExternalProducerSignature({
      relationId: allocateDvtRelationId(),
      names: ['producer'],
      fields: [{ fieldId: publishedId, name: 'country', type }],
    });
    const input = {
      nodeId: 'producer',
      sqlName: 'client',
      columns: [{ id: publishedId, name: 'country', type }],
      source: { producer: { nodeId: 'producer', document: publication } },
    };
    const current = readRoot(
      compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())]), { inputs: [input] }).document
    );
    const next = compileModelSqlSource(sqlSelect([sqlTarget(sqlField('country'), 'market')]), {
      currentDocument: current,
      inputs: [{ ...input, retainedRead: firstRead(current) }],
    }).document;
    const internal = firstRead(next);
    expect(internal.binding.producerRef!.fields[0]!.producerFieldId).toBe(publishedId);
    expect(internal.binding.producerRef!.fields[0]!.fieldId).toBe(internal.fields[0]!.fieldId);
    expect(rootFields(next)[0]!.sourceFieldId).toBe(internal.fields[0]!.fieldId);
    expect(rootFields(next)[0]!.fieldId).toBe(firstRead(current).fields[0]!.fieldId);
    expect(() => resolveProducerInput(internal, publication)).not.toThrow();
  });

  it('does not confuse a computed value with its sole source dependency', () => {
    const context = modelSqlContext();
    const base = compileModelSqlSource(
      sqlSelect([sqlTarget(sqlField('country'))]),
      context
    ).document;
    const plan = clone(PlanSchema, base.plan);
    plan.extensionUrns = create(PlanSchema, {
      extensionUrns: [{ extensionUrnAnchor: 1, urn: 'extension:io.substrait:functions_string' }],
    }).extensionUrns;
    plan.extensions = create(PlanSchema, {
      extensions: [
        {
          mappingType: {
            case: 'extensionFunction',
            value: { extensionUrnReference: 1, functionAnchor: 1, name: 'upper' },
          },
        },
      ],
    }).extensions;
    const root = plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
      throw new Error('Expected fixture Project');
    const project = root.value.input.relType.value;
    project.expressions = [
      create(ExpressionSchema, {
        rexType: {
          case: 'scalarFunction',
          value: {
            functionReference: 1,
            arguments: [{ argType: { case: 'value', value: sourceFieldExpression(1) } }],
            outputType: {
              kind: { case: 'string', value: { nullability: Type_Nullability.NULLABLE } },
            },
          },
        },
      }),
    ];
    project.common!.emitKind = {
      case: 'emit',
      value: { $typeName: 'substrait.RelCommon.Emit', outputMapping: [2] },
    };
    const current = {
      plan,
      sidecar: { ...base.sidecar, semanticPlanSha256: sha256Hex(toBinary(PlanSchema, plan)) },
    };
    const next = compileModelSqlSource(sqlSelect([sqlTarget(sqlField('country'))]), {
      ...context,
      currentDocument: current,
      inputs: [{ ...context.inputs[0]!, retainedRead: firstRead(current) }],
    }).document;
    expect(rootFields(next)[0]!.fieldId).not.toBe(rootFields(current)[0]!.fieldId);
  });
});
