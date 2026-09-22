import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

import { unsupportedProfile } from './inspection.js';
import {
  inspectI64Result,
  inspectUnparameterizedInvocation,
  type FunctionProfile,
} from './invocation.js';

export const countProfile = {
  kind: 'substrait.AggregateFunction',
  category: 'aggregate-function',
  identity: { urn: 'extension:io.substrait:functions_aggregate_generic', name: 'count' },
  inspect(fn) {
    if (fn.$typeName !== 'substrait.AggregateFunction')
      return unsupportedProfile('unsupported-function-kind');
    const invocation = inspectUnparameterizedInvocation(fn);
    if (!invocation.ok) return invocation;
    if (fn.sorts.length !== 0) return unsupportedProfile('unsupported-count-ordering');
    return inspectI64Result(fn, Type_Nullability.REQUIRED);
  },
} satisfies FunctionProfile;
