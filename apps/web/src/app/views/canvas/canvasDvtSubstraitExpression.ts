import {
  dvtSubstraitExpressionReader,
  resolveFunctionReference,
  type DvtSubstraitLiteralValue,
} from '@dvt/postgres-projection';
export type { DvtSubstraitLiteralValue } from '@dvt/postgres-projection';
/** Owned concern: create and inspect shared primitives from the admitted Substrait profile. */
import { create } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  SimpleExtensionDeclarationSchema,
  SimpleExtensionURNSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/extensions/extensions_pb.js';
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

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

export const dvtSubstraitExpression = {
  field(ordinal: number): Expression {
    if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
      throw new Error('Substrait direct field ordinal must be a non-negative safe integer.');
    }
    return create(ExpressionSchema, {
      rexType: {
        case: 'selection',
        value: {
          referenceType: {
            case: 'directReference',
            value: {
              referenceType: {
                case: 'structField',
                value: { field: ordinal },
              },
            },
          },
          rootType: {
            case: 'rootReference',
            value: {},
          },
        },
      },
    });
  },
  fieldOrdinal: dvtSubstraitExpressionReader.fieldOrdinal,

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
          value: {
            literalType: {
              case: 'precisionTimestampTz',
              value: {
                precision: 3,
                value: BigInt(milliseconds),
              },
            },
          },
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
        value: { literalType },
      },
    });
  },
  literalValue: dvtSubstraitExpressionReader.literalValue,

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
      const resolved = resolveFunctionReference(plan, entry.mappingType.value.functionAnchor);
      if (!resolved.ok)
        throw new Error(`Cannot author an ambiguous or dangling function: ${resolved.reason}`);
      return resolved.value.urn === identity.urn && resolved.value.name === identity.name;
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
          value: {
            extensionUrnReference: urn.extensionUrnAnchor,
            functionAnchor,
            name: identity.name,
          },
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
        value: {
          functionReference: args.functionReference,
          arguments: [
            ...(args.leadingEnumArguments ?? []).map((value) => ({
              argType: { case: 'enum' as const, value },
            })),
            ...args.arguments.map((value) => ({ argType: { case: 'value' as const, value } })),
          ],
          options: (args.options ?? []).map((option) => ({
            ...option,
            preference: [...option.preference],
          })),
          outputType: args.outputType,
        },
      },
    });
  },
  inspectScalarFunction: dvtSubstraitExpressionReader.inspectScalarFunction,

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
