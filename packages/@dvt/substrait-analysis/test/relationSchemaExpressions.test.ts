import {
  AggregateFunctionSchema,
  ExpressionSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  Type_Nullability,
  TypeSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { deriveSubstraitSchemas } from '../src/relationSchema.js';

import { relationsFixture } from './relationsFixture.js';

function field(ordinal: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: {
        rootType: { case: 'rootReference', value: {} },
        referenceType: {
          case: 'directReference',
          value: { referenceType: { case: 'structField', value: { field: ordinal } } },
        },
      },
    },
  });
}

const stringType = create(TypeSchema, {
  kind: { case: 'string', value: { nullability: Type_Nullability.REQUIRED } },
});

describe('expression schema and field dependencies', () => {
  it('collects only referenced fields across both inputs, without treating declared functions as executable', () => {
    const f = relationsFixture();
    const cross = f.combine('cross', [f.read(), f.read()], [0, 1]);
    const project = f.unary('project', cross, [2]);
    if (project.relType.case !== 'project') throw new Error('Expected project');
    project.relType.value.expressions = [
      create(ExpressionSchema, {
        rexType: {
          case: 'scalarFunction',
          value: {
            functionReference: 999,
            outputType: stringType,
            arguments: [1, 0, 1].map((ordinal) => ({
              argType: { case: 'value', value: field(ordinal) },
            })),
          },
        },
      }),
    ];
    const result = deriveSubstraitSchemas(f.document(project));
    expect(result.schemas.get(result.index.rootId)).toEqual([
      { type: stringType, sourceFieldIds: ['f2', 'f1'] },
    ]);
  });

  it('preserves derived expression type and dependencies through a later selection', () => {
    const f = relationsFixture();
    const project = f.unary('project', f.read(), [1]);
    if (project.relType.case !== 'project') throw new Error('Expected project');
    project.relType.value.expressions = [
      create(ExpressionSchema, {
        rexType: {
          case: 'scalarFunction',
          value: {
            outputType: stringType,
            arguments: [{ argType: { case: 'value', value: field(0) } }],
          },
        },
      }),
    ];
    const outer = f.unary('project', project, [1]);
    if (outer.relType.case !== 'project') throw new Error('Expected project');
    outer.relType.value.expressions = [field(0)];
    const result = deriveSubstraitSchemas(f.document(outer));
    expect(result.schemas.get(result.index.rootId)).toEqual([
      { type: stringType, sourceFieldIds: ['f1'] },
    ]);
  });

  it('does not attribute constant outputs to every input source', () => {
    const f = relationsFixture();
    const project = f.unary('project', f.read(), [1]);
    if (project.relType.case !== 'project') throw new Error('Expected project');
    project.relType.value.expressions = [
      create(ExpressionSchema, {
        rexType: { case: 'literal', value: { literalType: { case: 'string', value: 'constant' } } },
      }),
    ];
    const result = deriveSubstraitSchemas(f.document(project));
    expect(result.schemas.get(result.index.rootId)).toEqual([
      { type: stringType, sourceFieldIds: [] },
    ]);
  });

  it.each([-1, 1])(
    'rejects reference %s outside a project input, even with a declared return type',
    (ordinal) => {
      const f = relationsFixture();
      const project = f.unary('project', f.read(), [1]);
      if (project.relType.case !== 'project') throw new Error('Expected project');
      project.relType.value.expressions = [
        create(ExpressionSchema, {
          rexType: {
            case: 'scalarFunction',
            value: {
              outputType: stringType,
              arguments: [{ argType: { case: 'value', value: field(ordinal) } }],
            },
          },
        }),
      ];
      expect(() => deriveSubstraitSchemas(f.document(project))).toThrow(
        expect.objectContaining({ code: 'invalid_structure' })
      );
    }
  );

  it('derives grouping and measure schemas without requiring a particular input operator', () => {
    const f = relationsFixture();
    const aggregate = f.unary('aggregate', f.unary('filter', f.read()), [0, 1]);
    if (aggregate.relType.case !== 'aggregate') throw new Error('Expected aggregate');
    aggregate.relType.value.groupingExpressions = [field(0)];
    aggregate.relType.value.groupings = [
      { $typeName: 'substrait.AggregateRel.Grouping', expressionReferences: [0] },
    ];
    aggregate.relType.value.measures = [
      {
        $typeName: 'substrait.AggregateRel.Measure',
        measure: create(AggregateFunctionSchema, {
          outputType: { kind: { case: 'i64', value: { nullability: Type_Nullability.REQUIRED } } },
        }),
      },
    ];
    const result = deriveSubstraitSchemas(f.document(aggregate));
    expect(
      result.schemas.get(result.index.rootId)!.map((output) => ({
        kind: output.type.kind.case,
        sources: output.sourceFieldIds,
      }))
    ).toEqual([
      { kind: 'i64', sources: ['f1'] },
      { kind: 'i64', sources: [] },
    ]);
  });
});
