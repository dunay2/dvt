import {
  SortField_SortDirection,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';

import { inspectFunctionProfile } from './substrait-profile/functions.js';
import { rowNumberProfile } from './substrait-profile/rowNumber.js';
import { dvtSubstraitExpressionReader } from './substraitExpressionReader.js';
import type { DvtCalculatedExpression } from './substraitProjectionReadModel.js';

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
  const profile = inspectFunctionProfile(plan, window);
  if (!profile.ok || profile.value !== rowNumberProfile) return null;
  const ordinal =
    window.partitions.length === 0 &&
    window.sorts.length === 1 &&
    window.sorts[0]?.sortKind.case === 'direction' &&
    window.sorts[0].sortKind.value === SortField_SortDirection.ASC_NULLS_LAST
      ? dvtSubstraitExpressionReader.fieldOrdinal(window.sorts[0].expr)
      : null;
  return ordinal == null
    ? null
    : {
        calculation: { kind: 'row-number', orderSourceOrdinal: ordinal },
        functionAnchors: [window.functionReference],
      };
}
