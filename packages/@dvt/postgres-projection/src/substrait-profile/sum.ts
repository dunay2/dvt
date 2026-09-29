/** Canonical SUM invocation grammar shared by authoring and target admission. */
import {
  AggregationPhase,
  AggregateFunction_AggregationInvocation,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

import { unsupportedProfile } from './inspection.js';
import type { FunctionProfile } from './invocation.js';

export function sumOverload(type: Type) {
  const kind = type.kind;
  if ((kind.case !== 'i64' && kind.case !== 'fp64') || kind.value.typeVariationReference !== 0)
    return undefined;
  const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (item) =>
      item.kind === 'standard' &&
      item.category === 'aggregate-function' &&
      item.profileStatus === 'supported-profile' &&
      item.identity.sourceKind === 'simple-extension' &&
      item.identity.urn === 'extension:io.substrait:functions_arithmetic' &&
      item.identity.name === 'sum'
  );
  return entry?.kind === 'standard'
    ? entry.overloads?.find((item) => item.signature === `sum:${kind.case}`)
    : undefined;
}

export const sumProfiles: readonly FunctionProfile[] = ['i64', 'fp64'].map((kind) => ({
  kind: 'substrait.AggregateFunction',
  category: 'aggregate-function',
  identity: { urn: 'extension:io.substrait:functions_arithmetic', name: `sum:${kind}` },
  inspect(fn) {
    const operand = fn.arguments[0]?.argType;
    const type = fn.outputType?.kind;
    if (
      fn.$typeName !== 'substrait.AggregateFunction' ||
      operand?.case !== 'value' ||
      fn.arguments.length !== 1 ||
      type?.case !== kind ||
      (type.case !== 'i64' && type.case !== 'fp64') ||
      type.value.nullability !== Type_Nullability.NULLABLE ||
      type.value.typeVariationReference !== 0 ||
      fn.phase !== AggregationPhase.INITIAL_TO_RESULT ||
      fn.invocation !== AggregateFunction_AggregationInvocation.ALL ||
      fn.sorts.length !== 0 ||
      fn.options.length !== 1 ||
      fn.options[0]?.name !== 'overflow' ||
      fn.options[0].preference.length !== 1 ||
      fn.options[0].preference[0] !== 'ERROR'
    )
      return unsupportedProfile('unsupported-sum-invocation');
    return { ok: true };
  },
}));
