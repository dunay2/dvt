import {
  AggregateFunctionSchema,
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  Expression_WindowFunctionSchema,
  type AggregateFunction,
  type Expression_WindowFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';

export function functionFixture(name: 'count' | 'row_number' = 'count'): {
  plan: Plan;
  count: AggregateFunction;
  rowNumber: Expression_WindowFunction;
} {
  const urn = `extension:io.substrait:${name === 'count' ? 'functions_aggregate_generic' : 'functions_arithmetic'}`;
  const plan = create(PlanSchema, {
    extensionUrns: [{ extensionUrnAnchor: 7, urn }],
    extensions: [
      {
        mappingType: {
          case: 'extensionFunction',
          value: {
            extensionUrnReference: 7,
            functionAnchor: 12,
            name,
          },
        },
      },
    ],
  });
  const common = {
    functionReference: 12,
    phase: AggregationPhase.INITIAL_TO_RESULT,
    invocation: AggregateFunction_AggregationInvocation.ALL,
  };
  return {
    plan,
    count: create(AggregateFunctionSchema, {
      ...common,
      outputType: { kind: { case: 'i64', value: { nullability: Type_Nullability.REQUIRED } } },
    }),
    rowNumber: create(Expression_WindowFunctionSchema, {
      ...common,
      outputType: { kind: { case: 'i64', value: { nullability: Type_Nullability.NULLABLE } } },
    }),
  };
}
