import { describe, expect, it } from 'vitest';

import {
  pgRangeSubselect,
  pgRangeVar,
  pgQualifiedColumnRef,
  type PostgresAstNode,
} from '../src/postgresAst.js';
import { renderPostgresAst } from '../src/renderPostgresAst.js';
import { simplifyPostgresSqlAst } from '../src/sqlPresentation/simplify.js';

import {
  clientSql,
  nestedSql,
  sqlResolution,
  sqlSelect,
  sqlWith,
} from './sqlSimplificationFixture.js';

/** R2 regressions retained from the former standalone fusion module. */
describe('Projection fusion admission regressions', () => {
  it.each([
    { subquery: clientSql(), alias: { aliasname: 'q' }, lateral: true },
    {
      subquery: clientSql(),
      alias: { aliasname: 'q', colnames: [{ String: { sval: 'renamed' } }] },
    },
  ])('retains explicit range alias/lateral contracts', (range) => {
    const ast = sqlSelect([{ name: 'id', from: 'q', column: 'id' }], [{ RangeSubselect: range }]);
    const result = simplifyPostgresSqlAst(ast, sqlResolution);
    expect(result.ast).toBe(ast);
    expect(result.steps).toEqual([]);
    expect(result.retained).toBeDefined();
  });

  it('retains duplicate inner output names before removing any wrapper', () => {
    const child = sqlSelect(
      [
        { name: 'id', from: 'c', column: 'client_id' },
        { name: 'id', from: 'c', column: 'country' },
      ],
      [pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' })]
    );
    const ast = sqlSelect(
      [{ name: 'id', from: 'q', column: 'id' }],
      [pgRangeSubselect(child, 'q')]
    );
    expect(simplifyPostgresSqlAst(ast, sqlResolution).ast).toBe(ast);
  });

  it('does not accept an incomplete predicate merely because its outer projection is transparent', () => {
    const ast = sqlWith(nestedSql(), {
      whereClause: { A_Expr: { lexpr: pgQualifiedColumnRef('result', 'c1') } },
    });
    expect(simplifyPostgresSqlAst(ast, sqlResolution).retained).toBeDefined();
  });

  it('preserves quoted physical names and labels through the real deparser', async () => {
    const child = sqlSelect(
      [{ name: 'id', from: 'input alias', column: 'Client Id' }],
      [pgRangeVar({ schema: 'raw.schema', table: 'Client Base', alias: 'input alias' })]
    );
    const ast = sqlSelect(
      [{ name: 'Output Id', from: 'q alias', column: 'id' }],
      [pgRangeSubselect(child, 'q alias')]
    );
    const result = simplifyPostgresSqlAst(ast, {
      resolvedColumns: [{ schema: 'raw.schema', table: 'Client Base', columns: ['Client Id'] }],
    });
    expect(result.steps).toHaveLength(1);
    const sql = await renderPostgresAst(result.ast);
    expect(sql).toContain('"raw.schema"."Client Base"');
    expect(sql).toContain('"Output Id"');
  });

  it('binds a shared ColumnRef object independently in each SELECT scope', () => {
    const shared = pgQualifiedColumnRef('c', 'client_id');
    const branch = (table: string): PostgresAstNode => ({
      SelectStmt: {
        targetList: [{ ResTarget: { name: 'id', val: shared } }],
        fromClause: [pgRangeVar({ schema: 'raw', table, alias: 'c' })],
      },
    });
    const ast = sqlSelect(
      [
        { name: 'client', from: 'l', column: 'id' },
        { name: 'order_client', from: 'r', column: 'id' },
      ],
      [
        {
          JoinExpr: {
            jointype: 'JOIN_INNER',
            larg: pgRangeSubselect(branch('client'), 'l'),
            rarg: pgRangeSubselect(branch('orders'), 'r'),
          },
        },
      ]
    );
    const result = simplifyPostgresSqlAst(ast, sqlResolution);
    expect(result.retained).toBeUndefined();
    expect(result.steps).toHaveLength(2);
    expect(result.ast).not.toBe(ast);
  });
});
