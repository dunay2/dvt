import { create } from '@bufbuild/protobuf';
import {
  TypeSchema,
  Type_BooleanSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { describe, expect, it } from 'vitest';

import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

const BOOLEAN_TYPE = create(TypeSchema, {
  kind: {
    case: 'bool',
    value: create(Type_BooleanSchema, { nullability: Type_Nullability.NULLABLE }),
  },
});

describe('DVT Substrait expression primitives', () => {
  it('round-trips direct fields and the admitted JOIN literal types', () => {
    const field = dvtSubstraitExpression.field(3);
    expect(dvtSubstraitExpression.fieldOrdinal(field)).toBe(3);

    const literals = [
      { dataType: 'string', value: 'ES' },
      { dataType: 'bool', value: true },
      { dataType: 'i64', value: 1n },
      { dataType: 'fp64', value: 75.5 },
      { dataType: 'precisionTimestampTz', value: '2026-09-10T12:30:00.000Z' },
    ] as const;

    for (const literal of literals) {
      expect(dvtSubstraitExpression.literalValue(dvtSubstraitExpression.literal(literal))).toEqual(
        literal
      );
    }
  });

  it('reuses one extension declaration and inspects its scalar invocation', () => {
    const plan = create(PlanSchema, {});
    const extension = {
      urn: 'extension:io.substrait:functions_comparison',
      name: 'equal',
    } as const;
    const first = dvtSubstraitExpression.ensureScalarFunction(plan, extension);
    const second = dvtSubstraitExpression.ensureScalarFunction(plan, extension);
    expect(second).toEqual(first);
    expect(plan.extensionUrns).toHaveLength(1);
    expect(plan.extensions).toHaveLength(1);

    const expression = dvtSubstraitExpression.scalarFunction({
      functionReference: first.functionAnchor,
      arguments: [
        dvtSubstraitExpression.field(0),
        dvtSubstraitExpression.literal({ dataType: 'string', value: 'active' }),
      ],
      outputType: BOOLEAN_TYPE,
    });
    const inspection = dvtSubstraitExpression.inspectScalarFunction(plan, expression, extension);

    expect(inspection?.arguments).toHaveLength(2);
    expect(dvtSubstraitExpression.fieldOrdinal(inspection?.arguments[0])).toBe(0);
    expect(dvtSubstraitExpression.literalValue(inspection?.arguments[1])).toEqual({
      dataType: 'string',
      value: 'active',
    });
  });

  it('rejects invalid ordinals, timestamps and floating-point literals', () => {
    expect(() => dvtSubstraitExpression.field(-1)).toThrow();
    expect(() =>
      dvtSubstraitExpression.literal({ dataType: 'precisionTimestampTz', value: 'tomorrow' })
    ).toThrow();
    expect(() =>
      dvtSubstraitExpression.literal({ dataType: 'fp64', value: Number.POSITIVE_INFINITY })
    ).toThrow();
  });
});
