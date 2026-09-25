import { create } from '@bufbuild/protobuf';
import {
  AggregateRelSchema,
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  Expression_WindowFunctionSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';
import { createSourcePlan } from './canvasSourceDocument';
import { countFunction, rowNumberFunction } from './canvasMeasureFunctions';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

describe('local measure function grammar', () => {
  it('shares declarations without restricting other functions in the same namespace', () => {
    const plan = createSourcePlan();
    const reference = rowNumberFunction.ensure(plan);
    dvtSubstraitExpression.ensureScalarFunction(plan, {
      urn: 'extension:io.substrait:functions_arithmetic',
      name: 'add',
    });
    const fn = create(Expression_WindowFunctionSchema, {
      functionReference: reference,
      outputType: rowNumberFunction.resultType(),
      phase: AggregationPhase.INITIAL_TO_RESULT,
      invocation: AggregateFunction_AggregationInvocation.ALL,
      partitions: [dvtSubstraitExpression.field(2)],
    });
    expect(rowNumberFunction.matches(plan, fn)).toBe(true);
    expect(rowNumberFunction.ensure(plan)).toBe(reference);
    expect(plan.extensions).toHaveLength(2);
    fn.invocation = AggregateFunction_AggregationInvocation.DISTINCT;
    expect(rowNumberFunction.matches(plan, fn)).toBe(false);
  });

  it('does not present filtered or argument-bearing COUNT as editable COUNT(*)', () => {
    const plan = createSourcePlan();
    const aggregate = create(AggregateRelSchema, {
      measures: [
        {
          measure: {
            functionReference: countFunction.ensure(plan),
            outputType: countFunction.resultType(),
            phase: AggregationPhase.INITIAL_TO_RESULT,
            invocation: AggregateFunction_AggregationInvocation.ALL,
          },
        },
      ],
    });
    expect(countFunction.matches(plan, aggregate)).toBe(true);
    aggregate.measures[0]!.filter = dvtSubstraitExpression.literal({
      dataType: 'bool',
      value: true,
    });
    expect(countFunction.matches(plan, aggregate)).toBe(false);
    aggregate.measures[0]!.filter = undefined;
    aggregate.measures[0]!.measure!.arguments.push({
      $typeName: 'substrait.FunctionArgument',
      argType: { case: 'value', value: dvtSubstraitExpression.field(0) },
    });
    expect(countFunction.matches(plan, aggregate)).toBe(false);
  });
});
