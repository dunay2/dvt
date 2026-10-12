/** Lower admitted AggregateFunction messages without widening PostgreSQL result types. */
import type { AggregateRel_Measure } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { pgCountRows, pgFunction, pgString, type PostgresAstNode } from '../postgresAst.js';
import { countProfile } from '../substrait-profile/count.js';
import { inspectFunctionProfile } from '../substrait-profile/functions.js';
import { sumProfiles } from '../substrait-profile/sum.js';

import { expressionSql } from './expressions.js';
import { unsupported, type ExpressionScope } from './scope.js';

export function aggregateSql(
  measure: AggregateRel_Measure,
  scope: ExpressionScope
): PostgresAstNode {
  const fn = measure.measure;
  if (measure.filter != null || fn == null)
    return unsupported('Filtered aggregates are outside the admitted profile.');
  const profile = inspectFunctionProfile(scope.plan, fn);
  if (!profile.ok) return unsupported('Aggregate function is outside the admitted profile.');
  if (profile.value === countProfile) return pgCountRows();
  const argument = fn.arguments[0]?.argType;
  if (!sumProfiles.includes(profile.value) || argument?.case !== 'value')
    return unsupported('Aggregate has no target binding.');
  const value = expressionSql(argument.value, scope);
  const kind = value.type.kind;
  if (
    (kind.case !== 'i64' && kind.case !== 'fp64') ||
    kind.case !== fn.outputType?.kind.case ||
    kind.value.typeVariationReference !== 0
  )
    return unsupported('SUM operand and result types differ.');
  const sum = pgFunction('sum', value.ast);
  // PostgreSQL SUM(bigint) returns numeric; Substrait sum:i64 requires checked i64.
  return value.type.kind.case === 'i64'
    ? { TypeCast: { arg: sum, typeName: { names: [pgString('bigint')], typemod: -1 } } }
    : sum;
}
