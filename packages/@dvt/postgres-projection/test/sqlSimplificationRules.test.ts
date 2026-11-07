import { describe, expect, it } from 'vitest';

import {
  pgQualifiedColumnRef,
  pgRangeSubselect,
  pgRangeVar,
  pgStringLiteral,
  type PostgresAstNode,
} from '../src/postgresAst.js';
import { pgAnd, pgComparison, pgNullTest, pgOr } from '../src/postgresPredicateAst.js';
import { projectSubstraitToPostgresAst } from '../src/relationalSql/project.js';
import { renderPostgresAst } from '../src/renderPostgresAst.js';
import { rewritePostgresSqlOnce, simplifyPostgresSqlAst } from '../src/sqlPresentation/simplify.js';

import { compositionalFixture } from './relationalSqlFixture.js';
import {
  clientSql,
  joinedSql,
  nestedSql,
  sqlBody,
  sqlResolution,
  sqlSelect,
} from './sqlSimplificationFixture.js';

function joinBody(ast: PostgresAstNode): Record<string, unknown> {
  return (sqlBody(ast)['fromClause'] as PostgresAstNode[])[0]!['JoinExpr'] as Record<
    string,
    unknown
  >;
}

describe('SQLREAD ordered immutable rules', () => {
  it.each([
    { A_Const: { boolval: {} } },
    {
      A_Expr: {
        kind: 'AEXPR_OP',
        name: [{ String: { sval: '>' } }],
        lexpr: pgQualifiedColumnRef('result', 'c1'),
        rexpr: { A_Const: { ival: {} } },
      },
    },
  ])('admits omitted protobuf literal defaults without inventing expressions', (where) => {
    const ast = { SelectStmt: { ...sqlBody(nestedSql()), whereClause: where } };
    const result = simplifyPostgresSqlAst(ast, sqlResolution);
    expect(result.retained).toBeUndefined();
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('fuses a single projection per step and retains public output names', () => {
    const ast = nestedSql();
    const before = globalThis.structuredClone(ast);
    const once = rewritePostgresSqlOnce(ast, sqlResolution);
    expect(once.steps).toHaveLength(1);
    expect(once.steps[0]?.rule).toBe('SQLREAD1.PROJECTION_FUSION');
    const all = simplifyPostgresSqlAst(ast, sqlResolution);
    expect(all.steps).toHaveLength(2);
    expect(sqlBody(all.ast)['targetList']).toEqual([
      { ResTarget: { name: 'country', val: pgQualifiedColumnRef('c', 'country') } },
      { ResTarget: { name: 'client_id 2', val: pgQualifiedColumnRef('c', 'client_id') } },
    ]);
    expect(ast).toEqual(before);
    expect(simplifyPostgresSqlAst(all.ast, sqlResolution).steps).toEqual([]);
    expect(simplifyPostgresSqlAst(ast, sqlResolution)).toEqual(all);
  });

  it('pushes one AND term into one owning input, preserving the other term', () => {
    const first = pgComparison('<>', pgQualifiedColumnRef('q', 'id'), pgStringLiteral('C-001'));
    const second = pgNullTest(pgQualifiedColumnRef('r', 'oid'), true);
    const result = rewritePostgresSqlOnce(
      joinedSql({ where: pgAnd([first, second]) }),
      sqlResolution
    );
    expect(result.steps[0]?.rule).toBe('SQLREAD1.PREDICATE_PUSHDOWN');
    expect(sqlBody(result.ast)['whereClause']).toEqual(second);
    const left = joinBody(result.ast)['larg'] as PostgresAstNode;
    const subquery = (left['RangeSubselect'] as Record<string, unknown>)[
      'subquery'
    ] as PostgresAstNode;
    expect(sqlBody(subquery)['whereClause']).toEqual(
      pgComparison('<>', pgQualifiedColumnRef('c', 'client_id'), pgStringLiteral('C-001'))
    );
  });

  it('does not distribute a mixed-input OR predicate', () => {
    const where = pgOr([
      pgComparison('=', pgQualifiedColumnRef('q', 'id'), pgStringLiteral('C-001')),
      pgComparison('=', pgQualifiedColumnRef('r', 'oid'), pgStringLiteral('O-001')),
    ]);
    const result = rewritePostgresSqlOnce(joinedSql({ where }), sqlResolution);
    expect(result.steps[0]?.rule).not.toBe('SQLREAD1.PREDICATE_PUSHDOWN');
    expect(sqlBody(result.ast)['whereClause']).toEqual(where);
  });

  it('can move a whole single-input OR without splitting its branches', () => {
    const where = pgOr([
      pgComparison('=', pgQualifiedColumnRef('q', 'id'), pgStringLiteral('C-001')),
      pgNullTest(pgQualifiedColumnRef('q', 'id'), false),
    ]);
    const result = rewritePostgresSqlOnce(joinedSql({ where }), sqlResolution);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.rule).toBe('SQLREAD1.PREDICATE_PUSHDOWN');
    const left = joinBody(result.ast)['larg'] as PostgresAstNode;
    const subquery = (left['RangeSubselect'] as Record<string, unknown>)[
      'subquery'
    ] as PostgresAstNode;
    expect((sqlBody(subquery)['whereClause'] as PostgresAstNode)['BoolExpr']).toEqual(
      expect.objectContaining({ boolop: 'OR_EXPR' })
    );
  });

  it('prunes one input output list using SELECT and JOIN ON needs', () => {
    const result = rewritePostgresSqlOnce(joinedSql(), sqlResolution);
    expect(result.steps[0]?.rule).toBe('SQLREAD1.COLUMN_PRUNING');
    const left = joinBody(result.ast)['larg'] as PostgresAstNode;
    const subquery = (left['RangeSubselect'] as Record<string, unknown>)[
      'subquery'
    ] as PostgresAstNode;
    expect(sqlBody(subquery)['targetList']).toEqual([
      { ResTarget: { name: 'id', val: pgQualifiedColumnRef('c', 'client_id') } },
    ]);
  });

  it('retains an unreferenced CROSS input and its row multiplicity', async () => {
    const ast = sqlSelect(
      [{ name: 'id', from: 'q', column: 'id' }],
      [
        {
          JoinExpr: {
            jointype: 'JOIN_INNER',
            larg: pgRangeSubselect(clientSql(), 'q'),
            rarg: pgRangeSubselect(clientSql('c2'), 'r'),
          },
        },
      ]
    );
    const result = simplifyPostgresSqlAst(ast, sqlResolution);
    expect(result.steps.some((step) => step.rule === 'SQLREAD1.COLUMN_PRUNING')).toBe(true);
    expect(joinBody(result.ast)['rarg']).toEqual({
      RangeVar: expect.objectContaining({ relname: 'client' }),
    });
    expect((await renderPostgresAst(result.ast)).match(/client/g)?.length).toBeGreaterThanOrEqual(
      2
    );
  });

  it('unwraps a base projection and rebinds renamed output fields', () => {
    const result = rewritePostgresSqlOnce(joinedSql({ allOutputs: true }), sqlResolution);
    expect(result.steps[0]?.rule).toBe('SQLREAD1.TRANSPARENT_SUBQUERY');
    expect(joinBody(result.ast)['larg']).toEqual({
      RangeVar: expect.objectContaining({ relname: 'client', alias: { aliasname: 'q' } }),
    });
    expect((sqlBody(result.ast)['targetList'] as PostgresAstNode[])[1]).toEqual({
      ResTarget: { name: 'client_id', val: pgQualifiedColumnRef('q', 'client_id') },
    });
  });

  it('qualifies unaffected unqualified references when unwrapping exposes extra columns', () => {
    const child = sqlSelect(
      [{ name: 'country', from: 'c', column: 'country' }],
      [pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' })]
    );
    const ast = sqlSelect(
      [{ column: 'client_id' }],
      [
        {
          JoinExpr: {
            jointype: 'JOIN_INNER',
            larg: pgRangeSubselect(child, 'q'),
            rarg: pgRangeVar({ schema: 'raw', table: 'orders', alias: 'o' }),
            quals: pgComparison(
              '=',
              pgQualifiedColumnRef('q', 'country'),
              pgQualifiedColumnRef('o', 'order_id')
            ),
          },
        },
      ]
    );
    const result = rewritePostgresSqlOnce(ast, sqlResolution);
    expect(result.steps[0]?.rule).toBe('SQLREAD1.TRANSPARENT_SUBQUERY');
    expect(sqlBody(result.ast)['targetList']).toEqual([
      { ResTarget: { name: 'client_id', val: pgQualifiedColumnRef('o', 'client_id') } },
    ]);
  });

  it('simplifies the real canonical Substrait AST without mutating its identities', async () => {
    const document = compositionalFixture('join');
    const before = globalThis.structuredClone(document);
    const projected = projectSubstraitToPostgresAst(document);
    const result = simplifyPostgresSqlAst(projected.ast, sqlResolution);
    expect(result.retained).toBeUndefined();
    expect(result.steps.length).toBeGreaterThan(0);
    expect((await renderPostgresAst(result.ast)).match(/SELECT/gi)).toHaveLength(1);
    expect(document).toEqual(before);
    expect(simplifyPostgresSqlAst(result.ast, sqlResolution).steps).toEqual([]);
  });

  it.each([0, -1, 1.5, Infinity, 10001])('rejects invalid maximum step budget %s', (maxSteps) => {
    expect(() => simplifyPostgresSqlAst(nestedSql(), { ...sqlResolution, maxSteps })).toThrow(
      RangeError
    );
  });

  it('never calls a truncated rewrite sequence a fixed point', () => {
    expect(() => simplifyPostgresSqlAst(nestedSql(), { ...sqlResolution, maxSteps: 1 })).toThrow(
      /maxSteps/
    );
    expect(
      simplifyPostgresSqlAst(nestedSql(), { ...sqlResolution, maxSteps: 2 }).steps
    ).toHaveLength(2);
  });
});
