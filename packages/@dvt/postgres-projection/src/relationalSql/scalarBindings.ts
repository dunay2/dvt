/** Executable target bindings, independent of the surrounding relation shape. */
import { pgString, pgStringLiteral, type PostgresAstNode } from '../postgresAst.js';
import { pgAnd, pgOr, pgComparison, pgNullTest } from '../postgresPredicateAst.js';

import { comparable, sameType, utcYear, type ScalarArgumentGuard } from './scalarArguments.js';

type Binding = Readonly<{
  family: string;
  signature: string;
  minimum: number;
  maximum?: number;
  accepts: ScalarArgumentGuard;
  output: 'string' | 'bool' | 'i64';
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
    accepts: sameType('string'),
    output: 'string',
    sql: (args) => ({ CoalesceExpr: { args } }),
  },
  extract: {
    family: 'functions_datetime',
    signature: 'extract:req_ptstz_str',
    minimum: 2,
    maximum: 2,
    accepts: utcYear,
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
