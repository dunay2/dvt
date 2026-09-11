/** Owned concern: build and inspect admitted calculated ProjectRel expressions. */
import { create } from '@bufbuild/protobuf';
import {
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  ExpressionSchema,
  Expression_WindowFunctionSchema,
  Expression_WindowFunction_BoundsType,
  SortFieldSchema,
  SortField_SortDirection,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  buildDvtSubstraitStandardCapabilityId,
} from '@dvt/contracts';

import {
  createDvtSubstraitNullableI64Type,
  ensureDvtSubstraitRowNumberFunction,
  isDvtSubstraitRowNumberFunction,
} from './canvasDvtSubstraitWindow';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

export type DvtSubstraitCalculatedExpression =
  | Readonly<{ kind: 'string-literal'; value: string }>
  | Readonly<{ kind: 'timestamp-literal'; value: string }>
  | Readonly<{ kind: 'row-number'; orderSourceOrdinal: number }>;

const capabilityId = (category: 'expression-form' | 'type', selector: string) =>
  buildDvtSubstraitStandardCapabilityId(category, {
    sourceKind: 'core',
    message: category === 'type' ? 'substrait.Type' : 'substrait.Expression',
    selector,
  });

function requireCapabilities(entryIds: readonly string[]): void {
  const supported = new Set(
    DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.flatMap((entry) =>
      entry.kind === 'standard' && entry.profileStatus === 'supported-profile'
        ? [entry.entryId]
        : []
    )
  );
  if (!entryIds.every((entryId) => supported.has(entryId))) {
    throw new Error('Calculated expression capabilities are not admitted.');
  }
}

export function buildDvtSubstraitCalculatedExpression(
  plan: Plan,
  calculation: DvtSubstraitCalculatedExpression
): Expression {
  requireCapabilities([
    capabilityId(
      'expression-form',
      calculation.kind === 'row-number' ? 'rex_type.window_function' : 'rex_type.literal'
    ),
    ...(calculation.kind === 'string-literal'
      ? [capabilityId('type', 'kind.string')]
      : calculation.kind === 'timestamp-literal'
        ? [capabilityId('type', 'kind.precision_timestamp_tz')]
        : []),
  ]);
  if (calculation.kind === 'string-literal') {
    return dvtSubstraitExpression.literal({ dataType: 'string', value: calculation.value });
  }
  if (calculation.kind === 'timestamp-literal') {
    return dvtSubstraitExpression.literal({
      dataType: 'precisionTimestampTz',
      value: calculation.value,
    });
  }
  const functionReference = ensureDvtSubstraitRowNumberFunction(plan);
  return create(ExpressionSchema, {
    rexType: {
      case: 'windowFunction',
      value: create(Expression_WindowFunctionSchema, {
        functionReference,
        outputType: createDvtSubstraitNullableI64Type(),
        phase: AggregationPhase.INITIAL_TO_RESULT,
        invocation: AggregateFunction_AggregationInvocation.ALL,
        sorts: [
          create(SortFieldSchema, {
            expr: dvtSubstraitExpression.field(calculation.orderSourceOrdinal),
            sortKind: { case: 'direction', value: SortField_SortDirection.ASC_NULLS_LAST },
          }),
        ],
        boundsType: Expression_WindowFunction_BoundsType.UNSPECIFIED,
      }),
    },
  });
}

export function inspectDvtSubstraitCalculatedExpression(
  plan: Plan,
  expression: Expression
): Readonly<{
  calculation: DvtSubstraitCalculatedExpression;
  functionAnchors: readonly number[];
}> | null {
  if (expression.rexType.case === 'literal') {
    const literal = dvtSubstraitExpression.literalValue(expression);
    if (literal?.dataType === 'string') {
      return { calculation: { kind: 'string-literal', value: literal.value }, functionAnchors: [] };
    }
    if (literal?.dataType === 'precisionTimestampTz') {
      return {
        calculation: { kind: 'timestamp-literal', value: literal.value },
        functionAnchors: [],
      };
    }
    return null;
  }
  if (expression.rexType.case !== 'windowFunction') return null;
  const window = expression.rexType.value;
  const orderOrdinal =
    window.partitions.length === 0 &&
    window.sorts.length === 1 &&
    window.sorts[0]?.sortKind.case === 'direction' &&
    window.sorts[0].sortKind.value === SortField_SortDirection.ASC_NULLS_LAST
      ? dvtSubstraitExpression.fieldOrdinal(window.sorts[0].expr)
      : null;
  return orderOrdinal == null || !isDvtSubstraitRowNumberFunction(plan, window)
    ? null
    : {
        calculation: { kind: 'row-number', orderSourceOrdinal: orderOrdinal },
        functionAnchors: [window.functionReference],
      };
}
