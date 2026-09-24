/** PostgreSQL invocation guards; semantic analysis remains target-independent. */
import type { Expression_ScalarFunction } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

export type ScalarArgumentGuard = (
  fn: Expression_ScalarFunction,
  types: readonly Type[]
) => boolean;
const valuesOnly = (fn: Expression_ScalarFunction) =>
  fn.arguments.every((arg) => arg.argType.case === 'value');
export const sameType =
  (kind: 'string' | 'bool'): ScalarArgumentGuard =>
  (fn, types) =>
    valuesOnly(fn) && types.every((type) => type.kind.case === kind);
export const comparable: ScalarArgumentGuard = (fn, types) => {
  const first = types[0]?.kind.case;
  return (
    valuesOnly(fn) &&
    first != null &&
    ['string', 'i64', 'fp64', 'bool', 'precisionTimestampTz'].includes(first) &&
    types.every((type) => type.kind.case === first)
  );
};
export const utcYear: ScalarArgumentGuard = (fn, types) => {
  const component = fn.arguments[0]?.argType;
  const timestamp = fn.arguments[1]?.argType;
  const timezone = fn.arguments[2]?.argType;
  const literal = timezone?.case === 'value' ? timezone.value.rexType : undefined;
  return (
    fn.arguments.length === 3 &&
    component?.case === 'enum' &&
    component.value === 'YEAR' &&
    timestamp?.case === 'value' &&
    types[0]?.kind.case === 'precisionTimestampTz' &&
    literal?.case === 'literal' &&
    literal.value.literalType.case === 'string' &&
    literal.value.literalType.value === 'UTC'
  );
};
