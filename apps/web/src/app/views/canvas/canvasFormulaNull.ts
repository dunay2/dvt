/** Bind syntax-level NULL operands to existing admitted signatures, never a new null type. */
import { create } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';

const types = {
  TEXT: 'string',
  BIGINT: 'i64',
  'DOUBLE PRECISION': 'fp64',
  BOOLEAN: 'bool',
} as const;
type Value = Readonly<{
  expression: Expression;
  dataType: string;
  fieldIds: readonly string[];
  untypedNull?: boolean;
}>;

export function formulaNull(typeName = 'TEXT', untypedNull = true): Value {
  const kind = types[typeName.toUpperCase() as keyof typeof types];
  if (kind == null) throw new Error(`Unsupported NULL type: ${typeName}.`);
  return {
    expression: create(ExpressionSchema, {
      rexType: {
        case: 'literal',
        value: {
          literalType: {
            case: 'null',
            value: { kind: { case: kind, value: { nullability: Type_Nullability.NULLABLE } } },
          },
        },
      },
    }),
    dataType:
      kind === 'string'
        ? 'string'
        : kind === 'i64'
          ? 'bigint'
          : kind === 'fp64'
            ? 'double precision'
            : 'boolean',
    fieldIds: [],
    untypedNull,
  };
}

export function bindFormulaNulls(
  name: string,
  operands: readonly Value[],
  provider: string
): readonly Value[] {
  if (!operands.some((operand) => operand.untypedNull)) return operands;
  for (const typeName of Object.keys(types)) {
    const literal = formulaNull(typeName, false);
    const candidate = operands.map((operand) => (operand.untypedNull ? literal : operand));
    if (
      resolveDvtSubstraitColumnFunctions({
        dataTypes: candidate.map((operand) => operand.dataType),
        provider,
        resolution: 'complete',
      }).some((fn) => fn.name.toLowerCase() === name.toLowerCase())
    )
      return candidate;
  }
  return operands;
}
