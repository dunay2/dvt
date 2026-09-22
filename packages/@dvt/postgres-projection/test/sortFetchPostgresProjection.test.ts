import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import { pgColumnRef, pgRangeVar, type PostgresAstNode } from '../src/postgresAst.js';
import { renderPostgresAst } from '../src/renderPostgresAst.js';
import {
  buildDvtSortFetchPostgresAst,
  postgresSortDirection,
} from '../src/sortFetchPostgresProjection.js';

const baseAst: PostgresAstNode = {
  SelectStmt: {
    targetList: [
      { ResTarget: { val: pgColumnRef('id') } },
      { ResTarget: { val: pgColumnRef('amount') } },
    ],
    fromClause: [pgRangeVar({ schema: 'raw', table: 'orders' })],
    limitOption: 'LIMIT_OPTION_DEFAULT',
    op: 'SETOP_NONE',
  },
};

const columns = [
  { fieldId: 'id-field', name: 'id' },
  { fieldId: 'amount-field', name: 'amount' },
];

describe('SortRel/FetchRel PostgreSQL AST projection', () => {
  it('renders explicit key priority, direction, and NULL placement', async () => {
    const projected = buildDvtSortFetchPostgresAst({
      inputAst: baseAst,
      inputColumns: columns,
      operation: {
        ok: true,
        operation: 'sort',
        relationId: 'sort',
        inputRelationId: 'input',
        outputFields: [],
        keys: [
          { fieldId: 'amount-field', direction: SortField_SortDirection.DESC_NULLS_LAST },
          { fieldId: 'id-field', direction: SortField_SortDirection.ASC_NULLS_FIRST },
        ],
      },
    });
    await expect(renderPostgresAst(projected.ast)).resolves.toMatch(
      /ORDER BY\s+amount DESC NULLS LAST,\s+id ASC NULLS FIRST/
    );
    expect(projected.orderBy).toEqual([
      { name: 'amount', direction: 'DESC', nulls: 'LAST' },
      { name: 'id', direction: 'ASC', nulls: 'FIRST' },
    ]);
  });

  it('renders exact bigint OFFSET/LIMIT and preserves inherited order', async () => {
    const projected = buildDvtSortFetchPostgresAst({
      inputAst: baseAst,
      inputColumns: columns,
      inheritedOrderBy: [{ name: 'id', direction: 'ASC', nulls: 'LAST' }],
      operation: {
        ok: true,
        operation: 'fetch',
        relationId: 'fetch',
        inputRelationId: 'input',
        outputFields: [],
        offset: 9_007_199_254_740_993n,
        count: 9_223_372_036_854_775_807n,
      },
    });
    const sql = await renderPostgresAst(projected.ast);
    expect(sql).toContain('LIMIT 9223372036854775807');
    expect(sql).toContain('OFFSET 9007199254740993');
    expect(sql).toMatch(/ORDER BY\s+id ASC NULLS LAST/);
    expect(projected.orderBy).toEqual([{ name: 'id', direction: 'ASC', nulls: 'LAST' }]);
  });

  it('maps all four admitted directions and rejects other enum values', () => {
    expect(postgresSortDirection(SortField_SortDirection.ASC_NULLS_FIRST)).toEqual({
      direction: 'ASC',
      nulls: 'FIRST',
    });
    expect(postgresSortDirection(SortField_SortDirection.ASC_NULLS_LAST)).toEqual({
      direction: 'ASC',
      nulls: 'LAST',
    });
    expect(postgresSortDirection(SortField_SortDirection.DESC_NULLS_FIRST)).toEqual({
      direction: 'DESC',
      nulls: 'FIRST',
    });
    expect(postgresSortDirection(SortField_SortDirection.DESC_NULLS_LAST)).toEqual({
      direction: 'DESC',
      nulls: 'LAST',
    });
    expect(() => postgresSortDirection(SortField_SortDirection.CLUSTERED as never)).toThrow();
  });

  it('keeps Fetch(Sort(R)) distinct from Sort(Fetch(R)) and preserves count zero', async () => {
    const sort = {
      ok: true as const,
      operation: 'sort' as const,
      relationId: 'sort',
      inputRelationId: 'input',
      outputFields: [],
      keys: [{ fieldId: 'amount-field', direction: SortField_SortDirection.DESC_NULLS_LAST }],
    };
    const fetch = {
      ok: true as const,
      operation: 'fetch' as const,
      relationId: 'fetch',
      inputRelationId: 'input',
      outputFields: [],
      offset: null,
      count: 0n,
    };
    const sorted = buildDvtSortFetchPostgresAst({
      inputAst: baseAst,
      inputColumns: columns,
      operation: sort,
    });
    const fetchAfterSort = buildDvtSortFetchPostgresAst({
      inputAst: sorted.ast,
      inputColumns: columns,
      inheritedOrderBy: sorted.orderBy,
      operation: fetch,
    });
    const fetched = buildDvtSortFetchPostgresAst({
      inputAst: baseAst,
      inputColumns: columns,
      operation: fetch,
    });
    const sortAfterFetch = buildDvtSortFetchPostgresAst({
      inputAst: fetched.ast,
      inputColumns: columns,
      operation: sort,
    });

    const first = await renderPostgresAst(fetchAfterSort.ast);
    const second = await renderPostgresAst(sortAfterFetch.ast);
    expect(first).not.toBe(second);
    expect(first).toMatch(/ORDER BY[\s\S]+LIMIT 0/);
    expect(second).toMatch(/LIMIT 0[\s\S]+ORDER BY/);
  });
});
