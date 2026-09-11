import { create } from '@bufbuild/protobuf';
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_BooleanSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { buildDvtSubstraitStandardCapabilityId } from '@dvt/contracts';

import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

const URN = 'extension:io.substrait:functions_comparison';
const IDENTITY = { urn: URN, name: 'equal' } as const;
const EQUAL_ID = buildDvtSubstraitStandardCapabilityId('scalar-function', {
  sourceKind: 'simple-extension',
  urn: URN,
  name: 'equal',
});

type EqualityInspection = Readonly<{
  sourceOrdinal: number;
  value: string;
  functionAnchor: number;
  urnAnchor: number;
}>;

export const dvtSubstraitTextEquality = {
  capabilityId: EQUAL_ID,
  create(plan: Plan, sourceOrdinal: number, value: string): Expression {
    const { functionAnchor } = dvtSubstraitExpression.ensureScalarFunction(plan, IDENTITY);
    return dvtSubstraitExpression.scalarFunction({
      functionReference: functionAnchor,
      arguments: [
        dvtSubstraitExpression.field(sourceOrdinal),
        dvtSubstraitExpression.literal({ dataType: 'string', value }),
      ],
      outputType: create(TypeSchema, {
        kind: {
          case: 'bool',
          value: create(Type_BooleanSchema, { nullability: Type_Nullability.NULLABLE }),
        },
      }),
    });
  },
  inspect(plan: Plan, expression: Expression | undefined): EqualityInspection | null {
    const scalar = dvtSubstraitExpression.inspectScalarFunction(plan, expression, IDENTITY);
    const sourceOrdinal = dvtSubstraitExpression.fieldOrdinal(scalar?.arguments[0]);
    const literal = dvtSubstraitExpression.literalValue(scalar?.arguments[1]);
    return scalar != null &&
      scalar.arguments.length === 2 &&
      scalar.outputType?.kind.case === 'bool' &&
      sourceOrdinal != null &&
      literal?.dataType === 'string'
      ? {
          sourceOrdinal,
          value: literal.value,
          functionAnchor: scalar.functionAnchor,
          urnAnchor: scalar.urnAnchor,
        }
      : null;
  },
  removeDeclaration(plan: Plan, equality: EqualityInspection): void {
    dvtSubstraitExpression.removeScalarFunctionDeclaration(plan, equality);
  },
};
