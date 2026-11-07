import {
  pgColumnRef,
  pgQualifiedColumnRef,
  pgRangeSubselect,
  pgRangeVar,
  type PostgresAstNode,
} from '../src/postgresAst.js';
import { pgComparison } from '../src/postgresPredicateAst.js';

export const sqlResolution = {
  resolvedColumns: [
    { schema: 'raw', table: 'client', columns: ['client_id', 'country'] },
    { schema: 'raw', table: 'orders', columns: ['order_id', 'client_id', 'amount'] },
    { schema: 'raw', table: 'items', columns: ['value'] },
  ],
  scalarSemantics: 'pg_catalog',
} as const;

export function sqlSelect(
  columns: readonly Readonly<{ name?: string; from?: string; column: string }>[],
  fromClause: readonly PostgresAstNode[],
  clauses: PostgresAstNode = {}
): PostgresAstNode {
  return {
    SelectStmt: {
      targetList: columns.map(({ name, from, column }) => ({
        ResTarget: {
          ...(name === undefined ? {} : { name }),
          val: from === undefined ? pgColumnRef(column) : pgQualifiedColumnRef(from, column),
        },
      })),
      fromClause,
      op: 'SETOP_NONE',
      limitOption: 'LIMIT_OPTION_DEFAULT',
      ...clauses,
    },
  };
}

export function sqlBody(ast: PostgresAstNode): Record<string, unknown> {
  return ast['SelectStmt'] as Record<string, unknown>;
}

export function sqlWith(ast: PostgresAstNode, clauses: PostgresAstNode): PostgresAstNode {
  return { SelectStmt: { ...sqlBody(ast), ...clauses } };
}

export function clientSql(alias = 'c'): PostgresAstNode {
  return sqlSelect(
    [
      { name: 'id', from: alias, column: 'client_id' },
      { name: 'country', from: alias, column: 'country' },
    ],
    [pgRangeVar({ schema: 'raw', table: 'client', alias })]
  );
}

export function nestedSql(): PostgresAstNode {
  const middle = sqlSelect(
    [
      { name: 'c0', from: 'i0', column: 'country' },
      { name: 'c1', from: 'i0', column: 'id' },
    ],
    [pgRangeSubselect(clientSql(), 'i0')]
  );
  return sqlSelect(
    [
      { name: 'country', from: 'result', column: 'c0' },
      { name: 'client_id 2', from: 'result', column: 'c1' },
    ],
    [pgRangeSubselect(middle, 'result')]
  );
}

export function joinedSql(
  options: { where?: PostgresAstNode; allOutputs?: boolean } = {}
): PostgresAstNode {
  const orders = sqlSelect(
    [
      { name: 'oid', from: 'o', column: 'order_id' },
      { name: 'cid', from: 'o', column: 'client_id' },
      { name: 'amount', from: 'o', column: 'amount' },
    ],
    [pgRangeVar({ schema: 'raw', table: 'orders', alias: 'o' })]
  );
  return sqlSelect(
    [
      { name: 'order_id', from: 'r', column: 'oid' },
      { name: 'client_id', from: 'q', column: 'id' },
      ...(options.allOutputs
        ? [
            { name: 'country', from: 'q', column: 'country' },
            { name: 'amount', from: 'r', column: 'amount' },
          ]
        : []),
    ],
    [
      {
        JoinExpr: {
          jointype: 'JOIN_INNER',
          larg: pgRangeSubselect(clientSql(), 'q'),
          rarg: pgRangeSubselect(orders, 'r'),
          quals: pgComparison(
            '=',
            pgQualifiedColumnRef('q', 'id'),
            pgQualifiedColumnRef('r', 'cid')
          ),
        },
      },
    ],
    options.where === undefined ? {} : { whereClause: options.where }
  );
}
