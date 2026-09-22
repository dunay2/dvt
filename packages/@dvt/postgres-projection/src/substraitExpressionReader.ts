/** Owns read-only inspection of canonical field, literal and scalar expressions. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

import { resolveFunctionReference } from './substrait-profile/functionReference.js';

export type DvtSubstraitLiteralValue =
  | Readonly<{ dataType: 'string'; value: string }>
  | Readonly<{ dataType: 'bool'; value: boolean }>
  | Readonly<{ dataType: 'i64'; value: bigint }>
  | Readonly<{ dataType: 'fp64'; value: number }>
  | Readonly<{ dataType: 'precisionTimestampTz'; value: string }>;

type ScalarFunctionIdentity = Readonly<{ urn: string; name: string }>;

export const dvtSubstraitExpressionReader = {
  fieldOrdinal(expression: Expression | undefined): number | null {
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
  },

  literalValue(expression: Expression | undefined): DvtSubstraitLiteralValue | null {
    if (expression?.rexType.case !== 'literal') return null;
    const literal = expression.rexType.value.literalType;
    if (literal.case === 'string') return { dataType: 'string', value: literal.value };
    if (literal.case === 'boolean') return { dataType: 'bool', value: literal.value };
    if (literal.case === 'i64') return { dataType: 'i64', value: literal.value };
    if (literal.case === 'fp64' && Number.isFinite(literal.value)) {
      return { dataType: 'fp64', value: literal.value };
    }
    if (literal.case === 'precisionTimestampTz' && literal.value.precision === 3) {
      return {
        dataType: 'precisionTimestampTz',
        value: new Date(Number(literal.value.value)).toISOString(),
      };
    }
    return null;
  },

  inspectScalarFunction(
    plan: Plan,
    expression: Expression | undefined,
    identity: ScalarFunctionIdentity
  ): Readonly<{
    functionAnchor: number;
    urnAnchor: number;
    arguments: readonly Expression[];
    outputType: Type | undefined;
  }> | null {
    if (expression?.rexType.case !== 'scalarFunction') return null;
    const scalar = expression.rexType.value;
    const reference = resolveFunctionReference(plan, scalar.functionReference);
    if (!reference.ok) return null;
    const resolved = reference.value;
    if (
      resolved?.urn !== identity.urn ||
      resolved.name !== identity.name ||
      scalar.options.length !== 0 ||
      scalar.arguments.some((argument) => argument.argType.case !== 'value')
    ) {
      return null;
    }
    return {
      functionAnchor: scalar.functionReference,
      urnAnchor: resolved.urnAnchor,
      arguments: scalar.arguments.flatMap((argument) =>
        argument.argType.case === 'value' ? [argument.argType.value] : []
      ),
      outputType: scalar.outputType,
    };
  },
};
