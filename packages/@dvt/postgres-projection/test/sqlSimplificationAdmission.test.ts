import { describe, expect, it } from 'vitest';

import {
  pgColumnRef,
  pgQualifiedColumnRef,
  pgRangeSubselect,
  pgRangeVar,
  pgStringLiteral,
  type PostgresAstNode,
} from '../src/postgresAst.js';
import { pgComparison } from '../src/postgresPredicateAst.js';
import { rewritePostgresSqlOnce, simplifyPostgresSqlAst } from '../src/sqlPresentation/simplify.js';

import {
  clientSql,
  joinedSql,
  nestedSql,
  sqlBody,
  sqlResolution,
  sqlSelect,
  sqlWith,
} from './sqlSimplificationFixture.js';

function retained(ast: PostgresAstNode, options = sqlResolution): void {
  const before = globalThis.structuredClone(ast);
  const result = simplifyPostgresSqlAst(ast, options);
  expect(result.ast).toBe(ast);
  expect(result.steps).toEqual([]);
  expect(result.retained).toEqual(
    expect.objectContaining({ code: expect.any(String), path: expect.any(String) })
  );
  expect(ast).toEqual(before);
}

describe('SQLREAD complete admission and lexical resolution', () => {
  it('requires source evidence instead of guessing scalar columns from syntax', () => {
    const ast = nestedSql();
    expect(simplifyPostgresSqlAst(ast).ast).toBe(ast);
    expect(simplifyPostgresSqlAst(ast).retained?.code).toBe('missing_resolution');
    expect(simplifyPostgresSqlAst(ast, { resolvedColumns: [] }).ast).toBe(ast);
  });

  it('rejects duplicate source and column evidence', () => {
    const ast = nestedSql();
    expect(
      simplifyPostgresSqlAst(ast, {
        ...sqlResolution,
        resolvedColumns: [...sqlResolution.resolvedColumns, sqlResolution.resolvedColumns[0]],
      }).retained?.code
    ).toBe('invalid_resolution');
    expect(
      simplifyPostgresSqlAst(ast, {
        resolvedColumns: [{ schema: 'raw', table: 'client', columns: ['client_id', 'client_id'] }],
      }).retained?.code
    ).toBe('invalid_resolution');
  });

  it('does not prune an invalid unused projection into validity', () => {
    const invalid = sqlSelect(
      [
        { name: 'id', from: 'c', column: 'client_id' },
        { name: 'unused', from: 'c', column: 'does_not_exist' },
      ],
      [pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' })]
    );
    retained(
      sqlSelect([{ name: 'id', from: 'q', column: 'id' }], [pgRangeSubselect(invalid, 'q')])
    );
  });

  it('resolves reused alias spelling in nested scopes rather than rejecting it', () => {
    const ast = sqlSelect(
      [{ name: 'id', from: 'i0', column: 'id' }],
      [pgRangeSubselect(clientSql('i0'), 'i0')]
    );
    const result = rewritePostgresSqlOnce(ast, sqlResolution);
    expect(result.steps[0]?.rule).toBe('SQLREAD1.PROJECTION_FUSION');
    expect(sqlBody(result.ast)['targetList']).toEqual([
      { ResTarget: { name: 'id', val: pgQualifiedColumnRef('i0', 'client_id') } },
    ]);
  });

  it('resolves unqualified fields only when exactly one input exposes them', () => {
    const ast = sqlSelect(
      [{ column: 'client_id' }],
      [pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' })]
    );
    expect(simplifyPostgresSqlAst(ast, sqlResolution).retained).toBeUndefined();
    retained(
      sqlSelect(
        [{ column: 'client_id' }],
        [
          pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' }),
          pgRangeVar({ schema: 'raw', table: 'orders', alias: 'o' }),
        ]
      )
    );
  });

  it('refuses whole-row and unknown scalar references', () => {
    for (const column of ['c', 'missing']) {
      retained(
        sqlSelect(
          [{ name: 'row', column }],
          [pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' })]
        )
      );
    }
  });

  it('does not let JOIN ON read a separate FROM sibling', () => {
    const ast = sqlSelect(
      [{ name: 'id', from: 'c', column: 'client_id' }],
      [
        pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' }),
        {
          JoinExpr: {
            jointype: 'JOIN_INNER',
            larg: pgRangeVar({ schema: 'raw', table: 'orders', alias: 'o' }),
            rarg: pgRangeVar({ schema: 'raw', table: 'items', alias: 'i' }),
            quals: pgComparison(
              '=',
              pgQualifiedColumnRef('c', 'client_id'),
              pgQualifiedColumnRef('o', 'client_id')
            ),
          },
        },
      ]
    );
    retained(ast);
  });

  it('retains correlated subqueries and duplicate input aliases', () => {
    const correlated = sqlWith(clientSql(), {
      whereClause: pgComparison(
        '=',
        pgQualifiedColumnRef('outside', 'id'),
        pgQualifiedColumnRef('c', 'client_id')
      ),
    });
    retained(
      sqlSelect([{ name: 'id', from: 'q', column: 'id' }], [pgRangeSubselect(correlated, 'q')])
    );
    retained(
      sqlSelect(
        [{ name: 'id', from: 'c', column: 'client_id' }],
        [
          pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' }),
          pgRangeVar({ schema: 'raw', table: 'orders', alias: 'c' }),
        ]
      )
    );
  });

  it.each([
    ['DISTINCT', { distinctClause: [{}] }],
    ['ORDER', { sortClause: [{}] }],
    ['LIMIT', { limitCount: { A_Const: { ival: { ival: 1 } } } }],
    ['OFFSET', { limitOffset: { A_Const: { ival: { ival: 1 } } } }],
    ['GROUP', { groupClause: [pgColumnRef('id')] }],
    ['HAVING', { havingClause: {} }],
    ['WINDOW', { windowClause: [{}] }],
    ['CTE', { withClause: {} }],
    ['SET', { op: 'SETOP_UNION' }],
    ['unknown field', { unexpected: true }],
  ])('retains the entire %s candidate before changing a safe child', (_name, clauses) => {
    retained(sqlWith(nestedSql(), clauses));
  });

  it('retains all OUTER join candidates before any child fusion', () => {
    for (const jointype of ['JOIN_LEFT', 'JOIN_RIGHT', 'JOIN_FULL']) {
      const ast = joinedSql();
      const from = sqlBody(ast)['fromClause'] as Record<string, unknown>[];
      (from[0]!['JoinExpr'] as Record<string, unknown>)['jointype'] = jointype;
      retained(ast);
    }
  });

  it('requires native scalar semantics and rejects custom operators', () => {
    const ast = sqlWith(nestedSql(), {
      whereClause: pgComparison(
        '<>',
        pgQualifiedColumnRef('result', 'c1'),
        pgStringLiteral('C-001')
      ),
    });
    expect(
      simplifyPostgresSqlAst(ast, { resolvedColumns: sqlResolution.resolvedColumns }).ast
    ).toBe(ast);
    const custom = sqlWith(nestedSql(), {
      whereClause: {
        A_Expr: {
          kind: 'AEXPR_OP',
          name: [{ String: { sval: 'custom' } }, { String: { sval: '=' } }],
          lexpr: pgQualifiedColumnRef('result', 'c1'),
          rexpr: pgStringLiteral('C-001'),
        },
      },
    });
    retained(custom);
  });

  it.each([
    { FuncCall: { funcname: [{ String: { sval: 'random' } }] } },
    {
      TypeCast: {
        arg: pgQualifiedColumnRef('c', 'country'),
        typeName: { names: [{ String: { sval: 'int8' } }] },
      },
    },
  ])('retains calculated outputs and per-row casts', (val) => {
    retained({
      SelectStmt: { ...sqlBody(clientSql()), targetList: [{ ResTarget: { name: 'id', val } }] },
    });
  });

  it('bounds cyclic syntax instead of recursing indefinitely', () => {
    const ast: Record<string, unknown> = {};
    ast['SelectStmt'] = {
      targetList: [{ ResTarget: { name: 'id', val: pgQualifiedColumnRef('q', 'id') } }],
      fromClause: [pgRangeSubselect(ast, 'q')],
    };
    const result = simplifyPostgresSqlAst(ast, sqlResolution);
    expect(result.ast).toBe(ast);
    expect(result.retained).toBeDefined();
  });
});
