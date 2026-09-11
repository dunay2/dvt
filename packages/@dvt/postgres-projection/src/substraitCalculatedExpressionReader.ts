import {
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  Expression_WindowFunction_BoundsType,
  SortField_SortDirection,
  type Expression,
  type Expression_WindowFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

import type { DvtCalculatedExpression } from './substraitProjectionReadModel.js';

const ROW_NUMBER_URN = 'extension:io.substrait:functions_arithmetic';
const ROW_NUMBER_NAME = 'row_number';

const resolveUrn = (plan: Plan, anchor: number): string | null =>
  plan.extensionUrns.find((entry) => entry.extensionUrnAnchor === anchor)?.urn ?? null;

function fieldOrdinal(expression: Expression | undefined): number | null {
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

function isRowNumber(plan: Plan, fn: Expression_WindowFunction): boolean {
  if (
    fn.arguments.length !== 0 ||
    fn.options.length !== 0 ||
    fn.outputType?.kind.case !== 'i64' ||
    fn.outputType.kind.value.nullability !== Type_Nullability.NULLABLE ||
    fn.phase !== AggregationPhase.INITIAL_TO_RESULT ||
    fn.invocation !== AggregateFunction_AggregationInvocation.ALL ||
    fn.boundsType !== Expression_WindowFunction_BoundsType.UNSPECIFIED ||
    fn.lowerBound != null ||
    fn.upperBound != null
  ) {
    return false;
  }
  const declarations = plan.extensions.filter(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      resolveUrn(plan, entry.mappingType.value.extensionUrnReference) === ROW_NUMBER_URN
  );
  const declaration = declarations[0];
  return (
    declarations.length === 1 &&
    plan.extensionUrns.filter((entry) => entry.urn === ROW_NUMBER_URN).length === 1 &&
    declaration?.mappingType.case === 'extensionFunction' &&
    declaration.mappingType.value.functionAnchor === fn.functionReference &&
    declaration.mappingType.value.name === ROW_NUMBER_NAME
  );
}

export function readCalculatedExpression(
  plan: Plan,
  expression: Expression
): Readonly<{ calculation: DvtCalculatedExpression; functionAnchors: readonly number[] }> | null {
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
  const ordinal =
    window.partitions.length === 0 &&
    window.sorts.length === 1 &&
    window.sorts[0]?.sortKind.case === 'direction' &&
    window.sorts[0].sortKind.value === SortField_SortDirection.ASC_NULLS_LAST
      ? fieldOrdinal(window.sorts[0].expr)
      : null;
  return ordinal == null || !isRowNumber(plan, window)
    ? null
    : {
        calculation: { kind: 'row-number', orderSourceOrdinal: ordinal },
        functionAnchors: [window.functionReference],
      };
}
