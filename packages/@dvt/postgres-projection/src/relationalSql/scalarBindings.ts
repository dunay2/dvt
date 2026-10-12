/** Executable target bindings, independent of the surrounding relation shape. */
import type { Expression_ScalarFunction } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { clone, create } from '@bufbuild/protobuf';

import { pgString, pgStringLiteral, type PostgresAstNode } from '../postgresAst.js';
import { pgAnd, pgOr, pgComparison, pgNullTest } from '../postgresPredicateAst.js';

import { comparable, sameType, utcYear, type ScalarArgumentGuard } from './scalarArguments.js';

type Binding = Readonly<{
  family: string;
  signature: string;
  minimum: number;
  maximum?: number;
  accepts: ScalarArgumentGuard;
  output: 'string' | 'bool' | 'i64' | 'fp64' | 'operand';
  arguments?: (fn: Expression_ScalarFunction) => boolean;
  required?: boolean;
  sql: (args: readonly PostgresAstNode[]) => PostgresAstNode;
}>;
const call = (name: string, args: readonly PostgresAstNode[]): PostgresAstNode => ({
  FuncCall: { funcname: [pgString(name)], args, funcformat: 'COERCE_EXPLICIT_CALL' },
});
const unary = (name: string, target = name): Binding => ({
  family: 'functions_string',
  signature: `${name}:str`,
  minimum: 1,
  maximum: 1,
  accepts: sameType('string'),
  output: 'string',
  sql: (args) => call(target, args),
});
const compare = (signature: string, operator: '=' | '<>' | '>' | '>=' | '<' | '<='): Binding => ({
  family: 'functions_comparison',
  signature,
  minimum: 2,
  maximum: 2,
  accepts: comparable,
  output: 'bool',
  sql: (args) => pgComparison(operator, args[0]!, args[1]!),
});
const boolean = (signature: string, sql: Binding['sql']): Binding => ({
  family: 'functions_boolean',
  signature,
  minimum: 2,
  maximum: 2,
  accepts: sameType('bool'),
  output: 'bool',
  sql,
});
const nullTest = (signature: string, negated: boolean): Binding => ({
  family: 'functions_comparison',
  signature,
  minimum: 1,
  maximum: 1,
  accepts: comparable,
  output: 'bool',
  required: true,
  sql: (args) => pgNullTest(args[0]!, negated),
});
export const scalarBindings: Readonly<Record<string, Binding>> = {
  ...Object.fromEntries(
    ['add', 'subtract', 'multiply'].flatMap((name) =>
      ['i64', 'fp64'].map((type) => [
        `${name}:${type}_${type}`,
        {
          family: 'functions_arithmetic',
          signature: `${name}:${type}_${type}`,
          minimum: 2,
          maximum: 2,
          accepts: sameType(type as 'i64' | 'fp64'),
          output: type as 'i64' | 'fp64',
          sql: (args: readonly PostgresAstNode[]) => {
            const operands = args.map((arg) => ({
              TypeCast: {
                arg,
                typeName: { names: [pgString(type === 'i64' ? 'bigint' : 'float8')], typemod: -1 },
              },
            }));
            return {
              A_Expr: {
                kind: 'AEXPR_OP',
                name: [pgString(name === 'add' ? '+' : name === 'subtract' ? '-' : '*')],
                lexpr: operands[0],
                rexpr: operands[1],
              },
            };
          },
        },
      ])
    )
  ),
  'divide:i64_i64': {
    family: 'functions_arithmetic',
    signature: 'divide:i64_i64',
    minimum: 2,
    maximum: 2,
    accepts: sameType('i64'),
    output: 'i64',
    sql: (args) => ({
      A_Expr: {
        kind: 'AEXPR_OP',
        name: [pgString('/')],
        lexpr: {
          TypeCast: {
            arg: args[0],
            typeName: { names: [pgString('bigint')], typemod: -1 },
          },
        },
        rexpr: {
          TypeCast: {
            arg: args[1],
            typeName: { names: [pgString('bigint')], typemod: -1 },
          },
        },
      },
    }),
  },
  upper: unary('upper'),
  lower: unary('lower'),
  trim: unary('trim', 'btrim'),
  concat: {
    family: 'functions_string',
    signature: 'concat:str',
    minimum: 2,
    maximum: 2,
    accepts: sameType('string'),
    output: 'string',
    // Substrait ACCEPT_NULLS propagates null; PostgreSQL concat() does not.
    sql: (args) => ({
      A_Expr: { kind: 'AEXPR_OP', name: [pgString('||')], lexpr: args[0], rexpr: args[1] },
    }),
  },
  coalesce: {
    family: 'functions_comparison',
    signature: 'coalesce:any1',
    minimum: 2,
    accepts: (types) => comparable(types) && types[0]?.kind.case !== 'precisionTimestampTz',
    output: 'operand',
    sql: (args) => ({ CoalesceExpr: { args } }),
  },
  concat_ws: {
    family: 'functions_string',
    signature: 'concat_ws:str_str',
    minimum: 2,
    accepts: sameType('string'),
    output: 'string',
    // Pinned Substrait concat_ws.test: skip NULL values, but NULL separator returns NULL.
    sql: (args) => call('concat_ws', args),
  },
  extract: {
    family: 'functions_datetime',
    signature: 'extract:req_ptstz_str',
    minimum: 2,
    maximum: 2,
    accepts: (types) =>
      types[0]?.kind.case === 'precisionTimestampTz' && types[1]?.kind.case === 'string',
    arguments: utcYear,
    output: 'i64',
    sql: (args) => ({
      TypeCast: {
        arg: call('date_part', [pgStringLiteral('year'), call('timezone', [args[1]!, args[0]!])]),
        typeName: { names: [pgString('bigint')], typemod: -1 },
      },
    }),
  },
  equal: compare('equal', '='),
  not_equal: compare('not_equal', '<>'),
  gt: compare('gt', '>'),
  gte: compare('gte', '>='),
  lt: compare('lt', '<'),
  lte: compare('lte', '<='),
  and: boolean('and', pgAnd),
  or: boolean('or', pgOr),
  is_null: nullTest('is_null', false),
  is_not_null: nullTest('is_not_null', true),
};

/** Canonical result type shared by authoring admission and executable lowering. */
export function scalarResultType(binding: Binding, types: readonly Type[]): Type {
  const nullability = binding.required ? Type_Nullability.REQUIRED : Type_Nullability.NULLABLE;
  const type =
    binding.output === 'operand'
      ? clone(TypeSchema, types[0]!)
      : create(TypeSchema, { kind: { case: binding.output, value: { nullability } } });
  if (type.kind.value != null && 'nullability' in type.kind.value)
    type.kind.value.nullability = nullability;
  return type;
}
