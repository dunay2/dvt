/** Construct the admitted canonical SUM message from its catalogue overload. */
import {
  AggregateFunctionSchema,
  AggregationPhase,
  AggregateFunction_AggregationInvocation,
  type AggregateFunction,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { clone, create } from '@bufbuild/protobuf';

import { sumOverload } from './substrait-profile/sum.js';

export function createSumFunction(
  reference: number,
  operand: Expression,
  type: Type
): AggregateFunction {
  const overload = sumOverload(type);
  if (overload == null) throw new Error('SUM requires an admitted numeric operand.');
  const outputType = clone(TypeSchema, type);
  if (outputType.kind.case === 'i64' || outputType.kind.case === 'fp64')
    outputType.kind.value.nullability = Type_Nullability.NULLABLE;
  return create(AggregateFunctionSchema, {
    functionReference: reference,
    outputType,
    arguments: [{ argType: { case: 'value', value: operand } }],
    options: overload.options.map((option) => ({
      name: option.name,
      preference: [...option.preference],
    })),
    phase: AggregationPhase.INITIAL_TO_RESULT,
    invocation: AggregateFunction_AggregationInvocation.ALL,
  });
}
