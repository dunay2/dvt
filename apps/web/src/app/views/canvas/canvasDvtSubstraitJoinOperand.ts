import type { DvtSubstraitJoinPredicateOperand } from '@dvt/postgres-projection';
export type { DvtSubstraitJoinPredicateOperand } from '@dvt/postgres-projection';
import {
  type JoinFieldOperand,
  type DvtSubstraitJoinOperand,
  resolveDvtSubstraitJoinUnaryFunction,
  functionIdentity,
} from '@dvt/postgres-projection';
export {
  type JoinFieldOperand,
  type DvtSubstraitJoinOperand,
  type DvtSubstraitInspectedJoinOperand,
  type DvtSubstraitJoinUnaryFunction,
  resolveDvtSubstraitJoinUnaryFunctions,
  resolveDvtSubstraitJoinUnaryFunction,
  functionIdentity,
  mapDvtSubstraitJoinOperandFields,
  resolveDvtSubstraitJoinOperandDataType,
  inspectDvtSubstraitJoinOperandExpression,
} from '@dvt/postgres-projection';
/** Owned concern: map, validate, build and inspect recursive INNER JOIN operands. */
import { create } from '@bufbuild/protobuf';
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_Nullability,
  Type_StringSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

import {
  dvtSubstraitExpression,
  type DvtSubstraitLiteralValue,
} from './canvasDvtSubstraitExpression';
import {
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitColumnFunction,
} from './canvasDvtSubstraitProjection';

export function collectDvtSubstraitJoinOperandFields<Field extends JoinFieldOperand>(
  operand: DvtSubstraitJoinOperand<Field>
): readonly Field[] {
  if (operand.kind === 'field') return [operand as Field];
  if (operand.kind === 'literal') return [];
  return collectDvtSubstraitJoinOperandFields(operand.input);
}

export function dvtSubstraitJoinOperandContainsLiteral<Field extends JoinFieldOperand>(
  operand: DvtSubstraitJoinOperand<Field>
): boolean {
  return operand.kind === 'literal'
    ? true
    : operand.kind === 'function'
      ? dvtSubstraitJoinOperandContainsLiteral(operand.input)
      : false;
}

export function dvtSubstraitJoinOperandCapabilityIds<Field extends JoinFieldOperand>(
  operand: DvtSubstraitJoinOperand<Field>
): readonly string[] {
  return operand.kind === 'function'
    ? [operand.capabilityId, ...dvtSubstraitJoinOperandCapabilityIds(operand.input)]
    : [];
}

export function dvtSubstraitJoinOperandKey<Field extends JoinFieldOperand>(
  operand: DvtSubstraitJoinOperand<Field>,
  fieldKey: (field: Field) => string
): string {
  if (operand.kind === 'field') return `field:${fieldKey(operand as Field)}`;
  if (operand.kind === 'literal') {
    return `literal:${operand.literal.dataType}:${String(operand.literal.value)}`;
  }
  return `function:${operand.capabilityId}:${dvtSubstraitJoinOperandKey(operand.input, fieldKey)}`;
}

export function buildDvtSubstraitJoinOperandExpression<Field extends JoinFieldOperand>(args: {
  plan: Plan;
  operand: DvtSubstraitJoinOperand<Field>;
  fieldExpression: (field: Field) => Expression;
}): Expression {
  const { operand } = args;
  if (operand.kind === 'field') return args.fieldExpression(operand as Field);
  if (operand.kind === 'literal') return dvtSubstraitExpression.literal(operand.literal);
  const input = buildDvtSubstraitJoinOperandExpression({ ...args, operand: operand.input });
  const capability = resolveDvtSubstraitJoinUnaryFunction({
    capabilityId: operand.capabilityId,
    inputDataType: 'string',
  });
  const identity = capability == null ? null : functionIdentity(capability);
  if (capability == null || identity == null) {
    throw new Error('VTX2 INNER JOIN operand function is unavailable.');
  }
  const declaration = dvtSubstraitExpression.ensureScalarFunction(args.plan, identity);
  return dvtSubstraitExpression.scalarFunction({
    functionReference: declaration.functionAnchor,
    arguments: [input],
    outputType: create(TypeSchema, {
      kind: {
        case: 'string',
        value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
      },
    }),
  });
}
