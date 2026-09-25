/** Local function grammar, independent of the surrounding relational graph. */
import { create, equals } from '@bufbuild/protobuf';
import {
  AggregateRel_MeasureSchema,
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  Expression_WindowFunctionSchema,
  type AggregateRel,
  type Expression_WindowFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  buildDvtSubstraitStandardCapabilityId,
} from '@dvt/contracts';
import { resolveFunctionReference } from '@dvt/postgres-projection';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { sourceFieldType } from './canvasSourceRelation';

type FunctionIdentity = Readonly<{ urn: string; name: string }>;
const COUNT = { urn: 'extension:io.substrait:functions_aggregate_generic', name: 'count' };
const ROW_NUMBER = { urn: 'extension:io.substrait:functions_arithmetic', name: 'row_number' };
const phase = AggregationPhase.INITIAL_TO_RESULT;
const invocation = AggregateFunction_AggregationInvocation.ALL;

function ensure(
  plan: Plan,
  identity: FunctionIdentity,
  kind: 'aggregate-function' | 'window-function'
): number {
  const id = buildDvtSubstraitStandardCapabilityId(kind, {
    sourceKind: 'simple-extension',
    ...identity,
  });
  if (
    !DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
      (entry) => entry.entryId === id && entry.profileStatus === 'supported-profile'
    )
  )
    throw new Error(`Function is not admitted: ${identity.name}`);
  return dvtSubstraitExpression.ensureScalarFunction(plan, identity).functionAnchor;
}

function identifies(plan: Plan, reference: number, identity: FunctionIdentity): boolean {
  const resolved = resolveFunctionReference(plan, reference);
  return (
    resolved.ok && resolved.value.urn === identity.urn && resolved.value.name === identity.name
  );
}

export const countFunction = {
  resultType: () => sourceFieldType('i64', false),
  ensure: (plan: Plan) => ensure(plan, COUNT, 'aggregate-function'),
  matches(plan: Plan, aggregate: AggregateRel): boolean {
    const measure = aggregate.measures[0];
    const reference = measure?.measure?.functionReference;
    return (
      measure != null &&
      reference != null &&
      identifies(plan, reference, COUNT) &&
      equals(
        AggregateRel_MeasureSchema,
        measure,
        create(AggregateRel_MeasureSchema, {
          measure: {
            functionReference: reference,
            phase,
            invocation,
            outputType: this.resultType(),
          },
        })
      )
    );
  },
};

export const rowNumberFunction = {
  resultType: () => sourceFieldType('i64', true),
  ensure: (plan: Plan) => ensure(plan, ROW_NUMBER, 'window-function'),
  matches(plan: Plan, fn: Expression_WindowFunction): boolean {
    return (
      identifies(plan, fn.functionReference, ROW_NUMBER) &&
      equals(
        Expression_WindowFunctionSchema,
        fn,
        create(Expression_WindowFunctionSchema, {
          functionReference: fn.functionReference,
          phase,
          invocation,
          outputType: this.resultType(),
          partitions: fn.partitions,
          sorts: fn.sorts,
        })
      )
    );
  },
};
