/** Owns PostgreSQL predicate and typed-literal AST construction. */
import { pgString, type PostgresAstNode } from './postgresAst.js';

export type PostgresComparisonOperator = '=' | '<>' | '>' | '>=' | '<' | '<=';

export function pgAnd(expressions: readonly PostgresAstNode[]): PostgresAstNode {
  if (expressions.length < 2) throw new Error('PostgreSQL AND requires at least two expressions.');
  return { BoolExpr: { boolop: 'AND_EXPR', args: [...expressions], location: -1 } };
}

export function pgOr(expressions: readonly PostgresAstNode[]): PostgresAstNode {
  if (expressions.length < 2) throw new Error('PostgreSQL OR requires at least two expressions.');
  return { BoolExpr: { boolop: 'OR_EXPR', args: [...expressions], location: -1 } };
}

export function pgComparison(
  operator: PostgresComparisonOperator,
  left: PostgresAstNode,
  right: PostgresAstNode
): PostgresAstNode {
  return {
    A_Expr: {
      kind: 'AEXPR_OP',
      name: [pgString(operator)],
      lexpr: left,
      rexpr: right,
      location: -1,
    },
  };
}

export function pgNullTest(operand: PostgresAstNode, negated: boolean): PostgresAstNode {
  return {
    NullTest: {
      arg: operand,
      nulltesttype: negated ? 'IS_NOT_NULL' : 'IS_NULL',
      argisrow: false,
      location: -1,
    },
  };
}

export function pgBooleanLiteral(value: boolean): PostgresAstNode {
  return { A_Const: { boolval: { boolval: value } } };
}

export function pgI64Literal(value: bigint): PostgresAstNode {
  return { A_Const: { ival: { ival: value } } };
}

export function pgFp64Literal(value: number): PostgresAstNode {
  return { A_Const: { fval: { fval: String(value) } } };
}
