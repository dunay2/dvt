import { describe, expect, it } from 'vitest';

import {
  pgColumnRef,
  pgQualifiedColumnRef,
  pgRangeSubselect,
  pgRangeVar,
} from '../src/postgresAst.js';
import { projectSubstraitToPostgresAst } from '../src/relationalSql/project.js';
import {
  fusePostgresProjectionOnce,
  fusePostgresProjections,
  renderFusedPostgresProjections,
} from '../src/relationalSql/projectionFusion.js';

import { compositionalFixture } from './relationalSqlFixture.js';

const select = (
  targets: readonly { name: string; from: string; column: string }[],
  from: readonly Record<string, unknown>[],
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  SelectStmt: {
    targetList: targets.map(({ name, from: alias, column }) => ({
      ResTarget: { name, val: pgQualifiedColumnRef(alias, column) },
    })),
    fromClause: from,
    op: 'SETOP_NONE',
    limitOption: 'LIMIT_OPTION_DEFAULT',
    ...extra,
  },
});

const source = select(
  [
    { name: 'c0', from: 'c', column: 'client_id' },
    { name: 'c1', from: 'c', column: 'country' },
  ],
  [pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' })]
);
const project = select(
  [
    { name: 'c0', from: 'i0', column: 'c1' },
    { name: 'c1', from: 'i0', column: 'c0' },
  ],
  [pgRangeSubselect(source, 'i0')]
);
const root = select(
  [
    { name: 'country', from: 'result', column: 'c0' },
    { name: 'client_id 2', from: 'result', column: 'c1' },
  ],
  [pgRangeSubselect(project, 'result')]
);

const targetList = (query: Record<string, unknown>): Record<string, unknown>[] =>
  (query.SelectStmt as { targetList: Record<string, unknown>[] }).targetList;

const fromClause = (query: Record<string, unknown>): Record<string, unknown>[] =>
  (query.SelectStmt as { fromClause: Record<string, unknown>[] }).fromClause;

describe('SQLREAD1 projection fusion (PostgreSQL AST)', () => {
  it('fuses one transparent SELECT per step and preserves output aliases/order', () => {
    const original = globalThis.structuredClone(root);
    const first = fusePostgresProjectionOnce(root);
    expect(first.steps).toHaveLength(1);
    expect(first.steps[0]?.rule).toBe('SQLREAD1.PROJECTION_FUSION');
    expect(first.ast).not.toEqual(root);
    expect(root).toEqual(original);
    const final = fusePostgresProjections(root);
    expect(final.steps).toHaveLength(2);
    expect(targetList(final.ast)[0]).toEqual({
      ResTarget: { name: 'country', val: pgQualifiedColumnRef('c', 'country') },
    });
    expect(targetList(final.ast)[1]).toEqual({
      ResTarget: { name: 'client_id 2', val: pgQualifiedColumnRef('c', 'client_id') },
    });
    expect(fromClause(final.ast)).toEqual([
      pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' }),
    ]);
    expect(fusePostgresProjections(final.ast).steps).toHaveLength(0);
  });

  it('retains the INNER JOIN and WHERE when fusion removes a redundant wrapper', () => {
    const left = pgRangeSubselect(source, 'i0');
    const right = pgRangeSubselect(
      select(
        [{ name: 'c0', from: 'o', column: 'order_id' }],
        [pgRangeVar({ schema: 'raw', table: 'orders', alias: 'o' })]
      ),
      'i1'
    );
    const join = {
      JoinExpr: {
        jointype: 'JOIN_INNER',
        larg: left,
        rarg: right,
        quals: {
          A_Expr: {
            lexpr: pgQualifiedColumnRef('i0', 'c0'),
            rexpr: pgQualifiedColumnRef('i1', 'c0'),
          },
        },
      },
    };
    const whereClause = {
      A_Expr: { lexpr: pgQualifiedColumnRef('i0', 'c0'), rexpr: pgColumnRef('ignored') },
    };
    const inner = select(
      [
        { name: 'c0', from: 'i1', column: 'c0' },
        { name: 'c1', from: 'i0', column: 'c0' },
      ],
      [join],
      { whereClause }
    );
    const outer = select(
      [
        { name: 'order_id', from: 'result', column: 'c0' },
        { name: 'client_id 2', from: 'result', column: 'c1' },
      ],
      [pgRangeSubselect(inner, 'result')]
    );
    const result = fusePostgresProjections(outer);
    expect(result.steps).toHaveLength(1);
    const finalSelect = result.ast.SelectStmt as Record<string, unknown>;
    expect(finalSelect.whereClause).toEqual(whereClause);
    expect(finalSelect.fromClause).toEqual([join]);
    expect(targetList(result.ast)[1]).toEqual({
      ResTarget: { name: 'client_id 2', val: pgQualifiedColumnRef('i0', 'c0') },
    });
  });

  it.each([
    ['DISTINCT', { distinctClause: [{}] }],
    ['LIMIT', { limitCount: { A_Const: { ival: { ival: 2 } } } }],
    ['ORDER BY', { sortClause: [{}] }],
    ['GROUP BY', { groupClause: [pgColumnRef('c0')] }],
    ['WINDOW', { windowClause: [{}] }],
    ['OUTER WHERE', { whereClause: {} }],
  ])('does not cross unsafe outer %s', (_name, extra) => {
    const guarded = select(
      [{ name: 'name', from: 'i0', column: 'c0' }],
      [pgRangeSubselect(source, 'i0')],
      extra
    );
    const result = fusePostgresProjectionOnce(guarded);
    expect(result.steps).toHaveLength(0);
    expect(result.ast).toBe(guarded);
  });

  it('rejects alias capture when the inner FROM reuses the outer alias', () => {
    const inner = select(
      [{ name: 'c0', from: 'i0', column: 'client_id' }],
      [pgRangeVar({ schema: 'raw', table: 'client', alias: 'i0' })]
    );
    const outer = select(
      [{ name: 'client_id', from: 'i0', column: 'c0' }],
      [pgRangeSubselect(inner, 'i0')]
    );
    expect(fusePostgresProjectionOnce(outer).steps).toHaveLength(0);
  });

  it.each([
    ['DISTINCT', { distinctClause: [{}] }],
    ['LIMIT', { limitCount: { A_Const: { ival: { ival: 1 } } } }],
    ['ORDER BY', { sortClause: [{}] }],
    ['GROUP BY', { groupClause: [pgColumnRef('client_id')] }],
    ['WINDOW', { windowClause: [{}] }],
  ])('retains an inner %s barrier', (_name, extra) => {
    const inner = { SelectStmt: { ...(source.SelectStmt as Record<string, unknown>), ...extra } };
    const outer = select(
      [{ name: 'id', from: 'result', column: 'c0' }],
      [pgRangeSubselect(inner, 'result')]
    );
    expect(fusePostgresProjections(outer)).toEqual({ ast: outer, steps: [] });
  });

  it('retains ambiguous inner outputs and explicit range alias contracts', () => {
    const ambiguous = select(
      [
        { name: 'c0', from: 'c', column: 'client_id' },
        { name: 'c0', from: 'c', column: 'country' },
      ],
      [pgRangeVar({ schema: 'raw', table: 'client', alias: 'c' })]
    );
    const ranges = [
      pgRangeSubselect(ambiguous, 'result'),
      { RangeSubselect: { subquery: source, alias: { aliasname: 'result' }, lateral: true } },
      {
        RangeSubselect: {
          subquery: source,
          alias: {
            aliasname: 'result',
            colnames: [{ String: { sval: 'renamed' } }],
          },
        },
      },
    ];
    for (const range of ranges) {
      const outer = select([{ name: 'id', from: 'result', column: 'c0' }], [range]);
      const original = globalThis.structuredClone(outer);
      expect(fusePostgresProjections(outer)).toEqual({ ast: outer, steps: [] });
      expect(outer).toEqual(original);
    }
  });

  it('does not fuse when an inner output is a calculated expression', () => {
    const computed = globalThis.structuredClone(source);
    const output = targetList(computed)[0] as { ResTarget: Record<string, unknown> };
    output.ResTarget.val = { FuncCall: { funcname: [{ String: { sval: 'random' } }] } };
    const outer = select(
      [{ name: 'id', from: 'i0', column: 'c0' }],
      [pgRangeSubselect(computed, 'i0')]
    );
    expect(fusePostgresProjections(outer).steps).toHaveLength(0);
  });

  it('rejects invalid budgets and never reports a truncated fixed point', () => {
    expect(() => fusePostgresProjections(root, 0)).toThrow(RangeError);
    expect(() => fusePostgresProjections(root, 1)).toThrow(/maxSteps/);
    expect(fusePostgresProjections(root, 2).steps).toHaveLength(2);
  });

  it('renders a readable SQL derived from the same AST', async () => {
    const result = await renderFusedPostgresProjections(root);
    expect(result.steps).toHaveLength(2);
    expect(result.sql).toContain('SELECT');
    expect(result.sql).toContain('client_id');
    expect(result.sql).toContain('country');
  });

  it('accepts the actual AST projected from canonical DVT Substrait', () => {
    const document = compositionalFixture('join');
    const originalDocument = globalThis.structuredClone(document);
    const ast = projectSubstraitToPostgresAst(document).ast;
    const result = fusePostgresProjections(ast);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(document).toEqual(originalDocument);
    expect(fusePostgresProjections(result.ast).steps).toHaveLength(0);
  });
});
