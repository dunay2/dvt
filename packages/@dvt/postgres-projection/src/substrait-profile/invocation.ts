import {
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  type AggregateFunction,
  type Expression_WindowFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

import type { FunctionIdentity } from './functionReference.js';
import { unsupportedProfile, type ProfileCheck } from './inspection.js';

export type ProfileFunction = AggregateFunction | Expression_WindowFunction;
export type FunctionProfile = Readonly<{
  kind: ProfileFunction['$typeName'];
  category: 'aggregate-function' | 'window-function';
  identity: FunctionIdentity;
  inspect: (fn: ProfileFunction) => ProfileCheck;
}>;

/** Common invocation constraints; each capability owns its result and frame constraints. */
export function inspectUnparameterizedInvocation(fn: ProfileFunction): ProfileCheck {
  if (fn.arguments.length !== 0) return unsupportedProfile('unsupported-function-arguments');
  if (fn.options.length !== 0) return unsupportedProfile('unsupported-function-options');
  if (fn.phase !== AggregationPhase.INITIAL_TO_RESULT)
    return unsupportedProfile('unsupported-aggregation-phase');
  if (fn.invocation !== AggregateFunction_AggregationInvocation.ALL)
    return unsupportedProfile('unsupported-aggregation-invocation');
  return { ok: true };
}

export function inspectI64Result(fn: ProfileFunction, nullability: Type_Nullability): ProfileCheck {
  const type = fn.outputType?.kind;
  return type?.case === 'i64' &&
    type.value.nullability === nullability &&
    type.value.typeVariationReference === 0
    ? { ok: true }
    : unsupportedProfile('unsupported-function-result');
}
