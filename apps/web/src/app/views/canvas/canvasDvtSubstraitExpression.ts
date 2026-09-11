/** Owned concern: create and inspect shared primitives from the admitted Substrait profile. */
import { create } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_LiteralSchema,
  Expression_Literal_PrecisionTimestampSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  Expression_ScalarFunctionSchema,
  FunctionArgumentSchema,
  FunctionOptionSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  SimpleExtensionDeclarationSchema,
  SimpleExtensionDeclaration_ExtensionFunctionSchema,
  SimpleExtensionURNSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/extensions/extensions_pb.js';
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

export type DvtSubstraitLiteralValue =
  | Readonly<{ dataType: 'string'; value: string }>
  | Readonly<{ dataType: 'bool'; value: boolean }>
  | Readonly<{ dataType: 'i64'; value: bigint }>
  | Readonly<{ dataType: 'fp64'; value: number }>
  | Readonly<{ dataType: 'precisionTimestampTz'; value: string }>;

type ScalarFunctionIdentity = Readonly<{ urn: string; name: string }>;

function nextUrnAnchor(plan: Plan): number {
  return Math.max(0, ...plan.extensionUrns.map((entry) => entry.extensionUrnAnchor)) + 1;
}

function nextFunctionAnchor(plan: Plan): number {
  return (
    Math.max(
      0,
      ...plan.extensions.flatMap((entry) =>
        entry.mappingType.case === 'extensionFunction'
          ? [entry.mappingType.value.functionAnchor]
          : []
      )
    ) + 1
  );
}

function resolvedFunction(
  plan: Plan,
  functionAnchor: number
): Readonly<{ urnAnchor: number; urn: string; name: string }> | null {
  const declaration = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.functionAnchor === functionAnchor
  );
  if (declaration?.mappingType.case !== 'extensionFunction') return null;
  const urnAnchor = declaration.mappingType.value.extensionUrnReference;
  const urn = plan.extensionUrns.find((entry) => entry.extensionUrnAnchor === urnAnchor)?.urn;
  return urn == null ? null : { urnAnchor, urn, name: declaration.mappingType.value.name };
}

export const dvtSubstraitExpression = {
  field(ordinal: number): Expression {
    if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
      throw new Error('Substrait direct field ordinal must be a non-negative safe integer.');
    }
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
  },

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

  literal(literal: DvtSubstraitLiteralValue): Expression {
    if (literal.dataType === 'fp64' && !Number.isFinite(literal.value)) {
      throw new Error('Substrait fp64 literal must be finite.');
    }
    if (literal.dataType === 'precisionTimestampTz') {
      const milliseconds = Date.parse(literal.value);
      if (!Number.isFinite(milliseconds)) {
        throw new Error('Substrait timestamp literal is invalid.');
      }
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
    const literalType =
      literal.dataType === 'bool'
        ? ({ case: 'boolean', value: literal.value } as const)
        : literal.dataType === 'string'
          ? ({ case: 'string', value: literal.value } as const)
          : literal.dataType === 'i64'
            ? ({ case: 'i64', value: literal.value } as const)
            : ({ case: 'fp64', value: literal.value } as const);
    return create(ExpressionSchema, {
      rexType: {
        case: 'literal',
        value: create(Expression_LiteralSchema, { literalType }),
      },
    });
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

  ensureScalarFunction(
    plan: Plan,
    identity: ScalarFunctionIdentity
  ): Readonly<{ functionAnchor: number; urnAnchor: number }> {
    if (
      identity.urn.length === 0 ||
      identity.urn !== identity.urn.trim() ||
      identity.name.length === 0 ||
      identity.name !== identity.name.trim()
    ) {
      throw new Error('Substrait scalar function identity must be non-empty and trimmed.');
    }
    const existing = plan.extensions.find((entry) => {
      if (entry.mappingType.case !== 'extensionFunction') return false;
      const resolved = resolvedFunction(plan, entry.mappingType.value.functionAnchor);
      return resolved?.urn === identity.urn && resolved.name === identity.name;
    });
    if (existing?.mappingType.case === 'extensionFunction') {
      return {
        functionAnchor: existing.mappingType.value.functionAnchor,
        urnAnchor: existing.mappingType.value.extensionUrnReference,
      };
    }

    let urn = plan.extensionUrns.find((entry) => entry.urn === identity.urn);
    if (urn == null) {
      urn = create(SimpleExtensionURNSchema, {
        extensionUrnAnchor: nextUrnAnchor(plan),
        urn: identity.urn,
      });
      plan.extensionUrns.push(urn);
    }
    const functionAnchor = nextFunctionAnchor(plan);
    plan.extensions.push(
      create(SimpleExtensionDeclarationSchema, {
        mappingType: {
          case: 'extensionFunction',
          value: create(SimpleExtensionDeclaration_ExtensionFunctionSchema, {
            extensionUrnReference: urn.extensionUrnAnchor,
            functionAnchor,
            name: identity.name,
          }),
        },
      })
    );
    return { functionAnchor, urnAnchor: urn.extensionUrnAnchor };
  },

  scalarFunction(args: {
    functionReference: number;
    arguments: readonly Expression[];
    leadingEnumArguments?: readonly string[];
    options?: readonly Readonly<{ name: string; preference: readonly string[] }>[];
    outputType: Type;
  }): Expression {
    return create(ExpressionSchema, {
      rexType: {
        case: 'scalarFunction',
        value: create(Expression_ScalarFunctionSchema, {
          functionReference: args.functionReference,
          arguments: [
            ...(args.leadingEnumArguments ?? []).map((value) =>
              create(FunctionArgumentSchema, { argType: { case: 'enum', value } })
            ),
            ...args.arguments.map((expression) =>
              create(FunctionArgumentSchema, { argType: { case: 'value', value: expression } })
            ),
          ],
          options: (args.options ?? []).map((option) =>
            create(FunctionOptionSchema, {
              name: option.name,
              preference: [...option.preference],
            })
          ),
          outputType: args.outputType,
        }),
      },
    });
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
    const resolved = resolvedFunction(plan, scalar.functionReference);
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

  removeScalarFunctionDeclaration(
    plan: Plan,
    declaration: Readonly<{ functionAnchor: number; urnAnchor: number }>
  ): void {
    plan.extensions = plan.extensions.filter(
      (entry) =>
        entry.mappingType.case !== 'extensionFunction' ||
        entry.mappingType.value.functionAnchor !== declaration.functionAnchor
    );
    if (
      !plan.extensions.some(
        (entry) =>
          entry.mappingType.case === 'extensionFunction' &&
          entry.mappingType.value.extensionUrnReference === declaration.urnAnchor
      )
    ) {
      plan.extensionUrns = plan.extensionUrns.filter(
        (entry) => entry.extensionUrnAnchor !== declaration.urnAnchor
      );
    }
  },
};
