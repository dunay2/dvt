/** Owns admitted binary text-comparison expressions. */
import { create } from '@bufbuild/protobuf';
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_BooleanSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { buildDvtSubstraitStandardCapabilityId } from '@dvt/contracts';
import {
  DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS,
  comparisonFunctionIdentity,
  type DvtSubstraitJoinComparisonOperator,
} from '@dvt/postgres-projection';

import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

export type DvtSubstraitTextComparisonOperator = DvtSubstraitJoinComparisonOperator;

type TextComparisonInspection = Readonly<{
  operator: DvtSubstraitTextComparisonOperator;
  capabilityId: string;
  sourceOrdinal: number;
  value: string;
  functionAnchor: number;
  urnAnchor: number;
}>;

function capabilityId(operator: DvtSubstraitTextComparisonOperator): string {
  const identity = comparisonFunctionIdentity(operator);
  return buildDvtSubstraitStandardCapabilityId('scalar-function', {
    sourceKind: 'simple-extension',
    urn: identity.urn,
    name: identity.name,
  });
}

export const dvtSubstraitTextComparison = {
  capabilities: DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS.map((operator) => ({
    operator,
    capabilityId: capabilityId(operator),
  })),

  create(
    plan: Plan,
    operator: DvtSubstraitTextComparisonOperator,
    sourceOrdinal: number,
    value: string
  ): Expression {
    const { functionAnchor } = dvtSubstraitExpression.ensureScalarFunction(
      plan,
      comparisonFunctionIdentity(operator)
    );
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

  inspect(plan: Plan, expression: Expression | undefined): TextComparisonInspection | null {
    for (const operator of DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS) {
      const scalar = dvtSubstraitExpression.inspectScalarFunction(
        plan,
        expression,
        comparisonFunctionIdentity(operator)
      );
      const sourceOrdinal = dvtSubstraitExpression.fieldOrdinal(scalar?.arguments[0]);
      const literal = dvtSubstraitExpression.literalValue(scalar?.arguments[1]);
      if (
        scalar != null &&
        scalar.arguments.length === 2 &&
        scalar.outputType?.kind.case === 'bool' &&
        sourceOrdinal != null &&
        literal?.dataType === 'string'
      ) {
        return {
          operator,
          capabilityId: capabilityId(operator),
          sourceOrdinal,
          value: literal.value,
          functionAnchor: scalar.functionAnchor,
          urnAnchor: scalar.urnAnchor,
        };
      }
    }
    return null;
  },

  removeDeclaration(plan: Plan, comparison: TextComparisonInspection): void {
    dvtSubstraitExpression.removeScalarFunctionDeclaration(plan, comparison);
  },
};
