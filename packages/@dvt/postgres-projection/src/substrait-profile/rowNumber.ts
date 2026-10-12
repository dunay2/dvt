import { Expression_WindowFunction_BoundsType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

import { unsupportedProfile } from './inspection.js';
import {
  inspectI64Result,
  inspectUnparameterizedInvocation,
  type FunctionProfile,
} from './invocation.js';

export const rowNumberProfile = {
  kind: 'substrait.Expression.WindowFunction',
  category: 'window-function',
  identity: { urn: 'extension:io.substrait:functions_arithmetic', name: 'row_number' },
  inspect(fn) {
    if (fn.$typeName !== 'substrait.Expression.WindowFunction')
      return unsupportedProfile('unsupported-function-kind');
    const invocation = inspectUnparameterizedInvocation(fn);
    if (!invocation.ok) return invocation;
    if (
      fn.boundsType !== Expression_WindowFunction_BoundsType.UNSPECIFIED ||
      fn.lowerBound != null ||
      fn.upperBound != null
    ) {
      return unsupportedProfile('unsupported-window-frame');
    }
    return inspectI64Result(fn, Type_Nullability.NULLABLE);
  },
} satisfies FunctionProfile;
