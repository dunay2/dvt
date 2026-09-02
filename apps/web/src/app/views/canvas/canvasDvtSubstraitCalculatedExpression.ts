/** Owned concern: build and inspect admitted calculated ProjectRel expressions. */
import { create } from '@bufbuild/protobuf';
import {
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_LiteralSchema,
  Expression_Literal_PrecisionTimestampSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
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

function fieldReference(ordinal: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: create(Expression_FieldReferenceSchema, {
        referenceType: {
          case: 'directReference',
          value: create(Expression_ReferenceSegmentSchema, {
            referenceType: {
              case: 'structField',
              value: create(Expression_ReferenceSegment_StructFieldSchema, { field: ordinal }),
            },
          }),
        },
        rootType: {
          case: 'rootReference',
          value: create(Expression_FieldReference_RootReferenceSchema, {}),
        },
      }),
    },
  });
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
    return create(ExpressionSchema, {
      rexType: {
        case: 'literal',
        value: create(Expression_LiteralSchema, {
          literalType: { case: 'string', value: calculation.value },
        }),
      },
    });
  }
  if (calculation.kind === 'timestamp-literal') {
    const milliseconds = Date.parse(calculation.value);
    if (!Number.isFinite(milliseconds)) throw new Error('Timestamp literal is invalid.');
    return create(ExpressionSchema, {
      rexType: {
        case: 'literal',
        value: create(Expression_LiteralSchema, {
          literalType: {
            case: 'precisionTimestampTz',
            value: create(Expression_Literal_PrecisionTimestampSchema, {
              precision: 3,
              value: BigInt(milliseconds),
            }),
          },
        }),
      },
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
            expr: fieldReference(calculation.orderSourceOrdinal),
            sortKind: { case: 'direction', value: SortField_SortDirection.ASC_NULLS_LAST },
          }),
        ],
        boundsType: Expression_WindowFunction_BoundsType.UNSPECIFIED,
      }),
    },
  });
}

function readFieldOrdinal(expression: Expression | undefined): number | null {
  if (expression?.rexType.case !== 'selection') return null;
  const reference = expression.rexType.value;
  const segment =
    reference.referenceType.case === 'directReference'
      ? reference.referenceType.value.referenceType
      : undefined;
  return reference.rootType.case === 'rootReference' &&
    segment?.case === 'structField' &&
    segment.value.child == null
    ? segment.value.field
    : null;
}

export function inspectDvtSubstraitCalculatedExpression(
  plan: Plan,
  expression: Expression
): Readonly<{
  calculation: DvtSubstraitCalculatedExpression;
  functionAnchors: readonly number[];
}> | null {
  if (expression.rexType.case === 'literal') {
    const literal = expression.rexType.value.literalType;
    if (literal.case === 'string') {
      return { calculation: { kind: 'string-literal', value: literal.value }, functionAnchors: [] };
    }
    if (literal.case === 'precisionTimestampTz' && literal.value.precision === 3) {
      return {
        calculation: {
          kind: 'timestamp-literal',
          value: new Date(Number(literal.value.value)).toISOString(),
        },
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
      ? readFieldOrdinal(window.sorts[0].expr)
      : null;
  return orderOrdinal == null || !isDvtSubstraitRowNumberFunction(plan, window)
    ? null
    : {
        calculation: { kind: 'row-number', orderSourceOrdinal: orderOrdinal },
        functionAnchors: [window.functionReference],
      };
}
